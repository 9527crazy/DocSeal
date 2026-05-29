import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { extname, join, parse, resolve } from 'node:path';
import { Repository } from 'typeorm';
import { CreateTemplateDto } from './dto/create-template.dto';
import * as mammoth from 'mammoth';
import {
  TemplateDetailResponseDto,
  TemplateListItemResponseDto,
  TemplateUploadResponseDto,
  TemplateVariableResponseDto,
} from './dto/template-response.dto';
import { TemplateVariable } from './entities/template-variable.entity';
import { Template } from './entities/template.entity';
import { VariableExtractorService } from './services/variable-extractor.service';
import { VariableInferenceService } from './services/variable-inference.service';
import { ExtractedVariable, TemplateFileType } from './types/template-variable.type';

const PDF_MIME_TYPES = ['application/pdf'];
const DOCX_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/octet-stream',
];

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);

  constructor(
    @InjectRepository(Template)
    private readonly templateRepository: Repository<Template>,
    @InjectRepository(TemplateVariable)
    private readonly variableRepository: Repository<TemplateVariable>,
    private readonly configService: ConfigService,
    private readonly variableExtractor: VariableExtractorService,
    private readonly variableInference: VariableInferenceService,
  ) {}

  async create(
    file: Express.Multer.File | undefined,
    dto: CreateTemplateDto,
  ): Promise<TemplateUploadResponseDto> {
    if (!file) {
      throw new BadRequestException({
        error: 'TEMPLATE_FILE_REQUIRED',
        message: '请上传模版文件',
      });
    }

    const fileType = this.validateFile(file);
    const originalName = Buffer.from(file.originalname, "latin1").toString("utf8");
    const uploadDir = this.getUploadDir();
    const relativePath = this.buildRelativePath(originalName);
    const absolutePath = resolve(uploadDir, relativePath);

    await mkdir(resolve(absolutePath, '..'), { recursive: true });

    try {
      await writeFile(absolutePath, file.buffer);
      const variableNames = await this.variableExtractor.extract(file.buffer, fileType);
      const variables = this.buildVariables(variableNames);
      const warnings = variableNames.length === 0 ? ['未识别到变量占位符'] : [];

      let htmlContent: string | undefined;
      if (fileType === 'docx') {
        const result = await mammoth.convertToHtml({ buffer: file.buffer });
        htmlContent = result.value || undefined;
      }

      const template = await this.templateRepository.manager.transaction(async (manager) => {
        const templateEntity = manager.create(Template, {
          name: this.resolveTemplateName(dto.name, originalName),
          originalName: originalName,
          filePath: relativePath,
          fileType,
          category: this.normalizeOptionalText(dto.category),
          htmlContent,
          variables: JSON.stringify(
            variables.map((variable) => ({
              name: variable.name,
              type: variable.type,
              required: variable.required,
              validationRules: variable.validationRules,
              sortOrder: variable.sortOrder,
            })),
          ),
        });

        const savedTemplate = await manager.save(Template, templateEntity);
        if (variables.length > 0) {
          const variableEntities = variables.map((variable) =>
            manager.create(TemplateVariable, {
              templateId: savedTemplate.id,
              name: variable.name,
              type: variable.type,
              required: variable.required ? 1 : 0,
              validationRules: JSON.stringify(variable.validationRules),
              sortOrder: variable.sortOrder,
            }),
          );
          await manager.save(TemplateVariable, variableEntities);
        }

        return savedTemplate;
      });

      return this.findOne(template.id, warnings);
    } catch (error) {
      await this.removeFileQuietly(absolutePath);
      throw error;
    }
  }

  async findAll(): Promise<TemplateListItemResponseDto[]> {
    const templates = await this.templateRepository.find({
      relations: { variableEntities: true },
      order: { createdAt: 'DESC' },
    });

    return templates.map((template) => this.toListItem(template));
  }

  async findOne(id: number, warnings: string[] = []): Promise<TemplateDetailResponseDto> {
    const template = await this.templateRepository.findOne({
      where: { id },
      relations: { variableEntities: true },
      order: { variableEntities: { sortOrder: 'ASC' } },
    });

    if (!template) {
      throw new NotFoundException({
        error: 'TEMPLATE_NOT_FOUND',
        message: '模版不存在',
      });
    }

    return {
      ...this.toListItem(template),
      variables: this.toVariableResponse(template.variableEntities ?? []),
      warnings,
      htmlContent: template.htmlContent ?? undefined,
    };
  }

  async remove(id: number): Promise<{ id: number }> {
    const template = await this.templateRepository.findOne({ where: { id } });

    if (!template) {
      throw new NotFoundException({
        error: 'TEMPLATE_NOT_FOUND',
        message: '模版不存在',
      });
    }

    await this.templateRepository.remove(template);

    const absolutePath = resolve(this.getUploadDir(), template.filePath);
    try {
      await rm(absolutePath, { force: true });
    } catch (error) {
      this.logger.error(`删除模版文件失败: ${absolutePath}`, error);
      throw new InternalServerErrorException({
        error: 'TEMPLATE_DELETE_FAILED',
        message: '模版记录已删除，但文件清理失败',
      });
    }

    return { id };
  }

  private validateFile(file: Express.Multer.File): TemplateFileType {
    const maxSize = this.configService.get<number>('UPLOAD_MAX_SIZE', 10485760);
    if (file.size > maxSize) {
      throw new BadRequestException({
        error: 'TEMPLATE_FILE_TOO_LARGE',
        message: '文件大小不能超过 10MB',
      });
    }

    const extension = extname(file.originalname).toLowerCase();
    const mimeType = file.mimetype;

    if (extension === '.pdf' && PDF_MIME_TYPES.includes(mimeType)) {
      return 'pdf';
    }

    if (extension === '.docx' && DOCX_MIME_TYPES.includes(mimeType)) {
      return 'docx';
    }

    throw new BadRequestException({
      error: 'TEMPLATE_UNSUPPORTED_FILE_TYPE',
      message: '仅支持 PDF 和 Word (.docx) 格式',
    });
  }

  private buildVariables(variableNames: string[]): ExtractedVariable[] {
    return variableNames.map((name, sortOrder) => {
      const type = this.variableInference.inferVariableType(name);
      return {
        name,
        type,
        required: this.variableInference.isRequired(type),
        validationRules: this.variableInference.getDefaultValidation(type),
        sortOrder,
      };
    });
  }

  private buildRelativePath(originalName: string): string {
    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const extension = extname(originalName).toLowerCase();
    return join('templates', year, month, `${randomUUID()}${extension}`);
  }

  private getUploadDir(): string {
    return resolve(this.configService.get<string>('UPLOAD_DIR', './uploads'));
  }

  private resolveTemplateName(name: string | undefined, originalName: string): string {
    const normalizedName = this.normalizeOptionalText(name);
    if (normalizedName) {
      return normalizedName;
    }

    return parse(originalName).name;
  }

  private normalizeOptionalText(value: string | undefined): string | undefined {
    const normalized = value?.trim();
    return normalized ? normalized : undefined;
  }

  private toListItem(template: Template): TemplateListItemResponseDto {
    return {
      id: template.id,
      name: template.name,
      originalName: template.originalName,
      fileType: template.fileType,
      category: template.category || undefined,
      variableCount: template.variableEntities?.length ?? this.parseVariableSnapshot(template.variables).length,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }

  private toVariableResponse(variables: TemplateVariable[]): TemplateVariableResponseDto[] {
    return [...variables]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((variable) => ({
        id: variable.id,
        name: variable.name,
        type: variable.type as TemplateVariableResponseDto['type'],
        required: variable.required === 1,
        validationRules: this.parseValidationRules(variable.validationRules),
        sortOrder: variable.sortOrder,
      }));
  }

  private parseVariableSnapshot(value: string): unknown[] {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private parseValidationRules(value: string | null): Record<string, unknown> | undefined {
    if (!value) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : undefined;
    } catch {
      return undefined;
    }
  }

  private async removeFileQuietly(absolutePath: string): Promise<void> {
    try {
      await rm(absolutePath, { force: true });
    } catch (error) {
      this.logger.warn(`回滚上传文件失败: ${absolutePath}`, error);
    }
  }
}

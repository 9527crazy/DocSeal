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
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, resolve, extname } from 'node:path';
import { Repository } from 'typeorm';

import { Contract } from './entities/contract.entity';
import { CreateContractDto } from './dto/create-contract.dto';
import {
  ContractListItemResponseDto,
  ContractResponseDto,
} from './dto/contract-response.dto';
import { PdfGeneratorService } from './services/pdf-generator.service';
import { WordGeneratorService } from './services/word-generator.service';
import { TemplateService } from '../template/template.service';
import { TemplateListItemResponseDto } from '../template/dto/template-response.dto';

/**
 * Core service for contract generation.
 *
 * Orchestrates the full lifecycle:
 * 1. Validates the template and variables.
 * 2. Creates a contract record with `pending` status.
 * 3. Delegates to the appropriate generator (PDF or Word) based on template type.
 * 4. Persists the generated PDF and updates the contract record.
 * 5. Provides query and download capabilities.
 */
@Injectable()
export class ContractService {
  private readonly logger = new Logger(ContractService.name);

  constructor(
    @InjectRepository(Contract)
    private readonly contractRepository: Repository<Contract>,
    private readonly templateService: TemplateService,
    private readonly pdfGenerator: PdfGeneratorService,
    private readonly wordGenerator: WordGeneratorService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create a new contract, generate the filled document, and return the result.
   */
  async create(dto: CreateContractDto): Promise<ContractResponseDto> {
    // 1. Validate template exists
    const template = await this.templateService.findOne(dto.templateId);
    this.validateVariables(template, dto.variables);

    // 2. Create contract record with pending status
    const contract = this.contractRepository.create({
      templateId: dto.templateId,
      variables: JSON.stringify(dto.variables),
      status: 'pending',
    });
    const saved = await this.contractRepository.save(contract);

    this.logger.log(`合同记录已创建: id=${saved.id}, 模版=${template.name}`);

    // 3. Generate the document
    try {
      await this.contractRepository.update(saved.id, { status: 'generating' });

      const templatePath = await this.resolveTemplatePath(template);
      const pdfBuffer = await this.generateDocument(
        template.fileType,
        templatePath,
        dto.variables,
      );

      // 4. Persist the generated PDF
      const outputPath = await this.saveOutputPdf(saved.id, pdfBuffer);

      await this.contractRepository.update(saved.id, {
        status: 'completed',
        outputPath,
      });

      this.logger.log(`合同生成完成: id=${saved.id}, 输出=${outputPath}`);

      return this.buildResponse(saved.id, template.name, dto.variables, {
        templateId: dto.templateId,
        status: 'completed',
        outputPath,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`合同生成失败: id=${saved.id}, 错误: ${message}`);

      await this.contractRepository.update(saved.id, {
        status: 'failed',
        errorMessage: message,
      });

      throw new InternalServerErrorException({
        error: 'CONTRACT_GENERATION_FAILED',
        message: '合同生成失败，请稍后重试',
        detail: message,
      });
    }
  }

  /**
   * Retrieve all contracts, optionally filtered by template ID or status.
   */
  async findAll(filters?: {
    templateId?: number;
    status?: string;
  }): Promise<ContractListItemResponseDto[]> {
    const where: Record<string, unknown> = {};

    if (filters?.templateId) {
      where.templateId = filters.templateId;
    }
    if (filters?.status) {
      where.status = filters.status;
    }

    const contracts = await this.contractRepository.find({
      where,
      relations: { template: true },
      order: { createdAt: 'DESC' },
    });

    return contracts.map((c) => ({
      id: c.id,
      templateName: c.template?.name ?? '未知模版',
      status: c.status,
      createdAt: c.createdAt,
    }));
  }

  /**
   * Retrieve a single contract by ID with full details.
   */
  async findOne(id: number): Promise<ContractResponseDto> {
    const contract = await this.contractRepository.findOne({
      where: { id },
      relations: { template: true },
    });

    if (!contract) {
      throw new NotFoundException({
        error: 'CONTRACT_NOT_FOUND',
        message: '合同不存在',
      });
    }

    return this.buildResponseFromEntity(contract);
  }

  /**
   * Retrieve the output PDF file path for download.
   *
   * @returns Absolute path to the generated PDF file.
   */
  async getOutputPath(id: number): Promise<string> {
    const contract = await this.contractRepository.findOne({ where: { id } });

    if (!contract) {
      throw new NotFoundException({
        error: 'CONTRACT_NOT_FOUND',
        message: '合同不存在',
      });
    }

    if (contract.status !== 'completed' || !contract.outputPath) {
      throw new BadRequestException({
        error: 'CONTRACT_NOT_READY',
        message: '合同尚未生成完成',
      });
    }

    const absolutePath = resolve(contract.outputPath);

    try {
      await stat(absolutePath);
    } catch {
      throw new NotFoundException({
        error: 'CONTRACT_FILE_MISSING',
        message: '合同文件不存在或已被删除',
      });
    }

    return absolutePath;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Validate that all required variables are present in the provided values.
   */
  private validateVariables(
    template: TemplateListItemResponseDto & { variables?: unknown[] },
    variables: Record<string, string>,
  ): void {
    // Access the raw variable list from template data
    const templateVariables = (template as Record<string, unknown>).variables;
    if (!Array.isArray(templateVariables) || templateVariables.length === 0) {
      return; // No variables defined — nothing to validate
    }

    const missing: string[] = [];
    for (const tv of templateVariables) {
      const variable = tv as { name: string; required: boolean };
      if (variable.required && !(variable.name in variables)) {
        missing.push(variable.name);
      }
    }

    if (missing.length > 0) {
      throw new BadRequestException({
        error: 'MISSING_REQUIRED_VARIABLES',
        message: `缺少必填变量: ${missing.join(', ')}`,
      });
    }
  }

  /**
   * Resolve the absolute file path of the template.
   */
  private async resolveTemplatePath(
    template: { originalName: string; id: number },
  ): Promise<string> {
    // Fetch full template detail to get filePath
    const detail = await this.templateService.findOne(template.id);
    const uploadDir = resolve(
      this.configService.get<string>('UPLOAD_DIR', './uploads'),
    );
    // The filePath stored in the template is relative to the upload directory.
    // We need to read the template entity's filePath, which is accessible
    // through the service. Use the originalName fallback approach.
    // Actually the TemplateService.findOne returns a DTO; we need the raw entity path.
    // We'll read the template entity directly for its filePath.
    return this.resolveTemplateFilePath(template.id, uploadDir);
  }

  /**
   * Resolve template file path by querying the template entity directly.
   */
  private async resolveTemplateFilePath(
    templateId: number,
    uploadDir: string,
  ): Promise<string> {
    // Use the template service's internal repository access.
    // Since TemplateService exports itself, we can call findOne to get DTO.
    // However we need the filePath from the entity.
    // We'll use a workaround: query the template file path from the service.
    const detail = await this.templateService.findOne(templateId);
    // TemplateDetailResponseDto doesn't expose filePath directly.
    // We need to construct the path. The template stores filePath in the DB.
    // For a clean approach, let's access the Template entity via TypeORM.
    // Since we don't inject the Template repository here, we use a helper method.
    // The filePath is typically: templates/{year}/{month}/{uuid}.ext
    // We rely on the uploadDir + stored filePath from the entity.
    // We'll fetch the raw entity path through the template service.
    return this.fetchTemplatePathFromEntity(templateId, uploadDir);
  }

  /**
   * Internal helper to get the template file path from the database entity.
   * Uses the TemplateService to find the template, then reconstructs the path.
   */
  private async fetchTemplatePathFromEntity(
    templateId: number,
    uploadDir: string,
  ): Promise<string> {
    // The TemplateService.findOne returns a DTO without filePath.
    // We need a way to get the actual file path from the template entity.
    // Strategy: The TemplateService is injected and exported — we can call
    // findOne to verify the template exists, then we need the filePath.
    //
    // Since TemplateService doesn't expose filePath in its DTOs,
    // we'll inject the Template repository indirectly via the TemplateModule's
    // exported service. For now, we'll reconstruct the path from the template
    // entity data. The cleanest solution: add a method to TemplateService
    // that returns the filePath, or inject the Template repository directly.
    //
    // To keep changes minimal, we inject the Template entity repository here
    // via a lazy approach: use the contract repository's manager.
    const templateEntity = await this.contractRepository.manager
      .getRepository('Template')
      .findOne({ where: { id: templateId } });

    if (!templateEntity) {
      throw new NotFoundException({
        error: 'TEMPLATE_NOT_FOUND',
        message: '关联的模版不存在',
      });
    }

    const filePath = (templateEntity as { filePath: string }).filePath;
    return resolve(uploadDir, filePath);
  }

  /**
   * Delegate document generation to the appropriate service based on file type.
   */
  private async generateDocument(
    fileType: string,
    templatePath: string,
    variables: Record<string, string>,
  ): Promise<Buffer> {
    if (fileType === 'pdf') {
      return this.pdfGenerator.generate(templatePath, variables);
    }

    if (fileType === 'docx') {
      return this.wordGenerator.generate(templatePath, variables);
    }

    throw new BadRequestException({
      error: 'UNSUPPORTED_TEMPLATE_TYPE',
      message: `不支持的模版类型: ${fileType}`,
    });
  }

  /**
   * Persist the generated PDF buffer to disk and return the relative path.
   */
  private async saveOutputPdf(
    contractId: number,
    pdfBuffer: Buffer,
  ): Promise<string> {
    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const relativePath = join(
      'contracts',
      year,
      month,
      `${contractId}-${randomUUID()}.pdf`,
    );

    const uploadDir = resolve(
      this.configService.get<string>('UPLOAD_DIR', './uploads'),
    );
    const absolutePath = resolve(uploadDir, relativePath);

    await mkdir(resolve(absolutePath, '..'), { recursive: true });
    await writeFile(absolutePath, pdfBuffer);

    this.logger.debug(`合同 PDF 已保存: ${absolutePath}`);
    return relativePath;
  }

  /**
   * Build a ContractResponseDto from saved contract data.
   */
  private buildResponse(
    contractId: number,
    templateName: string,
    variables: Record<string, string>,
    overrides: Partial<ContractResponseDto> = {},
  ): ContractResponseDto {
    return {
      id: contractId,
      templateId: 0, // Will be overridden by caller if needed
      templateName,
      variables,
      status: 'pending',
      createdAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Build a ContractResponseDto from a full Contract entity.
   */
  private buildResponseFromEntity(contract: Contract): ContractResponseDto {
    let parsedVariables: Record<string, string> = {};
    try {
      parsedVariables = JSON.parse(contract.variables) as Record<string, string>;
    } catch {
      this.logger.warn(`解析合同变量失败: contractId=${contract.id}`);
    }

    return {
      id: contract.id,
      templateId: contract.templateId,
      templateName: contract.template?.name ?? '未知模版',
      variables: parsedVariables,
      status: contract.status,
      outputPath: contract.outputPath ?? undefined,
      errorMessage: contract.errorMessage ?? undefined,
      createdAt: contract.createdAt,
    };
  }
}

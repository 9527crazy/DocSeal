import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Docxtemplater from 'docxtemplater';
import { readFile, writeFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, basename } from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Service responsible for generating contracts from Word (.docx) templates.
 *
 * Workflow:
 * 1. Read the .docx template file.
 * 2. Use docxtemplater to replace `{{variable}}` placeholders with values.
 * 3. Write a filled .docx to a temporary file.
 * 4. Invoke LibreOffice (soffice) to convert the filled .docx → PDF.
 * 5. Read the resulting PDF buffer and clean up temporary files.
 */
@Injectable()
export class WordGeneratorService {
  private readonly logger = new Logger(WordGeneratorService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Generate a PDF from a Word template and variable map.
   *
   * @param templatePath  Absolute or relative path to the source .docx template.
   * @param variables     Key-value pairs to substitute into the template.
   * @returns             Buffer containing the generated PDF bytes.
   */
  async generate(
    templatePath: string,
    variables: Record<string, string>,
  ): Promise<Buffer> {
    const absolutePath = resolve(templatePath);
    this.logger.log(`开始从 Word 模版生成 PDF: ${absolutePath}`);

    // Step 1: Read and fill the docx template
    const filledDocxPath = await this.fillTemplate(absolutePath, variables);

    try {
      // Step 2: Convert the filled docx to PDF via LibreOffice
      const pdfPath = await this.convertToPdf(filledDocxPath);

      // Step 3: Read the generated PDF
      const pdfBytes = await readFile(pdfPath);

      // Step 4: Clean up temporary files
      await this.cleanupQuietly(filledDocxPath);
      await this.cleanupQuietly(pdfPath);

      this.logger.log('Word → PDF 生成完成');
      return Buffer.from(pdfBytes);
    } catch (error) {
      // Ensure temp files are cleaned up even on failure
      await this.cleanupQuietly(filledDocxPath);
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Read the .docx template, replace variables with docxtemplater,
   * and write the filled document to a temporary file.
   *
   * @returns Absolute path to the filled .docx file.
   */
  private async fillTemplate(
    templatePath: string,
    variables: Record<string, string>,
  ): Promise<string> {
    const content = await readFile(templatePath);
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(content);

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{{', end: '}}' },
    });

    doc.render(variables);

    const filledBuffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });

    const tempDir = this.getTempDir();
    await mkdir(tempDir, { recursive: true });

    const filledPath = join(tempDir, `filled-${randomUUID()}.docx`);
    await writeFile(filledPath, filledBuffer);
    this.logger.debug(`已写入填充后的 Word 文件: ${filledPath}`);

    return filledPath;
  }

  /**
   * Invoke LibreOffice to convert a .docx file to PDF.
   *
   * @param docxPath  Absolute path to the .docx file to convert.
   * @returns         Absolute path to the resulting PDF file.
   */
  private async convertToPdf(docxPath: string): Promise<string> {
    const sofficePath = this.configService.get<string>(
      'LIBREOFFICE_PATH',
      'soffice',
    );
    const outputDir = this.getTempDir();

    this.logger.debug(`调用 LibreOffice: ${sofficePath} → ${outputDir}`);

    try {
      await execFileAsync(sofficePath, [
        '--headless',
        '--convert-to',
        'pdf',
        '--outdir',
        outputDir,
        docxPath,
      ], { timeout: 60_000 });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`LibreOffice 转换失败: ${message}`);
      throw new InternalServerErrorException({
        error: 'PDF_CONVERSION_FAILED',
        message: 'Word 转 PDF 失败，请确认系统已安装 LibreOffice',
      });
    }

    // LibreOffice produces a PDF with the same basename as the input
    const baseName = basename(docxPath, '.docx');
    const pdfPath = join(outputDir, `${baseName}.pdf`);

    this.logger.debug(`PDF 输出路径: ${pdfPath}`);
    return pdfPath;
  }

  /**
   * Determine the temporary directory for intermediate files.
   */
  private getTempDir(): string {
    return this.configService.get<string>(
      'TEMP_DIR',
      join(tmpdir(), 'docseal-contracts'),
    );
  }

  /**
   * Silently remove a file; log a warning if deletion fails.
   */
  private async cleanupQuietly(filePath: string): Promise<void> {
    try {
      await rm(filePath, { force: true });
    } catch (error) {
      this.logger.warn(`清理临时文件失败: ${filePath}`, error);
    }
  }
}

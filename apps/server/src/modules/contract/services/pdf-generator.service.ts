import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PDFDocument, PDFFont, RGB } from 'pdf-lib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { TextItem } from 'pdfjs-dist/types/src/display/api';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

/**
 * Describes a variable location found within a PDF page.
 * Coordinates originate from pdfjs-dist (origin at top-left, Y downward).
 */
interface VariablePosition {
  variableName: string;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
}

/**
 * Service responsible for filling PDF templates with variable data.
 *
 * Workflow:
 * 1. Parse the PDF with pdfjs-dist to locate `{{variable}}` placeholders.
 * 2. Convert coordinates from pdfjs (top-left origin) to pdf-lib (bottom-left origin).
 * 3. Create a new PDF using pdf-lib, overlaying filled text at the correct positions.
 * 4. Embed a Chinese-capable font for rendering.
 */
@Injectable()
export class PdfGeneratorService {
  private readonly logger = new Logger(PdfGeneratorService.name);
  private fontBytes: Uint8Array | null = null;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Generate a filled PDF from a template file and variable map.
   *
   * @param templatePath  Absolute or relative path to the source PDF template.
   * @param variables     Key-value pairs to substitute into the template.
   * @returns             Buffer containing the generated PDF bytes.
   */
  async generate(
    templatePath: string,
    variables: Record<string, string>,
  ): Promise<Buffer> {
    const absolutePath = resolve(templatePath);
    this.logger.log(`开始生成 PDF，模版路径: ${absolutePath}`);

    const templateBytes = await readFile(absolutePath);

    // Step 1: Extract variable positions using pdfjs-dist
    const positions = await this.extractVariablePositions(templateBytes);
    this.logger.log(`识别到 ${positions.length} 个变量位置`);

    // Step 2: Load the original PDF with pdf-lib for modification
    const pdfDoc = await PDFDocument.load(templateBytes);
    const font = await this.loadChineseFont(pdfDoc);
    const pages = pdfDoc.getPages();

    // Step 3: Replace each variable placeholder with filled text
    for (const pos of positions) {
      const value = variables[pos.variableName];
      if (value === undefined) {
        this.logger.warn(`变量 "${pos.variableName}" 未提供值，跳过`);
        continue;
      }

      const page = pages[pos.pageIndex];
      if (!page) {
        this.logger.warn(`页面索引 ${pos.pageIndex} 越界，跳过变量 "${pos.variableName}"`);
        continue;
      }

      const { height: pageHeight } = page.getSize();

      // Coordinate conversion: pdfjs (top-left, Y↓) → pdf-lib (bottom-left, Y↑)
      const pdfLibY = pageHeight - pos.y - pos.height;

      this.logger.debug(
        `填充变量 "${pos.variableName}": x=${pos.x.toFixed(1)}, y=${pdfLibY.toFixed(1)}, fontSize=${pos.fontSize}`,
      );

      // Draw white rectangle to cover the placeholder text
      page.drawRectangle({
        x: pos.x - 1,
        y: pdfLibY - 1,
        width: pos.width + 2,
        height: pos.height + 2,
        color: this.rgbFromHex('#FFFFFF'),
      });

      // Draw the filled value text
      page.drawText(value, {
        x: pos.x,
        y: pdfLibY,
        size: pos.fontSize,
        font,
        color: this.rgbFromHex('#000000'),
      });
    }

    const pdfBytes = await pdfDoc.save();
    this.logger.log('PDF 生成完成');
    return Buffer.from(pdfBytes);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Parse the PDF with pdfjs-dist and locate all `{{variableName}}` tokens.
   */
  private async extractVariablePositions(
    pdfBytes: Buffer,
  ): Promise<VariablePosition[]> {
    const loadingTask = getDocument({
      data: new Uint8Array(pdfBytes),
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    });
    const pdfDocument = await loadingTask.promise;
    const positions: VariablePosition[] = [];

    const pattern = /\{\{(\w+)\}\}/g;

    for (let pageIndex = 1; pageIndex <= pdfDocument.numPages; pageIndex++) {
      const page = await pdfDocument.getPage(pageIndex);
      const textContent = await page.getTextContent();

      for (const item of textContent.items) {
        if (!this.isTextItem(item)) continue;

        const text = item.str;
        let match: RegExpExecArray | null;

        // Reset lastIndex for each text item
        pattern.lastIndex = 0;

        while ((match = pattern.exec(text)) !== null) {
          const variableName = match[1];

          // Use the text item transform to compute position.
          // pdfjs-dist transform: [scaleX, shearY, shearX, scaleY, translateX, translateY]
          const tx = item.transform[4];
          const ty = item.transform[5];
          const fontSize = Math.abs(item.transform[0]) || 12;

          // Estimate the X offset of the match within the text string.
          // Use a rough character-width ratio based on font size.
          const charWidth = fontSize * 0.6;
          const matchIndex = match.index;
          const x = tx + matchIndex * charWidth;
          const y = ty;
          const matchWidth = match[0].length * charWidth;
          const height = fontSize;

          positions.push({
            variableName,
            pageIndex: pageIndex - 1, // Convert to 0-based index
            x,
            y,
            width: matchWidth,
            height,
            fontSize,
          });
        }
      }
    }

    return positions;
  }

  /**
   * Load and embed a Chinese-capable font into the PDF document.
   * Falls back to the system Helvetica if no Chinese font file is found.
   */
  private async loadChineseFont(pdfDoc: PDFDocument): Promise<PDFFont> {
    const fontDir = this.configService.get<string>(
      'FONT_DIR',
      resolve(process.cwd(), 'fonts'),
    );
    const fontFile = this.configService.get<string>(
      'CHINESE_FONT_FILE',
      'simsun.ttf',
    );
    const fontPath = join(fontDir, fontFile);

    try {
      if (!this.fontBytes) {
        this.fontBytes = await readFile(fontPath);
        this.logger.log(`已加载中文字体: ${fontPath}`);
      }
      return await pdfDoc.embedFont(this.fontBytes, { subset: true });
    } catch {
      this.logger.warn(
        `中文字体文件未找到 (${fontPath})，使用内置 Helvetica 作为后备字体。` +
          `中文字符可能无法正确显示。`,
      );
      // pdf-lib ships Helvetica as a standard font — no embed needed
      return await pdfDoc.embedFont('Helvetica');
    }
  }

  /**
   * Type-guard to narrow pdfjs `TextItem` from the union with `TextMarkedContent`.
   */
  private isTextItem(item: unknown): item is TextItem {
    return (
      typeof item === 'object' &&
      item !== null &&
      'str' in item &&
      'transform' in item &&
      Array.isArray((item as TextItem).transform)
    );
  }

  /**
   * Convert a hex color string (#RRGGBB) to an pdf-lib RGB instance.
   */
  private rgbFromHex(hex: string): RGB {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return new RGB(r, g, b);
  }
}

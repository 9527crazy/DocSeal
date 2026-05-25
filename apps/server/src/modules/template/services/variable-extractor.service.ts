import { BadRequestException, Injectable } from '@nestjs/common';
import pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import { TemplateFileType } from '../types/template-variable.type';

const VARIABLE_PATTERN = /\{\{([A-Za-z0-9_\u4e00-\u9fa5]{2,50})\}\}/g;

@Injectable()
export class VariableExtractorService {
  async extract(fileBuffer: Buffer, fileType: TemplateFileType): Promise<string[]> {
    const text = await this.extractText(fileBuffer, fileType);
    return this.extractVariablesFromText(text);
  }

  extractVariablesFromText(text: string): string[] {
    const variables: string[] = [];
    const seen = new Set<string>();
    let match: RegExpExecArray | null;

    VARIABLE_PATTERN.lastIndex = 0;
    while ((match = VARIABLE_PATTERN.exec(text)) !== null) {
      const name = match[1].trim();
      if (!seen.has(name)) {
        seen.add(name);
        variables.push(name);
      }
    }

    return variables;
  }

  private async extractText(fileBuffer: Buffer, fileType: TemplateFileType): Promise<string> {
    try {
      if (fileType === 'pdf') {
        const result = await pdfParse(fileBuffer);
        return result.text;
      }

      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      return result.value;
    } catch {
      throw new BadRequestException({
        error: 'TEMPLATE_PARSE_FAILED',
        message: '模版解析失败，请检查文件是否有效',
      });
    }
  }
}

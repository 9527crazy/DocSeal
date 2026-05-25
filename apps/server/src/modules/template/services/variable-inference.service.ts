import { Injectable, Logger } from '@nestjs/common';
import { TemplateVariableType } from '../types/template-variable.type';

interface InferenceRule {
  keywords: string[];
  type: TemplateVariableType;
  priority: number;
}

@Injectable()
export class VariableInferenceService {
  private readonly logger = new Logger(VariableInferenceService.name);

  private readonly rules: InferenceRule[] = [
    { keywords: ['日期', '时间'], type: 'date', priority: 1 },
    { keywords: ['金额', '价格', '费用', '总价'], type: 'number', priority: 2 },
    { keywords: ['数量', '人数', '天数'], type: 'number', priority: 3 },
    { keywords: ['手机', '电话', '传真'], type: 'tel', priority: 4 },
    { keywords: ['邮箱', 'email'], type: 'email', priority: 5 },
    { keywords: ['地址'], type: 'text', priority: 6 },
  ];

  inferVariableType(name: string): TemplateVariableType {
    const normalizedName = name.toLowerCase();
    const matches = this.rules.filter((rule) =>
      rule.keywords.some((keyword) => normalizedName.includes(keyword.toLowerCase())),
    );

    if (matches.length === 0) {
      return 'text';
    }

    matches.sort((a, b) => a.priority - b.priority);

    if (matches.length > 1) {
      this.logger.warn(
        `变量 "${name}" 类型推断冲突: ${matches.map((match) => match.type).join(' vs ')}, 选择 ${matches[0].type}`,
      );
    }

    return matches[0].type;
  }

  getDefaultValidation(type: TemplateVariableType): Record<string, unknown> {
    const validationRules: Record<TemplateVariableType, Record<string, unknown>> = {
      text: { required: true, maxLength: 200 },
      number: { required: true, min: 0, max: 999999999 },
      date: { required: true },
      tel: {
        required: false,
        pattern: '^1[3-9]\\d{9}$',
        patternMessage: '请输入正确的手机号',
      },
      email: {
        required: false,
        pattern: '^\\S+@\\S+\\.\\S+$',
        patternMessage: '请输入正确的邮箱',
      },
    };

    return validationRules[type];
  }

  isRequired(type: TemplateVariableType): boolean {
    return type !== 'tel' && type !== 'email';
  }
}

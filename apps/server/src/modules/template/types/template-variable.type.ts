export type TemplateFileType = 'pdf' | 'docx';

export type TemplateVariableType = 'text' | 'number' | 'date' | 'tel' | 'email';

export interface ExtractedVariable {
  name: string;
  type: TemplateVariableType;
  required: boolean;
  validationRules: Record<string, unknown>;
  sortOrder: number;
}

export interface TemplateWarning {
  message: string;
}

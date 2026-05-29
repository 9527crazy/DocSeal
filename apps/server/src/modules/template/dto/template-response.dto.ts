import { TemplateFileType, TemplateVariableType } from '../types/template-variable.type';

export interface TemplateVariableResponseDto {
  id: number;
  name: string;
  type: TemplateVariableType;
  required: boolean;
  validationRules?: Record<string, unknown>;
  sortOrder: number;
}

export interface TemplateListItemResponseDto {
  id: number;
  name: string;
  originalName: string;
  fileType: TemplateFileType;
  category?: string;
  variableCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateDetailResponseDto extends TemplateListItemResponseDto {
  variables: TemplateVariableResponseDto[];
  warnings: string[];
  htmlContent?: string;
}

export interface TemplateUploadResponseDto extends TemplateDetailResponseDto {}

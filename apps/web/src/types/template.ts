export type TemplateFileType = 'pdf' | 'docx'
export type TemplateVariableType = 'text' | 'number' | 'date' | 'tel' | 'email'

export interface TemplateVariable {
  id: number
  name: string
  type: TemplateVariableType
  required: boolean
  validationRules?: Record<string, unknown>
  sortOrder: number
}

export interface TemplateItem {
  id: number
  name: string
  originalName: string
  fileType: TemplateFileType
  category?: string
  variableCount: number
  createdAt: string
  updatedAt: string
}

export interface TemplateDetail extends TemplateItem {
  variables: TemplateVariable[]
  warnings: string[]
}

export interface UploadTemplatePayload {
  name?: string
  category?: string
}

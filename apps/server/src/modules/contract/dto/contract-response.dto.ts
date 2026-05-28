/**
 * Response DTO for a full contract detail view.
 */
export interface ContractResponseDto {
  id: number;
  templateId: number;
  templateName: string;
  variables: Record<string, string>;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  outputPath?: string;
  errorMessage?: string;
  createdAt: Date;
}

/**
 * Response DTO for contract list items (abbreviated view).
 */
export interface ContractListItemResponseDto {
  id: number;
  templateName: string;
  status: string;
  createdAt: Date;
}

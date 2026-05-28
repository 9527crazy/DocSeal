import { IsInt, IsNotEmpty, IsObject, Min } from 'class-validator';

/**
 * DTO for creating a new contract from a template.
 * Validates that a template ID and variable values are provided.
 */
export class CreateContractDto {
  @IsInt({ message: '模版 ID 必须为整数' })
  @Min(1, { message: '模版 ID 必须大于 0' })
  @IsNotEmpty({ message: '请选择模版' })
  templateId!: number;

  @IsObject({ message: '变量值必须为对象' })
  @IsNotEmpty({ message: '请填写合同变量' })
  variables!: Record<string, string>;
}

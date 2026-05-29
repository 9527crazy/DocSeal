import { IsOptional, IsString } from 'class-validator';

export class CreateTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  category?: string;
}

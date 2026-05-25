import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplateVariable } from './entities/template-variable.entity';
import { Template } from './entities/template.entity';
import { VariableExtractorService } from './services/variable-extractor.service';
import { VariableInferenceService } from './services/variable-inference.service';
import { TemplateController } from './template.controller';
import { TemplateService } from './template.service';

@Module({
  imports: [TypeOrmModule.forFeature([Template, TemplateVariable])],
  controllers: [TemplateController],
  providers: [TemplateService, VariableExtractorService, VariableInferenceService],
  exports: [TemplateService],
})
export class TemplateModule {}

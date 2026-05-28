import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contract } from './entities/contract.entity';
import { ContractController } from './contract.controller';
import { ContractService } from './contract.service';
import { PdfGeneratorService } from './services/pdf-generator.service';
import { WordGeneratorService } from './services/word-generator.service';
import { TemplateModule } from '../template/template.module';

/**
 * Contract module — responsible for contract generation, querying, and download.
 *
 * Depends on:
 * - TemplateModule for template lookups and validation.
 * - TypeORM entity registration for the Contract entity.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Contract]), TemplateModule],
  controllers: [ContractController],
  providers: [ContractService, PdfGeneratorService, WordGeneratorService],
  exports: [ContractService],
})
export class ContractModule {}

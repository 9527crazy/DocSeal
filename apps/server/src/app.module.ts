import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { ContractModule } from './modules/contract/contract.module';
import { HealthModule } from './modules/health/health.module';
import { TemplateModule } from './modules/template/template.module';

@Module({
  imports: [AppConfigModule, DatabaseModule, HealthModule, TemplateModule, ContractModule],
})
export class AppModule {}

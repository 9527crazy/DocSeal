import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './modules/health/health.module';
import { TemplateModule } from './modules/template/template.module';

@Module({
  imports: [AppConfigModule, DatabaseModule, HealthModule, TemplateModule],
})
export class AppModule {}

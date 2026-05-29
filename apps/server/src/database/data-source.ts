import { DataSource } from 'typeorm';
import { Template } from '../modules/template/entities/template.entity';
import { TemplateVariable } from '../modules/template/entities/template-variable.entity';

export default new DataSource({
  type: 'better-sqlite3',
  database: './data/app.db',
  entities: [Template, TemplateVariable],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
});

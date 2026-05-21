import { DataSource } from 'typeorm';
import { Template } from '../modules/template/entities/template.entity';
import { TemplateVariable } from '../modules/template/entities/template-variable.entity';
import { Contract } from '../modules/contract/entities/contract.entity';

export default new DataSource({
  type: 'better-sqlite3',
  database: './data/app.db',
  entities: [Template, TemplateVariable, Contract],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
});

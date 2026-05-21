import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Template } from './template.entity';

@Entity('template_variables')
export class TemplateVariable {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'template_id' })
  templateId: number;

  @Column()
  name: string;

  @Column({ type: 'text', default: 'text' })
  type: string;

  @Column({ type: 'integer', default: 1 })
  required: number;

  @Column({ name: 'default_value', nullable: true })
  defaultValue: string;

  @Column({ name: 'validation_rules', type: 'text', nullable: true })
  validationRules: string;

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Template, (t) => t.variableEntities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_id' })
  template: Template;
}

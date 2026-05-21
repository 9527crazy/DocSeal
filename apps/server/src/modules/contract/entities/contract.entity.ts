import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Template } from '../../template/entities/template.entity';

@Entity('contracts')
export class Contract {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'template_id' })
  templateId: number;

  @Column({ type: 'text', default: '{}' })
  variables: string;

  @Column({ name: 'output_path', nullable: true })
  outputPath: string;

  @Column({ type: 'text', default: 'pending' })
  status: 'pending' | 'generating' | 'completed' | 'failed';

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Template)
  @JoinColumn({ name: 'template_id' })
  template: Template;
}

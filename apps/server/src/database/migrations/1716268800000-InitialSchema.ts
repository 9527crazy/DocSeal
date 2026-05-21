import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1716268800000 implements MigrationInterface {
  name = 'InitialSchema1716268800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "templates" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "name" varchar NOT NULL,
        "original_name" varchar NOT NULL,
        "file_path" varchar NOT NULL,
        "file_type" varchar NOT NULL,
        "variables" text NOT NULL DEFAULT '[]',
        "category" varchar,
        "created_at" datetime NOT NULL DEFAULT (datetime('now')),
        "updated_at" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "template_variables" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "template_id" integer NOT NULL,
        "name" varchar NOT NULL,
        "type" text NOT NULL DEFAULT 'text',
        "required" integer NOT NULL DEFAULT 1,
        "default_value" varchar,
        "validation_rules" text,
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" datetime NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT "FK_template_variables_template" FOREIGN KEY ("template_id") REFERENCES "templates" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "contracts" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "template_id" integer NOT NULL,
        "variables" text NOT NULL DEFAULT '{}',
        "output_path" varchar,
        "status" text NOT NULL DEFAULT 'pending',
        "error_message" text,
        "created_at" datetime NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT "FK_contracts_template" FOREIGN KEY ("template_id") REFERENCES "templates" ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_templates_category" ON "templates" ("category")`);
    await queryRunner.query(`CREATE INDEX "idx_contracts_template" ON "contracts" ("template_id")`);
    await queryRunner.query(`CREATE INDEX "idx_contracts_status" ON "contracts" ("status")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_contracts_status"`);
    await queryRunner.query(`DROP INDEX "idx_contracts_template"`);
    await queryRunner.query(`DROP INDEX "idx_templates_category"`);
    await queryRunner.query(`DROP TABLE "contracts"`);
    await queryRunner.query(`DROP TABLE "template_variables"`);
    await queryRunner.query(`DROP TABLE "templates"`);
  }
}

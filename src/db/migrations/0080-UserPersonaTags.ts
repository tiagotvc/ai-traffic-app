import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Tags livres na biblioteca de personas.
 *
 * A biblioteca é global do workspace e não tem vínculo com cliente (decisão do
 * produto), então não havia como organizar nem saber de onde cada persona veio
 * — os gestores passaram a improvisar prefixos no próprio nome ("[Traffic AI]
 * Vanessa"). As tags dão esse eixo de organização sem amarrar a persona a um
 * cliente, e o índice GIN permite filtrar com o operador `?|`.
 */
export class UserPersonaTags_1735990000000 implements MigrationInterface {
  name = "UserPersonaTags_1735990000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_personas"
        ADD COLUMN IF NOT EXISTS "tags" jsonb NOT NULL DEFAULT '[]'::jsonb;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_user_personas_tags"
        ON "user_personas" USING GIN ("tags" jsonb_path_ops);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_personas_tags";`);
    await queryRunner.query(`
      ALTER TABLE "user_personas" DROP COLUMN IF EXISTS "tags";
    `);
  }
}

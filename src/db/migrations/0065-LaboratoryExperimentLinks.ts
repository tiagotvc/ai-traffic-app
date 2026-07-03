import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Fase 3 da arquitetura Orion (docs/orion-architecture §2.2): fecha o elo
 * Hypothesis→Experiment→Learning nos dois modelos persistidos de experimento.
 */
export class LaboratoryExperimentLinks_1735833500000 implements MigrationInterface {
  name = "LaboratoryExperimentLinks_1735833500000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "labs_experiments" ADD COLUMN IF NOT EXISTS "hypothesis_id" uuid NULL;
      ALTER TABLE "labs_experiments" ADD COLUMN IF NOT EXISTS "result_learning_id" uuid NULL;
      ALTER TABLE "client_experiments" ADD COLUMN IF NOT EXISTS "resultLearningId" uuid NULL;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "labs_experiments" DROP COLUMN IF EXISTS "hypothesis_id";
      ALTER TABLE "labs_experiments" DROP COLUMN IF EXISTS "result_learning_id";
      ALTER TABLE "client_experiments" DROP COLUMN IF EXISTS "resultLearningId";
    `);
  }
}

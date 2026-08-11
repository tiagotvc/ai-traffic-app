import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Seed do override `creative-studio: { mode: "admin_only" }` em `platform_settings`
 * (chave `platform_feature_flags`) — o Estúdio Criativo (Studio/Library/Canvas/Video)
 * acabou de ser mergeado e não deve ir pro ar pra todo mundo ainda; só platform admins
 * (`platformRole === "admin"`) acessam até o rollout ser liberado em
 * /admin/platform/feature-flags. Sem override, o default do registry é `global` (ligado
 * pra todo mundo) — por isso o seed explícito aqui, em vez de confiar no default.
 *
 * `value = value || excluded.value` faz merge raso no jsonb existente (não sobrescreve
 * outros overrides já salvos); `down` remove só a chave `creative-studio`, preservando o
 * resto.
 */
export class CreativeStudioFeatureFlagDefault_1739100000000 implements MigrationInterface {
  name = "CreativeStudioFeatureFlagDefault_1739100000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO "platform_settings" ("key", "value")
       VALUES ($1, $2::jsonb)
       ON CONFLICT ("key") DO UPDATE
       SET "value" = "platform_settings"."value" || EXCLUDED."value"
       WHERE NOT ("platform_settings"."value" ? 'creative-studio');`,
      ["platform_feature_flags", JSON.stringify({ "creative-studio": { mode: "admin_only" } })]
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "platform_settings"
       SET "value" = "value" - 'creative-studio'
       WHERE "key" = 'platform_feature_flags';`
    );
  }
}

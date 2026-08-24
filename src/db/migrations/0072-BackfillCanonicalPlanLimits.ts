import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Corrige os limites de basic/advanced/agency pra baterem com o que é vendido de
 * verdade (confirmado na landing) e com a tabela de gating confirmada (Orion
 * Persona®/Ranking de Criativos/Orion Cortex/Agenda só em Advanced+Agency).
 *
 * Não é um merge aditivo (`||`): as linhas de advanced/agency já tinham várias
 * chaves EXPLICITAMENTE erradas (ex.: agency com maxScientists=0, allowWhiteLabel=
 * false, maxDashboards=0 — pinadas assim por uma edição anterior no admin), então
 * um merge que só preenche o que falta não corrigiria nada. Sobrescreve os campos
 * específicos que estavam errados; up() é o novo estado completo e correto.
 */
export class BackfillCanonicalPlanLimits_1735930200000 implements MigrationInterface {
  name = "BackfillCanonicalPlanLimits_1735930200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE plans SET limits = limits || '${JSON.stringify({
        maxClients: 5,
        maxAdAccounts: 10,
        maxAutomationRules: 5,
        maxAiRequestsPerMonth: 50,
        maxScheduledReports: 0,
        allowCopilot: false,
        maxScientists: 0,
        allowCreativeMemoryAi: false,
        allowAgencyBrainHypotheses: false,
        allowAgencyBrainDna: false,
        allowAgencyBrainTimeline: false,
        allowAgencyBrainExperiments: false,
        allowAgencyBrainActionPlans: false,
        allowAgencyBrainChat: false,
        allowNavCampaigns: true,
        allowNavAudiences: true,
        allowNavCreatives: true,
        allowNavReports: true,
        allowNavAlerts: true,
        allowNavAutomations: false,
        allowDashboardCanvas: false,
        maxDashboards: 0,
        maxDashboardWidgets: 0,
        allowDashboardResize: false,
        allowDashboardAiWidgets: false,
        allowDashboardAiBuilder: false,
        allowDashboardSharing: false,
        allowWhiteLabel: false,
        maxAudiencePersonas: 0,
        allowRankingConfig: false,
        automationTier: 1
      })}'::jsonb WHERE slug = 'basic';
    `);

    await queryRunner.query(`
      UPDATE plans SET limits = limits || '${JSON.stringify({
        maxAdAccounts: 15,
        maxAiRequestsPerMonth: 150,
        maxScientists: 2,
        allowNavCampaigns: true,
        allowNavAudiences: true,
        allowNavCreatives: true,
        allowNavReports: true,
        allowNavAlerts: true,
        allowNavAutomations: true,
        allowDashboardCanvas: true,
        maxDashboards: 3,
        maxDashboardWidgets: 20,
        allowDashboardResize: true,
        allowDashboardAiWidgets: "basic",
        allowDashboardAiBuilder: false,
        allowDashboardSharing: false,
        allowWhiteLabel: true,
        maxAudiencePersonas: -1,
        allowRankingConfig: true,
        automationTier: 2
      })}'::jsonb WHERE slug = 'advanced';
    `);

    await queryRunner.query(`
      UPDATE plans SET limits = limits || '${JSON.stringify({
        maxClients: 20,
        maxAdAccounts: 30,
        maxAiRequestsPerMonth: 250,
        maxScientists: 5,
        allowDashboardCanvas: true,
        maxDashboards: 10,
        maxDashboardWidgets: 50,
        allowDashboardResize: true,
        allowDashboardAiWidgets: "premium",
        allowDashboardAiBuilder: false,
        allowDashboardSharing: true,
        allowWhiteLabel: true,
        maxAudiencePersonas: -1,
        allowRankingConfig: true,
        automationTier: 3
      })}'::jsonb WHERE slug = 'agency';
    `);
  }

  public async down(): Promise<void> {
    // Correção de dados pra bater com o catálogo comercial real — não há um estado
    // anterior "correto" pra restaurar (os valores prévios eram os que estavam errados).
  }
}

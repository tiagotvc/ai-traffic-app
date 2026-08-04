import "dotenv/config";
import pg from "pg";
import { randomUUID } from "crypto";

const TENANT_ID = "e6fa1749-4571-4099-be78-3eff3c08dd6d"; // Workspace Meta 27034522166211884 (Nathalia Lindner Ilustre / Gilberto Ilustre)

const END_DATE = new Date(Date.UTC(2026, 7, 3)); // 2026-08-03 (ontem)
const DAYS = 183; // ~6 meses

function mulberry32(seed) {
  return function rng() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dateStr(d) {
  return d.toISOString().slice(0, 10);
}
function addDays(d, n) {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}
const START_DATE = addDays(END_DATE, -(DAYS - 1));
function dateForIndex(i) {
  return addDays(START_DATE, i);
}
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
function round2(v) {
  return Math.round(v * 100) / 100;
}

// ---------- Client / campaign definitions ----------

const CLIENTS = [
  {
    key: "doutor-a",
    name: "Doutor A — Clínica de Estética",
    niche: "clinica",
    adAccountId: "act_demo_doutor_a",
    label: "Conta Demo — Doutor A (Clínica de Estética)",
    avgTicket: 850,
    closeRate: 0.22,
    seed: 1001,
    campaigns: [
      {
        key: "captacao-avaliacao",
        name: "Captação de Leads — Avaliação Facial Gratuita",
        objective: "leads",
        startOffset: 0,
        rampDays: 10,
        baseSpend: 42,
        endMultiplier: 2.3,
        cpmBase: 34,
        ctrBase: 0.016,
        ctrGrowth: 0.2,
        convBase: 0.045,
        convGrowth: 0.35,
        adsets: [
          { name: "Público Frio — Mulheres 25-45", weight: 0.6, cpmAdj: 1.05, ctrAdj: 0.9, convAdj: 0.9 },
          { name: "Interesses — Estética e Beleza", weight: 0.4, cpmAdj: 0.95, ctrAdj: 1.15, convAdj: 1.1 }
        ]
      },
      {
        key: "remarketing-orcamento",
        name: "Remarketing — Fechamento de Orçamento",
        objective: "conversions",
        startOffset: 45,
        rampDays: 7,
        baseSpend: 22,
        endMultiplier: 1.8,
        cpmBase: 24,
        ctrBase: 0.028,
        ctrGrowth: 0.15,
        convBase: 0.09,
        convGrowth: 0.2,
        adsets: [
          { name: "Remarketing — Visitantes do Site", weight: 0.55, cpmAdj: 1.0, ctrAdj: 1.0, convAdj: 1.0 },
          { name: "Lookalike 1% — Clientes", weight: 0.45, cpmAdj: 1.1, ctrAdj: 0.95, convAdj: 1.05 }
        ]
      },
      {
        key: "lancamento-harmonizacao",
        name: "Lançamento — Harmonização Facial Premium",
        objective: "leads",
        startOffset: 118,
        rampDays: 12,
        baseSpend: 30,
        endMultiplier: 1.6,
        cpmBase: 38,
        ctrBase: 0.018,
        ctrGrowth: 0.1,
        convBase: 0.05,
        convGrowth: 0.15,
        adsets: [
          { name: "Público Frio — Interesses Premium", weight: 0.5, cpmAdj: 1.0, ctrAdj: 1.0, convAdj: 1.0 },
          { name: "Lookalike — Compradoras Alto Ticket", weight: 0.5, cpmAdj: 1.05, ctrAdj: 1.05, convAdj: 1.05 }
        ]
      }
    ]
  },
  {
    key: "cliente-b",
    name: "Cliente B — Clínica de Estética",
    niche: "clinica",
    adAccountId: "act_demo_cliente_b",
    label: "Conta Demo — Cliente B (Clínica de Estética)",
    avgTicket: 620,
    closeRate: 0.2,
    seed: 2002,
    campaigns: [
      {
        key: "captacao-corporal",
        name: "Captação de Leads — Avaliação Corporal",
        objective: "leads",
        startOffset: 0,
        rampDays: 10,
        baseSpend: 28,
        endMultiplier: 2.6,
        cpmBase: 30,
        ctrBase: 0.015,
        ctrGrowth: 0.2,
        convBase: 0.04,
        convGrowth: 0.3,
        adsets: [
          { name: "Público Frio — Mulheres 22-40", weight: 0.65, cpmAdj: 1.0, ctrAdj: 0.9, convAdj: 0.9 },
          { name: "Interesses — Emagrecimento", weight: 0.35, cpmAdj: 0.95, ctrAdj: 1.15, convAdj: 1.1 }
        ]
      },
      {
        key: "promo-drenagem",
        name: "Promoção — Drenagem Linfática",
        objective: "conversions",
        startOffset: 50,
        rampDays: 6,
        baseSpend: 16,
        endMultiplier: 1.7,
        cpmBase: 22,
        ctrBase: 0.026,
        ctrGrowth: 0.12,
        convBase: 0.08,
        convGrowth: 0.18,
        adsets: [
          { name: "Remarketing — Visitantes do Site", weight: 0.5, cpmAdj: 1.0, ctrAdj: 1.0, convAdj: 1.0 },
          { name: "Lookalike 1% — Clientes", weight: 0.5, cpmAdj: 1.05, ctrAdj: 1.0, convAdj: 1.0 }
        ]
      },
      {
        key: "nova-unidade-crio",
        name: "Nova Unidade — Pacotes Criolipólise",
        objective: "leads",
        startOffset: 108,
        rampDays: 14,
        baseSpend: 20,
        endMultiplier: 2.0,
        cpmBase: 32,
        ctrBase: 0.017,
        ctrGrowth: 0.15,
        convBase: 0.045,
        convGrowth: 0.2,
        adsets: [
          { name: "Público Frio — Região da Unidade", weight: 0.6, cpmAdj: 1.0, ctrAdj: 1.0, convAdj: 1.0 },
          { name: "Interesses — Estética Corporal", weight: 0.4, cpmAdj: 0.95, ctrAdj: 1.05, convAdj: 1.05 }
        ]
      }
    ]
  },
  {
    key: "cliente-c",
    name: "Cliente C — Climatização e Ar Condicionado",
    niche: "outro",
    adAccountId: "act_demo_cliente_c",
    label: "Conta Demo — Cliente C (Ar Condicionado)",
    avgTicket: 680,
    closeRate: 0.28,
    seed: 3003,
    campaigns: [
      {
        key: "instalacao-local",
        name: "Instalação de Ar Condicionado — Captação Local",
        objective: "leads",
        startOffset: 0,
        rampDays: 8,
        baseSpend: 55,
        endMultiplier: 2.1,
        cpmBase: 26,
        ctrBase: 0.017,
        ctrGrowth: 0.15,
        convBase: 0.06,
        convGrowth: 0.2,
        seasonalAmp: 0.18,
        adsets: [
          { name: "Público Frio — Raio 10km", weight: 0.65, cpmAdj: 1.0, ctrAdj: 0.95, convAdj: 0.95 },
          { name: "Interesses — Reforma e Climatização", weight: 0.35, cpmAdj: 0.9, ctrAdj: 1.1, convAdj: 1.1 }
        ]
      },
      {
        key: "contratos-pj",
        name: "Manutenção Preventiva — Contratos PJ",
        objective: "leads",
        startOffset: 40,
        rampDays: 10,
        baseSpend: 26,
        endMultiplier: 2.4,
        cpmBase: 32,
        ctrBase: 0.013,
        ctrGrowth: 0.2,
        convBase: 0.05,
        convGrowth: 0.25,
        adsets: [
          { name: "Público Frio — Empresas e Condomínios", weight: 0.6, cpmAdj: 1.05, ctrAdj: 1.0, convAdj: 1.0 },
          { name: "Remarketing — Site e Formulário", weight: 0.4, cpmAdj: 0.95, ctrAdj: 1.2, convAdj: 1.15 }
        ]
      },
      {
        key: "black-week-clima",
        name: "Black Week Climatização — Promoção de Instalação",
        objective: "conversions",
        startOffset: 130,
        rampDays: 5,
        baseSpend: 45,
        endMultiplier: 1.9,
        cpmBase: 28,
        ctrBase: 0.02,
        ctrGrowth: 0.1,
        convBase: 0.065,
        convGrowth: 0.1,
        adsets: [
          { name: "Público Frio — Promoção Geral", weight: 0.55, cpmAdj: 1.0, ctrAdj: 1.0, convAdj: 1.0 },
          { name: "Remarketing — Carrinho de Orçamento", weight: 0.45, cpmAdj: 1.0, ctrAdj: 1.1, convAdj: 1.1 }
        ]
      }
    ]
  },
  {
    key: "cliente-d",
    name: "Cliente D — Academia (Rede)",
    niche: "outro",
    adAccountId: "act_demo_cliente_d",
    label: "Conta Demo — Cliente D (Academia em Rede)",
    avgTicket: 1150,
    closeRate: 0.18,
    seed: 4004,
    campaigns: [
      {
        key: "matriculas-centro",
        name: "Matrículas — Unidade Centro",
        objective: "leads",
        startOffset: 0,
        rampDays: 10,
        baseSpend: 70,
        endMultiplier: 2.0,
        cpmBase: 20,
        ctrBase: 0.02,
        ctrGrowth: 0.15,
        convBase: 0.05,
        convGrowth: 0.2,
        adsets: [
          { name: "Público Frio — Raio 5km", weight: 0.6, cpmAdj: 1.0, ctrAdj: 0.95, convAdj: 0.9 },
          { name: "Interesses — Fitness e Saúde", weight: 0.4, cpmAdj: 0.9, ctrAdj: 1.1, convAdj: 1.1 }
        ]
      },
      {
        key: "matriculas-zona-sul",
        name: "Matrículas — Unidade Zona Sul",
        objective: "leads",
        startOffset: 35,
        rampDays: 10,
        baseSpend: 55,
        endMultiplier: 2.2,
        cpmBase: 21,
        ctrBase: 0.019,
        ctrGrowth: 0.18,
        convBase: 0.048,
        convGrowth: 0.22,
        adsets: [
          { name: "Público Frio — Raio 5km", weight: 0.6, cpmAdj: 1.0, ctrAdj: 1.0, convAdj: 1.0 },
          { name: "Lookalike 1% — Alunos Ativos", weight: 0.4, cpmAdj: 1.0, ctrAdj: 1.1, convAdj: 1.1 }
        ]
      },
      {
        key: "inauguracao-zona-norte",
        name: "Inauguração — Unidade Zona Norte",
        objective: "conversions",
        startOffset: 100,
        rampDays: 20,
        baseSpend: 60,
        endMultiplier: 2.8,
        cpmBase: 23,
        ctrBase: 0.022,
        ctrGrowth: 0.15,
        convBase: 0.055,
        convGrowth: 0.15,
        adsets: [
          { name: "Público Frio — Raio 5km Nova Unidade", weight: 0.55, cpmAdj: 1.0, ctrAdj: 1.0, convAdj: 1.0 },
          { name: "Oferta de Inauguração — Geral", weight: 0.45, cpmAdj: 0.95, ctrAdj: 1.15, convAdj: 1.2 }
        ]
      }
    ]
  }
];

// ---------- Metric generation ----------

function dayOfWeekUTC(date) {
  return date.getUTCDay(); // 0=Sun..6=Sat
}

function computeCampaignDay(client, camp, dayIndex, rng) {
  if (dayIndex < camp.startOffset) return null;
  const daysLive = dayIndex - camp.startOffset;
  const rampFactor = clamp(0.35 + 0.65 * (daysLive / camp.rampDays), 0.35, 1);
  const lifeSpan = Math.max(1, DAYS - 1 - camp.startOffset);
  const growthProgress = clamp(daysLive / lifeSpan, 0, 1);
  const growthFactor = 1 + (camp.endMultiplier - 1) * growthProgress;

  const date = dateForIndex(dayIndex);
  const dow = dayOfWeekUTC(date);
  const weekly = dow === 0 || dow === 6 ? 0.82 : 1.0;

  const seasonal = camp.seasonalAmp
    ? 1 + camp.seasonalAmp * Math.sin((2 * Math.PI * dayIndex) / 365)
    : 1;

  const noiseSpend = 0.85 + rng() * 0.3;
  const spend = round2(camp.baseSpend * rampFactor * growthFactor * weekly * seasonal * noiseSpend);

  const cpm = camp.cpmBase * (1 - 0.1 * growthProgress) * (0.9 + rng() * 0.2);
  const ctr = camp.ctrBase * (1 + camp.ctrGrowth * growthProgress) * (0.88 + rng() * 0.24);
  const convRate = camp.convBase * (1 + camp.convGrowth * growthProgress) * (0.85 + rng() * 0.3);

  const impressions = Math.max(0, Math.round((spend / cpm) * 1000));
  const clicks = Math.max(0, Math.round(impressions * ctr));
  const conversions = Math.max(0, Math.round(clicks * convRate));
  const leads = conversions;
  const freq = 1.4 + rng() * 0.6;
  const reach = Math.max(0, Math.round(impressions / freq));
  const messages = Math.max(0, Math.round(conversions * (0.25 + rng() * 0.3)));
  const cpc = clicks > 0 ? spend / clicks : 0;
  const ctrPct = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const rawRoas = spend > 0 ? (leads * client.avgTicket * client.closeRate) / spend : 0;
  const roas = clamp(rawRoas * (0.9 + rng() * 0.2), 0.4, 12);
  const dailyBudget = Math.max(5, Math.round((spend * 1.15) / 5) * 5);

  return {
    spend,
    impressions,
    clicks,
    ctr: ctrPct,
    cpc,
    conversions,
    leads,
    reach,
    messages,
    roas,
    dailyBudget,
    campaignStatus: "ACTIVE"
  };
}

function splitAdset(campDay, adsets, rng) {
  const weights = adsets.map((a) => a.weight * (0.94 + rng() * 0.12));
  const wsum = weights.reduce((a, b) => a + b, 0);
  const norm = weights.map((w) => w / wsum);

  return adsets.map((a, i) => {
    const isLast = i === adsets.length - 1;
    const priorSpend = norm.slice(0, i).reduce((acc, w) => acc + w * campDay.spend, 0);
    const spend = isLast
      ? round2(campDay.spend - priorSpend)
      : round2(campDay.spend * norm[i]);

    const cpm = (campDay.spend > 0 ? (campDay.spend / Math.max(1, campDay.impressions)) * 1000 : 30) * a.cpmAdj;
    const ctr = (campDay.ctr / 100) * a.ctrAdj * (0.9 + rng() * 0.2);
    const convRate = (campDay.leads / Math.max(1, campDay.clicks)) * a.convAdj * (0.9 + rng() * 0.2);

    const impressions = cpm > 0 ? Math.max(0, Math.round((spend / cpm) * 1000)) : 0;
    const clicks = Math.max(0, Math.round(impressions * ctr));
    const conversions = Math.max(0, Math.round(clicks * convRate));
    const leads = conversions;
    const freq = 1.3 + rng() * 0.7;
    const reach = Math.max(0, Math.round(impressions / freq));
    const messages = Math.max(0, Math.round(conversions * (0.25 + rng() * 0.3)));
    const cpc = clicks > 0 ? spend / clicks : 0;
    const ctrPct = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const roas = clamp(campDay.roas * (0.85 + rng() * 0.3), 0.3, 14);

    return {
      name: a.name,
      spend,
      impressions,
      clicks,
      ctr: ctrPct,
      cpc,
      conversions,
      leads,
      reach,
      messages,
      roas
    };
  });
}

// ---------- DB helpers ----------

async function bulkInsert(client, table, columns, rows, conflictCols) {
  if (rows.length === 0) return 0;
  const CHUNK = 400;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const values = [];
    const tuples = chunk.map((row, ri) => {
      const placeholders = columns.map((_, ci) => `$${ri * columns.length + ci + 1}`);
      values.push(...row);
      return `(${placeholders.join(",")})`;
    });
    const sql = `INSERT INTO ${table} (${columns.map((c) => `"${c}"`).join(",")}) VALUES ${tuples.join(",")} ON CONFLICT (${conflictCols.map((c) => `"${c}"`).join(",")}) DO NOTHING`;
    const res = await client.query(sql, values);
    inserted += res.rowCount ?? 0;
  }
  return inserted;
}

async function main() {
  const pgClient = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await pgClient.connect();

  console.log(`Janela de dados: ${dateStr(START_DATE)} .. ${dateStr(END_DATE)} (${DAYS} dias)`);

  const summary = [];

  for (const spec of CLIENTS) {
    const rng = mulberry32(spec.seed);

    // 1) Client
    const existingClient = await pgClient.query(
      `SELECT id FROM clients WHERE "tenantId" = $1 AND name = $2`,
      [TENANT_ID, spec.name]
    );
    let clientId;
    if (existingClient.rows.length > 0) {
      clientId = existingClient.rows[0].id;
      console.log(`Cliente já existe, reutilizando: ${spec.name} (${clientId})`);
    } else {
      clientId = randomUUID();
      await pgClient.query(
        `INSERT INTO clients (id, "createdAt", "updatedAt", name, "tenantId", "aiContext", niche, competitors)
         VALUES ($1, now(), now(), $2, $3, $4::jsonb, $5, '[]'::jsonb)`,
        [
          clientId,
          spec.name,
          TENANT_ID,
          JSON.stringify({
            note: "Conta de demonstração comercial da plataforma (dados fictícios para showcase).",
            showcaseSeed: true,
            seedScript: "scripts/seed-demo-agency-clients.mjs"
          }),
          spec.niche
        ]
      );
      console.log(`Cliente criado: ${spec.name} (${clientId})`);
    }

    // 2) AdAccount
    const existingAccount = await pgClient.query(
      `SELECT id FROM ad_accounts WHERE "clientId" = $1 AND "metaAdAccountId" = $2`,
      [clientId, spec.adAccountId]
    );
    let adAccountId;
    if (existingAccount.rows.length > 0) {
      adAccountId = existingAccount.rows[0].id;
    } else {
      adAccountId = randomUUID();
      await pgClient.query(
        `INSERT INTO ad_accounts (id, "createdAt", "updatedAt", "clientId", "metaAdAccountId", label)
         VALUES ($1, now(), now(), $2, $3, $4)`,
        [adAccountId, clientId, spec.adAccountId, spec.label]
      );
    }

    // 3) ClientMetaSettings — syncEnabled=false para não entrar no cron de sync real da Meta
    await pgClient.query(
      `INSERT INTO client_meta_settings ("clientId", "syncEnabled", "defaultClientMetric", "defaultDashboardMetrics")
       VALUES ($1, false, 'roas', $2::jsonb)
       ON CONFLICT ("clientId") DO UPDATE SET "syncEnabled" = false`,
      [clientId, JSON.stringify(["spend", "conversions"])]
    );

    // 4) Métricas diárias
    const campRows = [];
    const adRows = [];
    const acctRowsByDay = new Map();

    for (const camp of spec.campaigns) {
      for (let d = 0; d < DAYS; d++) {
        const day = computeCampaignDay(spec, camp, d, rng);
        if (!day) continue;
        const dayStr = dateStr(dateForIndex(d));

        campRows.push([
          adAccountId,
          camp.key,
          camp.name,
          dayStr,
          day.spend.toFixed(2),
          String(day.impressions),
          String(day.clicks),
          day.ctr.toFixed(4),
          day.cpc.toFixed(4),
          String(day.conversions),
          String(day.leads),
          String(day.reach),
          String(day.messages),
          day.roas.toFixed(4),
          String(day.dailyBudget),
          day.campaignStatus
        ]);

        const adsetDays = splitAdset(day, camp.adsets, rng);
        adsetDays.forEach((ad, idx) => {
          const adsetId = `${camp.key}__adset${idx + 1}`;
          adRows.push([
            adAccountId,
            camp.key,
            adsetId,
            `${adsetId}__ad1`,
            ad.name,
            "Anúncio Principal",
            dayStr,
            ad.spend.toFixed(2),
            String(ad.impressions),
            String(ad.clicks),
            ad.ctr.toFixed(4),
            ad.cpc.toFixed(4),
            String(ad.conversions),
            String(ad.leads),
            String(ad.reach),
            String(ad.messages),
            ad.roas.toFixed(4)
          ]);
        });

        const acc = acctRowsByDay.get(dayStr) ?? {
          spend: 0,
          impressions: 0,
          clicks: 0,
          conversions: 0,
          reach: 0,
          messages: 0,
          roasWeighted: 0
        };
        acc.spend += day.spend;
        acc.impressions += day.impressions;
        acc.clicks += day.clicks;
        acc.conversions += day.conversions;
        acc.reach += day.reach;
        acc.messages += day.messages;
        acc.roasWeighted += day.roas * day.spend;
        acctRowsByDay.set(dayStr, acc);
      }
    }

    const metricRows = [...acctRowsByDay.entries()].map(([dayStr, acc]) => {
      const ctr = acc.impressions > 0 ? (acc.clicks / acc.impressions) * 100 : 0;
      const cpc = acc.clicks > 0 ? acc.spend / acc.clicks : 0;
      const roas = acc.spend > 0 ? acc.roasWeighted / acc.spend : 0;
      const reach = Math.round(acc.reach * 0.85); // dedup aproximado entre campanhas
      return [
        adAccountId,
        dayStr,
        acc.spend.toFixed(2),
        String(Math.round(acc.impressions)),
        String(Math.round(acc.clicks)),
        ctr.toFixed(4),
        cpc.toFixed(4),
        String(Math.round(acc.conversions)),
        String(reach),
        String(Math.round(acc.messages)),
        roas.toFixed(4)
      ];
    });

    const campInserted = await bulkInsert(
      pgClient,
      "campaign_metric_snapshots",
      [
        "adAccountId",
        "metaCampaignId",
        "campaignName",
        "day",
        "spend",
        "impressions",
        "clicks",
        "ctr",
        "cpc",
        "conversions",
        "leads",
        "reach",
        "messages",
        "roas",
        "dailyBudget",
        "campaignStatus"
      ],
      campRows,
      ["adAccountId", "metaCampaignId", "day"]
    );

    const adInserted = await bulkInsert(
      pgClient,
      "ad_metric_snapshots",
      [
        "adAccountId",
        "metaCampaignId",
        "metaAdsetId",
        "metaAdId",
        "adsetName",
        "adName",
        "day",
        "spend",
        "impressions",
        "clicks",
        "ctr",
        "cpc",
        "conversions",
        "leads",
        "reach",
        "messages",
        "roas"
      ],
      adRows,
      ["adAccountId", "metaAdsetId", "metaAdId", "day"]
    );

    const metricInserted = await bulkInsert(
      pgClient,
      "metric_snapshots",
      ["adAccountId", "day", "spend", "impressions", "clicks", "ctr", "cpc", "conversions", "reach", "messages", "roas"],
      metricRows,
      ["adAccountId", "day"]
    );

    summary.push({
      client: spec.name,
      clientId,
      adAccountId,
      campaignRows: campInserted,
      adsetRows: adInserted,
      accountDayRows: metricInserted
    });
  }

  console.log("\nResumo:");
  for (const s of summary) {
    console.log(
      `- ${s.client}: cliente=${s.clientId} | conta=${s.adAccountId} | campanhas/dia=${s.campaignRows} | conjuntos/dia=${s.adsetRows} | conta/dia=${s.accountDayRows}`
    );
  }

  await pgClient.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

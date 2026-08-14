import "dotenv/config";
import pg from "pg";
import { randomUUID } from "crypto";
import { pathToFileURL } from "url";

/**
 * Popula o workspace de demonstração com 9 clientes fictícios, cada um com
 * campanhas, conjuntos e VÁRIOS anúncios por conjunto (necessário para o
 * ranking de criativos ter o que ordenar).
 *
 * Uso:
 *   node scripts/seed-demo-agency-clients.mjs                 # detecta o tenant demo
 *   node scripts/seed-demo-agency-clients.mjs --tenant=<uuid> # tenant explícito
 *   node scripts/seed-demo-agency-clients.mjs --dry-run       # só mostra o plano
 *
 * As métricas das contas demo (`act_demo_*`) são REGERADAS do zero a cada
 * execução para que conta, campanha e anúncio fechem entre si. Nenhuma conta
 * real é tocada: o filtro é `metaAdAccountId ILIKE '%demo%'` dentro do tenant.
 */

const args = process.argv.slice(2);
const argTenant = args.find((a) => a.startsWith("--tenant="))?.slice("--tenant=".length);
const DRY_RUN = args.includes("--dry-run");

export const DAYS = 210; // ~7 meses
const END_DATE = (() => {
  const explicit = args.find((a) => a.startsWith("--end="))?.slice("--end=".length);
  if (explicit) return new Date(`${explicit}T00:00:00.000Z`);
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - 1));
})();

export function mulberry32(seed) {
  return function rng() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function dateStr(d) {
  return d.toISOString().slice(0, 10);
}
function addDays(d, n) {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}
const START_DATE = addDays(END_DATE, -(DAYS - 1));
export function dateForIndex(i) {
  return addDays(START_DATE, i);
}
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
function round2(v) {
  return Math.round(v * 100) / 100;
}
export function slug(name) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------
// campanha.preset -> agrupamento do ranking de criativos:
//   sales (ROAS), lead_site (CPA), lead_whatsapp (custo por mensagem), reach (CPM)
// campanha.creatives -> pool de criativos; cada conjunto roda um subconjunto.
//   from/to = dias após o início da campanha em que o criativo ficou no ar.

export const CLIENTS = [
  {
    key: "doutor-a",
    name: "Doutor A (Clínica de Estética)",
    previousNames: ["Doutor A — Clínica de Estética"],
    niche: "clinica",
    adAccountId: "act_demo_doutor_a",
    label: "Conta Demo: Doutor A (Clínica de Estética)",
    avgTicket: 850,
    closeRate: 0.22,
    seed: 1001,
    campaigns: [
      {
        key: "captacao-avaliacao",
        name: "Captação de Leads | Avaliação Facial Gratuita",
        objective: "leads",
        preset: "lead_site",
        startOffset: 0,
        rampDays: 10,
        baseSpend: 42,
        endMultiplier: 2.3,
        cpmBase: 34,
        ctrBase: 0.016,
        ctrGrowth: 0.2,
        convBase: 0.045,
        convGrowth: 0.35,
        creatives: [
          { name: "Antes e Depois | Carrossel", ctrAdj: 1.28, convAdj: 1.22, cpmAdj: 0.95, w: 1.2 },
          { name: "Vídeo 15s | Bastidores da Clínica", ctrAdj: 1.12, convAdj: 1.05, cpmAdj: 1.02, w: 1 },
          { name: "Depoimento de Paciente | Reels", ctrAdj: 1.05, convAdj: 1.14, cpmAdj: 1.0, w: 1, from: 40 },
          { name: "Oferta Avaliação Gratuita | Estático", ctrAdj: 0.82, convAdj: 0.88, cpmAdj: 1.06, w: 0.9 },
          { name: "Institucional da Clínica | Estático", ctrAdj: 0.64, convAdj: 0.7, cpmAdj: 1.12, w: 0.8, to: 95 }
        ],
        adsets: [
          {
            name: "Público Frio | Mulheres 25-45",
            weight: 0.6,
            cpmAdj: 1.05,
            ctrAdj: 0.9,
            convAdj: 0.9,
            ads: ["Antes e Depois | Carrossel", "Oferta Avaliação Gratuita | Estático", "Institucional da Clínica | Estático"]
          },
          {
            name: "Interesses | Estética e Beleza",
            weight: 0.4,
            cpmAdj: 0.95,
            ctrAdj: 1.15,
            convAdj: 1.1,
            ads: ["Antes e Depois | Carrossel", "Vídeo 15s | Bastidores da Clínica", "Depoimento de Paciente | Reels"]
          }
        ]
      },
      {
        key: "remarketing-orcamento",
        name: "Remarketing | Fechamento de Orçamento",
        objective: "conversions",
        preset: "lead_site",
        startOffset: 45,
        rampDays: 7,
        baseSpend: 22,
        endMultiplier: 1.8,
        cpmBase: 24,
        ctrBase: 0.028,
        ctrGrowth: 0.15,
        convBase: 0.09,
        convGrowth: 0.2,
        creatives: [
          { name: "Parcelamento em 12x | Estático", ctrAdj: 1.2, convAdj: 1.25, cpmAdj: 0.96, w: 1.1 },
          { name: "Lembrete de Orçamento | Vídeo", ctrAdj: 1.04, convAdj: 1.0, cpmAdj: 1.0, w: 1 },
          { name: "Prova Social | Carrossel de Resultados", ctrAdj: 0.9, convAdj: 0.94, cpmAdj: 1.04, w: 0.9 }
        ],
        adsets: [
          {
            name: "Remarketing | Visitantes do Site",
            weight: 0.55,
            cpmAdj: 1.0,
            ctrAdj: 1.0,
            convAdj: 1.0,
            ads: ["Parcelamento em 12x | Estático", "Lembrete de Orçamento | Vídeo", "Prova Social | Carrossel de Resultados"]
          },
          {
            name: "Lookalike 1% | Clientes",
            weight: 0.45,
            cpmAdj: 1.1,
            ctrAdj: 0.95,
            convAdj: 1.05,
            ads: ["Parcelamento em 12x | Estático", "Prova Social | Carrossel de Resultados"]
          }
        ]
      },
      {
        key: "lancamento-harmonizacao",
        name: "Lançamento | Harmonização Facial Premium",
        objective: "leads",
        preset: "lead_whatsapp",
        startOffset: 118,
        rampDays: 12,
        baseSpend: 55,
        endMultiplier: 1.6,
        cpmBase: 38,
        ctrBase: 0.018,
        ctrGrowth: 0.1,
        convBase: 0.05,
        convGrowth: 0.15,
        messageHeavy: true,
        creatives: [
          { name: "Harmonização Premium | Vídeo do Procedimento", ctrAdj: 1.22, convAdj: 1.18, cpmAdj: 0.98, w: 1.2 },
          { name: "Chame no WhatsApp | Estático Premium", ctrAdj: 1.06, convAdj: 1.1, cpmAdj: 1.0, w: 1 },
          { name: "Resultados Naturais | Carrossel", ctrAdj: 0.88, convAdj: 0.9, cpmAdj: 1.05, w: 0.9 }
        ],
        adsets: [
          {
            name: "Público Frio | Interesses Premium",
            weight: 0.5,
            cpmAdj: 1.0,
            ctrAdj: 1.0,
            convAdj: 1.0,
            ads: ["Harmonização Premium | Vídeo do Procedimento", "Resultados Naturais | Carrossel"]
          },
          {
            name: "Lookalike | Compradoras Alto Ticket",
            weight: 0.5,
            cpmAdj: 1.05,
            ctrAdj: 1.05,
            convAdj: 1.05,
            ads: ["Harmonização Premium | Vídeo do Procedimento", "Chame no WhatsApp | Estático Premium", "Resultados Naturais | Carrossel"]
          }
        ]
      }
    ]
  },
  {
    key: "cliente-b",
    name: "Cliente B (Clínica de Estética)",
    previousNames: ["Cliente B — Clínica de Estética"],
    niche: "clinica",
    adAccountId: "act_demo_cliente_b",
    label: "Conta Demo: Cliente B (Clínica de Estética)",
    avgTicket: 620,
    closeRate: 0.2,
    seed: 2002,
    campaigns: [
      {
        key: "captacao-corporal",
        name: "Captação de Leads | Avaliação Corporal",
        objective: "leads",
        preset: "lead_site",
        startOffset: 0,
        rampDays: 10,
        baseSpend: 28,
        endMultiplier: 2.6,
        cpmBase: 30,
        ctrBase: 0.015,
        ctrGrowth: 0.2,
        convBase: 0.04,
        convGrowth: 0.3,
        creatives: [
          { name: "Foto de Resultado Real | Estático", ctrAdj: 1.26, convAdj: 1.2, cpmAdj: 0.96, w: 1.2 },
          { name: "Pacote 10 Sessões | Carrossel", ctrAdj: 1.1, convAdj: 1.16, cpmAdj: 1.0, w: 1.1 },
          { name: "Depoimento em Texto | Estático", ctrAdj: 0.72, convAdj: 0.76, cpmAdj: 1.08, w: 0.85 },
          { name: "Tour pela Sala de Avaliação | Reels", ctrAdj: 1.02, convAdj: 0.98, cpmAdj: 1.02, w: 0.95, from: 55 }
        ],
        adsets: [
          {
            name: "Público Frio | Mulheres 22-40",
            weight: 0.65,
            cpmAdj: 1.0,
            ctrAdj: 0.9,
            convAdj: 0.9,
            ads: ["Foto de Resultado Real | Estático", "Depoimento em Texto | Estático", "Tour pela Sala de Avaliação | Reels"]
          },
          {
            name: "Interesses | Emagrecimento",
            weight: 0.35,
            cpmAdj: 0.95,
            ctrAdj: 1.15,
            convAdj: 1.1,
            ads: ["Foto de Resultado Real | Estático", "Pacote 10 Sessões | Carrossel"]
          }
        ]
      },
      {
        key: "promo-drenagem",
        name: "Promoção | Drenagem Linfática",
        objective: "conversions",
        preset: "lead_whatsapp",
        startOffset: 50,
        rampDays: 6,
        baseSpend: 16,
        endMultiplier: 1.7,
        cpmBase: 22,
        ctrBase: 0.026,
        ctrGrowth: 0.12,
        convBase: 0.08,
        convGrowth: 0.18,
        messageHeavy: true,
        creatives: [
          { name: "Drenagem 30% Off | Estático", ctrAdj: 1.14, convAdj: 1.12, cpmAdj: 0.98, w: 1.1 },
          { name: "Drenagem 50% Off | Estático", ctrAdj: 1.3, convAdj: 0.78, cpmAdj: 0.94, w: 1.05, to: 120 },
          { name: "Como Funciona a Sessão | Vídeo", ctrAdj: 0.95, convAdj: 1.06, cpmAdj: 1.02, w: 0.95 }
        ],
        adsets: [
          {
            name: "Remarketing | Visitantes do Site",
            weight: 0.5,
            cpmAdj: 1.0,
            ctrAdj: 1.0,
            convAdj: 1.0,
            ads: ["Drenagem 30% Off | Estático", "Drenagem 50% Off | Estático", "Como Funciona a Sessão | Vídeo"]
          },
          {
            name: "Lookalike 1% | Clientes",
            weight: 0.5,
            cpmAdj: 1.05,
            ctrAdj: 1.0,
            convAdj: 1.0,
            ads: ["Drenagem 30% Off | Estático", "Como Funciona a Sessão | Vídeo"]
          }
        ]
      },
      {
        key: "nova-unidade-crio",
        name: "Nova Unidade | Pacotes Criolipólise",
        objective: "leads",
        preset: "lead_site",
        startOffset: 108,
        rampDays: 14,
        baseSpend: 20,
        endMultiplier: 2.0,
        cpmBase: 32,
        ctrBase: 0.017,
        ctrGrowth: 0.15,
        convBase: 0.045,
        convGrowth: 0.2,
        creatives: [
          { name: "Nova Unidade | Vídeo da Estrutura", ctrAdj: 1.24, convAdj: 1.2, cpmAdj: 0.97, w: 1.2 },
          { name: "Criolipólise | Antes e Depois", ctrAdj: 1.08, convAdj: 1.05, cpmAdj: 1.0, w: 1 },
          { name: "Inauguração com Brinde | Estático", ctrAdj: 0.86, convAdj: 0.82, cpmAdj: 1.06, w: 0.9 }
        ],
        adsets: [
          {
            name: "Público Frio | Região da Unidade",
            weight: 0.6,
            cpmAdj: 1.0,
            ctrAdj: 1.0,
            convAdj: 1.0,
            ads: ["Nova Unidade | Vídeo da Estrutura", "Inauguração com Brinde | Estático"]
          },
          {
            name: "Interesses | Estética Corporal",
            weight: 0.4,
            cpmAdj: 0.95,
            ctrAdj: 1.05,
            convAdj: 1.05,
            ads: ["Nova Unidade | Vídeo da Estrutura", "Criolipólise | Antes e Depois", "Inauguração com Brinde | Estático"]
          }
        ]
      }
    ]
  },
  {
    key: "cliente-c",
    name: "Cliente C (Climatização e Ar Condicionado)",
    previousNames: ["Cliente C — Climatização e Ar Condicionado"],
    niche: "outro",
    adAccountId: "act_demo_cliente_c",
    label: "Conta Demo: Cliente C (Ar Condicionado)",
    avgTicket: 680,
    closeRate: 0.28,
    seed: 3003,
    campaigns: [
      {
        key: "instalacao-local",
        name: "Instalação de Ar Condicionado | Captação Local",
        objective: "leads",
        preset: "lead_whatsapp",
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
        messageHeavy: true,
        creatives: [
          { name: "Instalação a partir de R$450 | Estático", ctrAdj: 1.3, convAdj: 1.24, cpmAdj: 0.94, w: 1.25 },
          { name: "Instalação Passo a Passo | Vídeo", ctrAdj: 1.1, convAdj: 1.08, cpmAdj: 1.0, w: 1.05 },
          { name: "Orçamento no WhatsApp | Estático", ctrAdj: 1.0, convAdj: 1.12, cpmAdj: 1.0, w: 1 },
          { name: "Peça seu Orçamento | Genérico", ctrAdj: 0.68, convAdj: 0.72, cpmAdj: 1.1, w: 0.85, to: 130 }
        ],
        adsets: [
          {
            name: "Público Frio | Raio 10km",
            weight: 0.65,
            cpmAdj: 1.0,
            ctrAdj: 0.95,
            convAdj: 0.95,
            ads: ["Instalação a partir de R$450 | Estático", "Orçamento no WhatsApp | Estático", "Peça seu Orçamento | Genérico"]
          },
          {
            name: "Interesses | Reforma e Climatização",
            weight: 0.35,
            cpmAdj: 0.9,
            ctrAdj: 1.1,
            convAdj: 1.1,
            ads: ["Instalação a partir de R$450 | Estático", "Instalação Passo a Passo | Vídeo"]
          }
        ]
      },
      {
        key: "contratos-pj",
        name: "Manutenção Preventiva | Contratos PJ",
        objective: "leads",
        preset: "lead_site",
        startOffset: 40,
        rampDays: 10,
        baseSpend: 70,
        endMultiplier: 2.4,
        cpmBase: 32,
        ctrBase: 0.013,
        ctrGrowth: 0.2,
        convBase: 0.03,
        convGrowth: 0.25,
        creatives: [
          { name: "Contrato PJ | Checklist de Manutenção", ctrAdj: 1.2, convAdj: 1.22, cpmAdj: 0.97, w: 1.15 },
          { name: "Condomínios Atendidos | Carrossel", ctrAdj: 1.04, convAdj: 1.06, cpmAdj: 1.0, w: 1 },
          { name: "6 Meses de Manutenção Grátis | Estático", ctrAdj: 1.12, convAdj: 1.14, cpmAdj: 1.0, w: 1, from: 60 },
          { name: "Institucional B2B | Estático", ctrAdj: 0.7, convAdj: 0.74, cpmAdj: 1.1, w: 0.85 }
        ],
        adsets: [
          {
            name: "Público Frio | Empresas e Condomínios",
            weight: 0.6,
            cpmAdj: 1.05,
            ctrAdj: 1.0,
            convAdj: 1.0,
            ads: ["Contrato PJ | Checklist de Manutenção", "Institucional B2B | Estático", "6 Meses de Manutenção Grátis | Estático"]
          },
          {
            name: "Remarketing | Site e Formulário",
            weight: 0.4,
            cpmAdj: 0.95,
            ctrAdj: 1.2,
            convAdj: 1.15,
            ads: ["Contrato PJ | Checklist de Manutenção", "Condomínios Atendidos | Carrossel"]
          }
        ]
      },
      {
        key: "black-week-clima",
        name: "Black Week Climatização | Promoção de Instalação",
        objective: "conversions",
        preset: "sales",
        startOffset: 130,
        rampDays: 5,
        baseSpend: 110,
        endMultiplier: 1.9,
        cpmBase: 28,
        ctrBase: 0.02,
        ctrGrowth: 0.1,
        convBase: 0.022,
        convGrowth: 0.1,
        creatives: [
          { name: "Black Week | Contagem Regressiva", ctrAdj: 1.26, convAdj: 1.2, cpmAdj: 0.95, w: 1.2 },
          { name: "Black Week | Comparativo de Preço", ctrAdj: 1.08, convAdj: 1.1, cpmAdj: 1.0, w: 1.05 },
          { name: "Black Week | Estático Simples", ctrAdj: 0.8, convAdj: 0.84, cpmAdj: 1.08, w: 0.9 }
        ],
        adsets: [
          {
            name: "Público Frio | Promoção Geral",
            weight: 0.55,
            cpmAdj: 1.0,
            ctrAdj: 1.0,
            convAdj: 1.0,
            ads: ["Black Week | Contagem Regressiva", "Black Week | Estático Simples"]
          },
          {
            name: "Remarketing | Carrinho de Orçamento",
            weight: 0.45,
            cpmAdj: 1.0,
            ctrAdj: 1.1,
            convAdj: 1.1,
            ads: ["Black Week | Contagem Regressiva", "Black Week | Comparativo de Preço", "Black Week | Estático Simples"]
          }
        ]
      }
    ]
  },
  {
    key: "cliente-d",
    name: "Cliente D (Academia em Rede)",
    previousNames: ["Cliente D — Academia (Rede)"],
    niche: "outro",
    adAccountId: "act_demo_cliente_d",
    label: "Conta Demo: Cliente D (Academia em Rede)",
    avgTicket: 1150,
    closeRate: 0.18,
    seed: 4004,
    campaigns: [
      {
        key: "matriculas-centro",
        name: "Matrículas | Unidade Centro",
        objective: "leads",
        preset: "lead_site",
        startOffset: 0,
        rampDays: 10,
        baseSpend: 70,
        endMultiplier: 2.0,
        cpmBase: 20,
        ctrBase: 0.02,
        ctrGrowth: 0.15,
        convBase: 0.05,
        convGrowth: 0.2,
        creatives: [
          { name: "Tour pela Estrutura | Vídeo", ctrAdj: 1.32, convAdj: 1.26, cpmAdj: 0.93, w: 1.3 },
          { name: "Primeira Semana Grátis | Estático", ctrAdj: 1.16, convAdj: 1.2, cpmAdj: 0.98, w: 1.15 },
          { name: "Depoimento de Aluno | Reels", ctrAdj: 1.05, convAdj: 1.08, cpmAdj: 1.0, w: 1, from: 45 },
          { name: "Equipamentos da Academia | Foto", ctrAdj: 0.66, convAdj: 0.7, cpmAdj: 1.12, w: 0.85, to: 110 }
        ],
        adsets: [
          {
            name: "Público Frio | Raio 5km",
            weight: 0.6,
            cpmAdj: 1.0,
            ctrAdj: 0.95,
            convAdj: 0.9,
            ads: ["Tour pela Estrutura | Vídeo", "Primeira Semana Grátis | Estático", "Equipamentos da Academia | Foto"]
          },
          {
            name: "Interesses | Fitness e Saúde",
            weight: 0.4,
            cpmAdj: 0.9,
            ctrAdj: 1.1,
            convAdj: 1.1,
            ads: ["Tour pela Estrutura | Vídeo", "Depoimento de Aluno | Reels", "Equipamentos da Academia | Foto"]
          }
        ]
      },
      {
        key: "matriculas-zona-sul",
        name: "Matrículas | Unidade Zona Sul",
        objective: "leads",
        preset: "lead_site",
        startOffset: 35,
        rampDays: 10,
        baseSpend: 55,
        endMultiplier: 2.2,
        cpmBase: 21,
        ctrBase: 0.019,
        ctrGrowth: 0.18,
        convBase: 0.048,
        convGrowth: 0.22,
        creatives: [
          { name: "Tour pela Estrutura | Vídeo", ctrAdj: 1.3, convAdj: 1.24, cpmAdj: 0.94, w: 1.25 },
          { name: "Taxa de Matrícula Zerada | Estático", ctrAdj: 1.14, convAdj: 1.02, cpmAdj: 0.99, w: 1.05 },
          { name: "Aula Experimental | Carrossel", ctrAdj: 0.92, convAdj: 0.96, cpmAdj: 1.04, w: 0.95 }
        ],
        adsets: [
          {
            name: "Público Frio | Raio 5km",
            weight: 0.6,
            cpmAdj: 1.0,
            ctrAdj: 1.0,
            convAdj: 1.0,
            ads: ["Tour pela Estrutura | Vídeo", "Taxa de Matrícula Zerada | Estático"]
          },
          {
            name: "Lookalike 1% | Alunos Ativos",
            weight: 0.4,
            cpmAdj: 1.0,
            ctrAdj: 1.1,
            convAdj: 1.1,
            ads: ["Tour pela Estrutura | Vídeo", "Aula Experimental | Carrossel", "Taxa de Matrícula Zerada | Estático"]
          }
        ]
      },
      {
        key: "inauguracao-zona-norte",
        name: "Inauguração | Unidade Zona Norte",
        objective: "conversions",
        preset: "reach",
        startOffset: 100,
        rampDays: 20,
        baseSpend: 60,
        endMultiplier: 2.8,
        cpmBase: 23,
        ctrBase: 0.022,
        ctrGrowth: 0.15,
        convBase: 0.055,
        convGrowth: 0.15,
        creatives: [
          { name: "Inauguração | Vídeo de Abertura", ctrAdj: 1.22, convAdj: 1.16, cpmAdj: 0.92, w: 1.2 },
          { name: "Vagas Limitadas | Estático", ctrAdj: 1.06, convAdj: 1.1, cpmAdj: 0.98, w: 1.05 },
          { name: "Conheça a Nova Unidade | Carrossel", ctrAdj: 0.9, convAdj: 0.92, cpmAdj: 1.05, w: 0.95 }
        ],
        adsets: [
          {
            name: "Público Frio | Raio 5km Nova Unidade",
            weight: 0.55,
            cpmAdj: 1.0,
            ctrAdj: 1.0,
            convAdj: 1.0,
            ads: ["Inauguração | Vídeo de Abertura", "Conheça a Nova Unidade | Carrossel"]
          },
          {
            name: "Oferta de Inauguração | Geral",
            weight: 0.45,
            cpmAdj: 0.95,
            ctrAdj: 1.15,
            convAdj: 1.2,
            ads: ["Inauguração | Vídeo de Abertura", "Vagas Limitadas | Estático", "Conheça a Nova Unidade | Carrossel"]
          }
        ]
      }
    ]
  },
  {
    key: "cliente-e",
    name: "Cliente E (Odontologia e Implantes)",
    niche: "clinica",
    adAccountId: "act_demo_cliente_e",
    label: "Conta Demo: Cliente E (Odontologia)",
    avgTicket: 3200,
    closeRate: 0.12,
    seed: 5005,
    campaigns: [
      {
        key: "implantes-avaliacao",
        name: "Implantes | Avaliação com Raio-X Gratuito",
        objective: "leads",
        preset: "lead_site",
        startOffset: 0,
        rampDays: 12,
        baseSpend: 130,
        endMultiplier: 2.2,
        cpmBase: 36,
        ctrBase: 0.014,
        ctrGrowth: 0.22,
        convBase: 0.014,
        convGrowth: 0.3,
        creatives: [
          { name: "Sorriso Recuperado | Antes e Depois", ctrAdj: 1.34, convAdj: 1.28, cpmAdj: 0.94, w: 1.3 },
          { name: "Como É o Implante | Vídeo Explicativo", ctrAdj: 1.1, convAdj: 1.12, cpmAdj: 1.0, w: 1.05 },
          { name: "Raio-X Gratuito | Estático", ctrAdj: 0.96, convAdj: 1.04, cpmAdj: 1.02, w: 1 },
          { name: "Consultório Moderno | Foto", ctrAdj: 0.62, convAdj: 0.68, cpmAdj: 1.14, w: 0.8, to: 120 }
        ],
        adsets: [
          {
            name: "Público Frio | Adultos 35-60",
            weight: 0.6,
            cpmAdj: 1.04,
            ctrAdj: 0.92,
            convAdj: 0.92,
            ads: ["Sorriso Recuperado | Antes e Depois", "Raio-X Gratuito | Estático", "Consultório Moderno | Foto"]
          },
          {
            name: "Interesses | Saúde Bucal e Prótese",
            weight: 0.4,
            cpmAdj: 0.96,
            ctrAdj: 1.12,
            convAdj: 1.12,
            ads: ["Sorriso Recuperado | Antes e Depois", "Como É o Implante | Vídeo Explicativo"]
          }
        ]
      },
      {
        key: "clareamento-whatsapp",
        name: "Clareamento Dental | Atendimento no WhatsApp",
        objective: "leads",
        preset: "lead_whatsapp",
        startOffset: 55,
        rampDays: 8,
        baseSpend: 24,
        endMultiplier: 1.9,
        cpmBase: 25,
        ctrBase: 0.024,
        ctrGrowth: 0.14,
        convBase: 0.075,
        convGrowth: 0.2,
        messageHeavy: true,
        creatives: [
          { name: "Clareamento em 1 Sessão | Vídeo", ctrAdj: 1.24, convAdj: 1.18, cpmAdj: 0.96, w: 1.2 },
          { name: "Fale com a Recepção | Estático", ctrAdj: 1.02, convAdj: 1.1, cpmAdj: 1.0, w: 1 },
          { name: "Tabela de Preços | Carrossel", ctrAdj: 0.88, convAdj: 0.94, cpmAdj: 1.05, w: 0.92 }
        ],
        adsets: [
          {
            name: "Público Frio | Raio 8km",
            weight: 0.55,
            cpmAdj: 1.0,
            ctrAdj: 1.0,
            convAdj: 1.0,
            ads: ["Clareamento em 1 Sessão | Vídeo", "Fale com a Recepção | Estático", "Tabela de Preços | Carrossel"]
          },
          {
            name: "Remarketing | Visitantes do Site",
            weight: 0.45,
            cpmAdj: 0.94,
            ctrAdj: 1.18,
            convAdj: 1.14,
            ads: ["Clareamento em 1 Sessão | Vídeo", "Fale com a Recepção | Estático"]
          }
        ]
      },
      {
        key: "ortodontia-invisivel",
        name: "Ortodontia Invisível | Captação Premium",
        objective: "leads",
        preset: "lead_site",
        startOffset: 125,
        rampDays: 14,
        baseSpend: 34,
        endMultiplier: 1.7,
        cpmBase: 40,
        ctrBase: 0.016,
        ctrGrowth: 0.12,
        convBase: 0.04,
        convGrowth: 0.18,
        creatives: [
          { name: "Alinhador Invisível | Vídeo do Passo a Passo", ctrAdj: 1.2, convAdj: 1.2, cpmAdj: 0.97, w: 1.2 },
          { name: "Simulação do Sorriso Final | Carrossel", ctrAdj: 1.08, convAdj: 1.06, cpmAdj: 1.0, w: 1.05 },
          { name: "Parcelamento sem Juros | Estático", ctrAdj: 0.94, convAdj: 0.98, cpmAdj: 1.03, w: 0.95 }
        ],
        adsets: [
          {
            name: "Público Frio | Alta Renda 25-45",
            weight: 0.55,
            cpmAdj: 1.05,
            ctrAdj: 1.0,
            convAdj: 1.0,
            ads: ["Alinhador Invisível | Vídeo do Passo a Passo", "Parcelamento sem Juros | Estático"]
          },
          {
            name: "Lookalike 1% | Pacientes",
            weight: 0.45,
            cpmAdj: 1.0,
            ctrAdj: 1.08,
            convAdj: 1.1,
            ads: ["Alinhador Invisível | Vídeo do Passo a Passo", "Simulação do Sorriso Final | Carrossel", "Parcelamento sem Juros | Estático"]
          }
        ]
      }
    ]
  },
  {
    key: "cliente-f",
    name: "Cliente F (Imobiliária de Lançamentos)",
    niche: "imobiliaria",
    adAccountId: "act_demo_cliente_f",
    label: "Conta Demo: Cliente F (Imobiliária)",
    avgTicket: 9800,
    closeRate: 0.05,
    seed: 6006,
    campaigns: [
      {
        key: "lancamento-torre-a",
        name: "Lançamento | Torre A (2 e 3 dormitórios)",
        objective: "leads",
        preset: "lead_site",
        startOffset: 0,
        rampDays: 14,
        baseSpend: 150,
        endMultiplier: 1.9,
        cpmBase: 28,
        ctrBase: 0.013,
        ctrGrowth: 0.2,
        convBase: 0.018,
        convGrowth: 0.28,
        creatives: [
          { name: "Tour Virtual do Decorado | Vídeo", ctrAdj: 1.36, convAdj: 1.3, cpmAdj: 0.92, w: 1.35 },
          { name: "Plantas e Metragens | Carrossel", ctrAdj: 1.12, convAdj: 1.14, cpmAdj: 0.99, w: 1.1 },
          { name: "Entrada Facilitada | Estático", ctrAdj: 0.98, convAdj: 1.02, cpmAdj: 1.02, w: 1 },
          { name: "Fachada do Empreendimento | Render", ctrAdj: 0.64, convAdj: 0.66, cpmAdj: 1.15, w: 0.8, to: 140 }
        ],
        adsets: [
          {
            name: "Público Frio | Região Metropolitana",
            weight: 0.6,
            cpmAdj: 1.02,
            ctrAdj: 0.94,
            convAdj: 0.92,
            ads: ["Tour Virtual do Decorado | Vídeo", "Entrada Facilitada | Estático", "Fachada do Empreendimento | Render"]
          },
          {
            name: "Interesses | Compra de Imóvel",
            weight: 0.4,
            cpmAdj: 0.96,
            ctrAdj: 1.14,
            convAdj: 1.14,
            ads: ["Tour Virtual do Decorado | Vídeo", "Plantas e Metragens | Carrossel"]
          }
        ]
      },
      {
        key: "carteira-remarketing",
        name: "Remarketing | Carteira de Interessados",
        objective: "conversions",
        preset: "lead_whatsapp",
        startOffset: 48,
        rampDays: 8,
        baseSpend: 34,
        endMultiplier: 1.8,
        cpmBase: 22,
        ctrBase: 0.03,
        ctrGrowth: 0.12,
        convBase: 0.085,
        convGrowth: 0.16,
        messageHeavy: true,
        creatives: [
          { name: "Últimas Unidades | Contagem", ctrAdj: 1.28, convAdj: 1.22, cpmAdj: 0.95, w: 1.25 },
          { name: "Fale com o Corretor | Estático", ctrAdj: 1.04, convAdj: 1.12, cpmAdj: 1.0, w: 1.05 },
          { name: "Condições do Mês | Carrossel", ctrAdj: 0.9, convAdj: 0.95, cpmAdj: 1.04, w: 0.95 }
        ],
        adsets: [
          {
            name: "Remarketing | Visitantes do Hotsite",
            weight: 0.55,
            cpmAdj: 1.0,
            ctrAdj: 1.0,
            convAdj: 1.0,
            ads: ["Últimas Unidades | Contagem", "Fale com o Corretor | Estático", "Condições do Mês | Carrossel"]
          },
          {
            name: "Lista de Leads | Público Personalizado",
            weight: 0.45,
            cpmAdj: 1.06,
            ctrAdj: 1.04,
            convAdj: 1.08,
            ads: ["Últimas Unidades | Contagem", "Fale com o Corretor | Estático"]
          }
        ]
      },
      {
        key: "marca-institucional",
        name: "Institucional | Reconhecimento da Marca",
        objective: "reach",
        preset: "reach",
        startOffset: 90,
        rampDays: 10,
        baseSpend: 26,
        endMultiplier: 1.4,
        cpmBase: 12,
        ctrBase: 0.009,
        ctrGrowth: 0.08,
        convBase: 0.012,
        convGrowth: 0.1,
        creatives: [
          { name: "30 Anos de Mercado | Vídeo Institucional", ctrAdj: 1.16, convAdj: 1.1, cpmAdj: 0.88, w: 1.2 },
          { name: "Empreendimentos Entregues | Carrossel", ctrAdj: 1.0, convAdj: 1.0, cpmAdj: 0.96, w: 1 },
          { name: "Logo e Slogan | Estático", ctrAdj: 0.74, convAdj: 0.8, cpmAdj: 1.1, w: 0.9 }
        ],
        adsets: [
          {
            name: "Alcance | Cidade Inteira",
            weight: 0.6,
            cpmAdj: 0.94,
            ctrAdj: 1.0,
            convAdj: 1.0,
            ads: ["30 Anos de Mercado | Vídeo Institucional", "Logo e Slogan | Estático"]
          },
          {
            name: "Alcance | Bairros Alvo",
            weight: 0.4,
            cpmAdj: 1.08,
            ctrAdj: 1.05,
            convAdj: 1.02,
            ads: ["30 Anos de Mercado | Vídeo Institucional", "Empreendimentos Entregues | Carrossel", "Logo e Slogan | Estático"]
          }
        ]
      }
    ]
  },
  {
    key: "cliente-g",
    name: "Cliente G (E-commerce de Moda)",
    niche: "ecommerce",
    adAccountId: "act_demo_cliente_g",
    label: "Conta Demo: Cliente G (E-commerce de Moda)",
    avgTicket: 245,
    closeRate: 0.3,
    seed: 7007,
    campaigns: [
      {
        key: "vendas-catalogo",
        name: "Vendas | Catálogo Coleção Nova",
        objective: "sales",
        preset: "sales",
        startOffset: 0,
        rampDays: 10,
        baseSpend: 120,
        endMultiplier: 2.4,
        cpmBase: 24,
        ctrBase: 0.019,
        ctrGrowth: 0.18,
        convBase: 0.028,
        convGrowth: 0.3,
        creatives: [
          { name: "Coleção Nova | Vídeo de Provador", ctrAdj: 1.3, convAdj: 1.28, cpmAdj: 0.93, w: 1.3 },
          { name: "Catálogo Dinâmico | Carrossel de Produtos", ctrAdj: 1.14, convAdj: 1.2, cpmAdj: 0.97, w: 1.2 },
          { name: "Frete Grátis Acima de R$199 | Estático", ctrAdj: 1.02, convAdj: 1.06, cpmAdj: 1.0, w: 1 },
          { name: "Modelo em Estúdio | Foto Única", ctrAdj: 0.7, convAdj: 0.72, cpmAdj: 1.1, w: 0.85, to: 125 }
        ],
        adsets: [
          {
            name: "Público Frio | Interesses Moda",
            weight: 0.55,
            cpmAdj: 1.02,
            ctrAdj: 0.94,
            convAdj: 0.9,
            ads: ["Coleção Nova | Vídeo de Provador", "Frete Grátis Acima de R$199 | Estático", "Modelo em Estúdio | Foto Única"]
          },
          {
            name: "Lookalike 2% | Compradores",
            weight: 0.45,
            cpmAdj: 0.98,
            ctrAdj: 1.12,
            convAdj: 1.16,
            ads: ["Coleção Nova | Vídeo de Provador", "Catálogo Dinâmico | Carrossel de Produtos"]
          }
        ]
      },
      {
        key: "remarketing-carrinho",
        name: "Remarketing | Carrinho Abandonado",
        objective: "sales",
        preset: "sales",
        startOffset: 30,
        rampDays: 6,
        baseSpend: 45,
        endMultiplier: 2.0,
        cpmBase: 18,
        ctrBase: 0.035,
        ctrGrowth: 0.12,
        convBase: 0.03,
        convGrowth: 0.2,
        creatives: [
          { name: "Seu Carrinho Te Espera | Dinâmico", ctrAdj: 1.32, convAdj: 1.34, cpmAdj: 0.94, w: 1.3 },
          { name: "Cupom de 10% | Estático", ctrAdj: 1.12, convAdj: 1.16, cpmAdj: 0.98, w: 1.1 },
          { name: "Avaliações de Clientes | Carrossel", ctrAdj: 0.94, convAdj: 1.0, cpmAdj: 1.02, w: 0.95 }
        ],
        adsets: [
          {
            name: "Carrinho Abandonado | 7 dias",
            weight: 0.6,
            cpmAdj: 0.96,
            ctrAdj: 1.08,
            convAdj: 1.12,
            ads: ["Seu Carrinho Te Espera | Dinâmico", "Cupom de 10% | Estático", "Avaliações de Clientes | Carrossel"]
          },
          {
            name: "Visualizou Produto | 14 dias",
            weight: 0.4,
            cpmAdj: 1.04,
            ctrAdj: 0.98,
            convAdj: 0.96,
            ads: ["Seu Carrinho Te Espera | Dinâmico", "Avaliações de Clientes | Carrossel"]
          }
        ]
      },
      {
        key: "promo-liquidacao",
        name: "Liquidação de Estação | Até 60% Off",
        objective: "sales",
        preset: "sales",
        startOffset: 138,
        rampDays: 5,
        baseSpend: 95,
        endMultiplier: 1.8,
        cpmBase: 22,
        ctrBase: 0.026,
        ctrGrowth: 0.1,
        convBase: 0.05,
        convGrowth: 0.12,
        creatives: [
          { name: "Liquidação | Vídeo com Preços na Tela", ctrAdj: 1.24, convAdj: 1.22, cpmAdj: 0.95, w: 1.25 },
          { name: "Liquidação | Carrossel de Ofertas", ctrAdj: 1.08, convAdj: 1.12, cpmAdj: 0.99, w: 1.05 },
          { name: "Liquidação | Banner Simples", ctrAdj: 0.78, convAdj: 0.8, cpmAdj: 1.08, w: 0.9 }
        ],
        adsets: [
          {
            name: "Base de Clientes | Público Personalizado",
            weight: 0.5,
            cpmAdj: 0.95,
            ctrAdj: 1.1,
            convAdj: 1.15,
            ads: ["Liquidação | Vídeo com Preços na Tela", "Liquidação | Carrossel de Ofertas"]
          },
          {
            name: "Público Frio | Ofertas e Descontos",
            weight: 0.5,
            cpmAdj: 1.05,
            ctrAdj: 0.96,
            convAdj: 0.92,
            ads: ["Liquidação | Vídeo com Preços na Tela", "Liquidação | Banner Simples", "Liquidação | Carrossel de Ofertas"]
          }
        ]
      }
    ]
  },
  {
    key: "cliente-h",
    name: "Cliente H (Pet Shop e Veterinária)",
    niche: "outro",
    adAccountId: "act_demo_cliente_h",
    label: "Conta Demo: Cliente H (Pet Shop e Veterinária)",
    avgTicket: 380,
    closeRate: 0.34,
    seed: 8008,
    campaigns: [
      {
        key: "banho-tosa-whatsapp",
        name: "Banho e Tosa | Agendamento no WhatsApp",
        objective: "leads",
        preset: "lead_whatsapp",
        startOffset: 0,
        rampDays: 8,
        baseSpend: 32,
        endMultiplier: 2.0,
        cpmBase: 19,
        ctrBase: 0.023,
        ctrGrowth: 0.16,
        convBase: 0.07,
        convGrowth: 0.22,
        messageHeavy: true,
        creatives: [
          { name: "Antes e Depois do Banho | Carrossel", ctrAdj: 1.34, convAdj: 1.26, cpmAdj: 0.93, w: 1.3 },
          { name: "Tosa Higiênica | Vídeo Rápido", ctrAdj: 1.12, convAdj: 1.1, cpmAdj: 0.99, w: 1.1 },
          { name: "Agende pelo WhatsApp | Estático", ctrAdj: 1.0, convAdj: 1.12, cpmAdj: 1.0, w: 1 },
          { name: "Fachada da Loja | Foto", ctrAdj: 0.66, convAdj: 0.7, cpmAdj: 1.12, w: 0.82, to: 115 }
        ],
        adsets: [
          {
            name: "Público Frio | Raio 6km",
            weight: 0.6,
            cpmAdj: 1.0,
            ctrAdj: 0.96,
            convAdj: 0.95,
            ads: ["Antes e Depois do Banho | Carrossel", "Agende pelo WhatsApp | Estático", "Fachada da Loja | Foto"]
          },
          {
            name: "Interesses | Tutores de Cães e Gatos",
            weight: 0.4,
            cpmAdj: 0.94,
            ctrAdj: 1.12,
            convAdj: 1.1,
            ads: ["Antes e Depois do Banho | Carrossel", "Tosa Higiênica | Vídeo Rápido"]
          }
        ]
      },
      {
        key: "consultas-veterinarias",
        name: "Consultas Veterinárias | Check-up Anual",
        objective: "leads",
        preset: "lead_site",
        startOffset: 42,
        rampDays: 10,
        baseSpend: 26,
        endMultiplier: 2.1,
        cpmBase: 24,
        ctrBase: 0.017,
        ctrGrowth: 0.18,
        convBase: 0.05,
        convGrowth: 0.24,
        creatives: [
          { name: "Check-up do Seu Pet | Vídeo da Veterinária", ctrAdj: 1.26, convAdj: 1.24, cpmAdj: 0.96, w: 1.25 },
          { name: "Vacinas em Dia | Carrossel", ctrAdj: 1.06, convAdj: 1.08, cpmAdj: 1.0, w: 1.05 },
          { name: "Consulta a partir de R$120 | Estático", ctrAdj: 0.98, convAdj: 1.04, cpmAdj: 1.01, w: 1 },
          { name: "Equipe da Clínica | Foto", ctrAdj: 0.72, convAdj: 0.76, cpmAdj: 1.1, w: 0.85 }
        ],
        adsets: [
          {
            name: "Público Frio | Raio 6km",
            weight: 0.55,
            cpmAdj: 1.0,
            ctrAdj: 1.0,
            convAdj: 1.0,
            ads: ["Check-up do Seu Pet | Vídeo da Veterinária", "Consulta a partir de R$120 | Estático", "Equipe da Clínica | Foto"]
          },
          {
            name: "Remarketing | Clientes do Banho e Tosa",
            weight: 0.45,
            cpmAdj: 0.92,
            ctrAdj: 1.2,
            convAdj: 1.18,
            ads: ["Check-up do Seu Pet | Vídeo da Veterinária", "Vacinas em Dia | Carrossel"]
          }
        ]
      },
      {
        key: "assinatura-racao",
        name: "Assinatura de Ração | Venda Recorrente",
        objective: "sales",
        preset: "sales",
        startOffset: 112,
        rampDays: 12,
        baseSpend: 30,
        endMultiplier: 2.2,
        cpmBase: 21,
        ctrBase: 0.021,
        ctrGrowth: 0.14,
        convBase: 0.028,
        convGrowth: 0.26,
        creatives: [
          { name: "Assinatura com 15% Off | Vídeo", ctrAdj: 1.22, convAdj: 1.26, cpmAdj: 0.96, w: 1.25 },
          { name: "Ração Entregue em Casa | Carrossel", ctrAdj: 1.06, convAdj: 1.08, cpmAdj: 1.0, w: 1.05 },
          { name: "Compare os Planos | Estático", ctrAdj: 0.88, convAdj: 0.92, cpmAdj: 1.05, w: 0.92 }
        ],
        adsets: [
          {
            name: "Base de Clientes | Público Personalizado",
            weight: 0.5,
            cpmAdj: 0.94,
            ctrAdj: 1.12,
            convAdj: 1.16,
            ads: ["Assinatura com 15% Off | Vídeo", "Ração Entregue em Casa | Carrossel"]
          },
          {
            name: "Lookalike 1% | Compradores",
            weight: 0.5,
            cpmAdj: 1.04,
            ctrAdj: 0.98,
            convAdj: 0.98,
            ads: ["Assinatura com 15% Off | Vídeo", "Compare os Planos | Estático", "Ração Entregue em Casa | Carrossel"]
          }
        ]
      }
    ]
  },
  {
    key: "cliente-i",
    name: "Cliente I (Curso Online de Idiomas)",
    niche: "educacao",
    adAccountId: "act_demo_cliente_i",
    label: "Conta Demo: Cliente I (Curso Online de Idiomas)",
    avgTicket: 1490,
    closeRate: 1,
    seed: 9009,
    campaigns: [
      {
        key: "captacao-aula-gratis",
        name: "Captação | Aula Gratuita de Inglês",
        objective: "leads",
        preset: "lead_site",
        startOffset: 0,
        rampDays: 10,
        baseSpend: 64,
        endMultiplier: 2.5,
        cpmBase: 22,
        ctrBase: 0.018,
        ctrGrowth: 0.22,
        convBase: 0.06,
        convGrowth: 0.3,
        creatives: [
          { name: "Aula Gratuita | Vídeo do Professor", ctrAdj: 1.3, convAdj: 1.3, cpmAdj: 0.94, w: 1.3 },
          { name: "Método em 3 Passos | Carrossel", ctrAdj: 1.1, convAdj: 1.12, cpmAdj: 0.99, w: 1.1 },
          { name: "Inscreva-se Grátis | Estático", ctrAdj: 0.96, convAdj: 1.02, cpmAdj: 1.02, w: 1 },
          { name: "Bandeiras e Idiomas | Genérico", ctrAdj: 0.66, convAdj: 0.7, cpmAdj: 1.12, w: 0.82, to: 100 }
        ],
        adsets: [
          {
            name: "Público Frio | Brasil 18-45",
            weight: 0.6,
            cpmAdj: 1.02,
            ctrAdj: 0.94,
            convAdj: 0.92,
            ads: ["Aula Gratuita | Vídeo do Professor", "Inscreva-se Grátis | Estático", "Bandeiras e Idiomas | Genérico"]
          },
          {
            name: "Interesses | Estudo de Idiomas",
            weight: 0.4,
            cpmAdj: 0.96,
            ctrAdj: 1.14,
            convAdj: 1.14,
            ads: ["Aula Gratuita | Vídeo do Professor", "Método em 3 Passos | Carrossel"]
          }
        ]
      },
      {
        key: "matricula-turma",
        name: "Matrículas | Turma Nova (Vendas)",
        objective: "sales",
        preset: "sales",
        startOffset: 62,
        rampDays: 8,
        baseSpend: 210,
        endMultiplier: 2.1,
        cpmBase: 26,
        ctrBase: 0.024,
        ctrGrowth: 0.14,
        convBase: 0.003,
        convGrowth: 0.28,
        creatives: [
          { name: "Depoimento de Aluno Fluente | Vídeo", ctrAdj: 1.36, convAdj: 1.32, cpmAdj: 0.93, w: 1.35 },
          { name: "Turma com Vagas Limitadas | Estático", ctrAdj: 1.08, convAdj: 1.12, cpmAdj: 0.99, w: 1.05 },
          { name: "Grade do Curso | Carrossel", ctrAdj: 0.92, convAdj: 0.96, cpmAdj: 1.03, w: 0.95 }
        ],
        adsets: [
          {
            name: "Remarketing | Assistiu a Aula Gratuita",
            weight: 0.6,
            cpmAdj: 0.92,
            ctrAdj: 1.18,
            convAdj: 1.24,
            ads: ["Depoimento de Aluno Fluente | Vídeo", "Turma com Vagas Limitadas | Estático", "Grade do Curso | Carrossel"]
          },
          {
            name: "Lookalike 1% | Alunos Matriculados",
            weight: 0.4,
            cpmAdj: 1.06,
            ctrAdj: 0.96,
            convAdj: 0.96,
            ads: ["Depoimento de Aluno Fluente | Vídeo", "Grade do Curso | Carrossel"]
          }
        ]
      },
      {
        key: "conteudo-topo",
        name: "Topo de Funil | Conteúdo e Alcance",
        objective: "reach",
        preset: "reach",
        startOffset: 120,
        rampDays: 10,
        baseSpend: 22,
        endMultiplier: 1.5,
        cpmBase: 11,
        ctrBase: 0.012,
        ctrGrowth: 0.1,
        convBase: 0.015,
        convGrowth: 0.12,
        creatives: [
          { name: "5 Erros de Pronúncia | Reels", ctrAdj: 1.28, convAdj: 1.2, cpmAdj: 0.86, w: 1.3 },
          { name: "Vocabulário do Dia | Carrossel", ctrAdj: 1.04, convAdj: 1.02, cpmAdj: 0.95, w: 1.05 },
          { name: "Frase Motivacional | Estático", ctrAdj: 0.72, convAdj: 0.78, cpmAdj: 1.1, w: 0.88 }
        ],
        adsets: [
          {
            name: "Alcance | Brasil Amplo",
            weight: 0.6,
            cpmAdj: 0.92,
            ctrAdj: 1.0,
            convAdj: 1.0,
            ads: ["5 Erros de Pronúncia | Reels", "Frase Motivacional | Estático"]
          },
          {
            name: "Alcance | Engajaram no Instagram",
            weight: 0.4,
            cpmAdj: 1.06,
            ctrAdj: 1.1,
            convAdj: 1.06,
            ads: ["5 Erros de Pronúncia | Reels", "Vocabulário do Dia | Carrossel", "Frase Motivacional | Estático"]
          }
        ]
      }
    ]
  }
];

// ---------------------------------------------------------------------------
// Geração de métricas
// ---------------------------------------------------------------------------

function dayOfWeekUTC(date) {
  return date.getUTCDay(); // 0=Dom..6=Sáb
}

export function computeCampaignDay(client, camp, dayIndex, rng) {
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
  const messages = camp.messageHeavy
    ? Math.max(0, Math.round(conversions * (1.6 + rng() * 1.1)))
    : Math.max(0, Math.round(conversions * (0.25 + rng() * 0.3)));
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

/** Distribui o dia da campanha entre os conjuntos (soma fecha com a campanha). */
export function splitAdsets(campDay, adsets, rng) {
  const weights = adsets.map((a) => a.weight * (0.94 + rng() * 0.12));
  const wsum = weights.reduce((a, b) => a + b, 0);
  const norm = weights.map((w) => w / wsum);

  let allocated = 0;
  return adsets.map((a, i) => {
    const isLast = i === adsets.length - 1;
    const spend = isLast ? round2(campDay.spend - allocated) : round2(campDay.spend * norm[i]);
    allocated = round2(allocated + spend);

    const cpm =
      (campDay.spend > 0 ? (campDay.spend / Math.max(1, campDay.impressions)) * 1000 : 30) * a.cpmAdj;
    const ctr = (campDay.ctr / 100) * a.ctrAdj * (0.9 + rng() * 0.2);
    const convRate = (campDay.leads / Math.max(1, campDay.clicks)) * a.convAdj * (0.9 + rng() * 0.2);
    const msgPerConv = campDay.conversions > 0 ? campDay.messages / campDay.conversions : 0.3;

    return { spec: a, spend: Math.max(0, spend), cpm, ctr, convRate, msgPerConv, roas: campDay.roas };
  });
}

/** Distribui o dia do conjunto entre os anúncios que estavam no ar. */
export function splitAds(adsetDay, campaign, dayIndex, rng) {
  const daysLive = dayIndex - campaign.startOffset;
  const byName = new Map(campaign.creatives.map((c) => [c.name, c]));
  const live = adsetDay.spec.ads
    .map((name) => byName.get(name))
    .filter(Boolean)
    .filter((c) => daysLive >= (c.from ?? 0) && (c.to == null || daysLive <= c.to));

  if (!live.length) return [];

  const weights = live.map((c) => (c.w ?? 1) * (0.92 + rng() * 0.16));
  const wsum = weights.reduce((a, b) => a + b, 0);

  let allocated = 0;
  return live.map((c, i) => {
    const isLast = i === live.length - 1;
    const spend = isLast
      ? round2(adsetDay.spend - allocated)
      : round2(adsetDay.spend * (weights[i] / wsum));
    allocated = round2(allocated + spend);
    const safeSpend = Math.max(0, spend);

    const cpm = adsetDay.cpm * (c.cpmAdj ?? 1) * (0.94 + rng() * 0.12);
    const ctr = adsetDay.ctr * (c.ctrAdj ?? 1) * (0.92 + rng() * 0.16);
    const convRate = adsetDay.convRate * (c.convAdj ?? 1) * (0.92 + rng() * 0.16);

    const impressions = cpm > 0 ? Math.max(0, Math.round((safeSpend / cpm) * 1000)) : 0;
    const clicks = Math.max(0, Math.round(impressions * ctr));
    const conversions = Math.max(0, Math.round(clicks * convRate));
    const leads = conversions;
    const freq = 1.3 + rng() * 0.7;
    const reach = Math.max(0, Math.round(impressions / freq));
    const messages = Math.max(0, Math.round(conversions * adsetDay.msgPerConv * (0.85 + rng() * 0.3)));
    const cpc = clicks > 0 ? safeSpend / clicks : 0;
    const ctrPct = impressions > 0 ? (clicks / impressions) * 100 : 0;
    // ROAS acompanha a eficiência de conversão do criativo, não só o ruído.
    const roas = clamp(adsetDay.roas * (c.convAdj ?? 1) * (0.92 + rng() * 0.16), 0.3, 14);

    return {
      creativeName: c.name,
      adsetName: adsetDay.spec.name,
      spend: safeSpend,
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

// ---------------------------------------------------------------------------
// Banco
// ---------------------------------------------------------------------------

async function bulkInsert(client, table, columns, rows) {
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
    const sql = `INSERT INTO ${table} (${columns.map((c) => `"${c}"`).join(",")}) VALUES ${tuples.join(",")}`;
    const res = await client.query(sql, values);
    inserted += res.rowCount ?? 0;
  }
  return inserted;
}

/** Descobre o tenant demo pelas contas `act_demo_*` já existentes. */
async function resolveTenantId(pgClient) {
  if (argTenant) return argTenant;
  if (process.env.DEMO_TENANT_ID) return process.env.DEMO_TENANT_ID;

  const res = await pgClient.query(
    `select c."tenantId", count(*)::int as accounts
       from ad_accounts a
       join clients c on c.id = a."clientId"
      where a."metaAdAccountId" ilike '%demo%'
      group by c."tenantId"
      order by accounts desc`
  );
  if (res.rows.length === 0) {
    throw new Error(
      "Nenhum tenant com contas demo encontrado. Passe --tenant=<uuid> ou defina DEMO_TENANT_ID."
    );
  }
  if (res.rows.length > 1) {
    const list = res.rows.map((r) => `${r.tenantId} (${r.accounts} contas)`).join(", ");
    throw new Error(`Mais de um tenant com contas demo: ${list}. Passe --tenant=<uuid>.`);
  }
  return res.rows[0].tenantId;
}

async function main() {
  const pgClient = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await pgClient.connect();

  const TENANT_ID = await resolveTenantId(pgClient);

  console.log(`Tenant: ${TENANT_ID}`);
  console.log(`Janela: ${dateStr(START_DATE)} .. ${dateStr(END_DATE)} (${DAYS} dias)`);
  console.log(`Clientes: ${CLIENTS.length}`);
  if (DRY_RUN) {
    for (const spec of CLIENTS) {
      const ads = new Set();
      for (const c of spec.campaigns) for (const cr of c.creatives) ads.add(cr.name);
      console.log(
        `  - ${spec.name}: ${spec.campaigns.length} campanhas, ${spec.campaigns.reduce((n, c) => n + c.adsets.length, 0)} conjuntos, ${ads.size} criativos`
      );
    }
    await pgClient.end();
    return;
  }

  const summary = [];

  for (const spec of CLIENTS) {
    const rng = mulberry32(spec.seed);

    // 1) Cliente — renomeia versões anteriores para não duplicar o registro
    if (spec.previousNames?.length) {
      await pgClient.query(
        `UPDATE clients SET name = $1, "updatedAt" = now()
          WHERE "tenantId" = $2 AND name = ANY($3::text[])`,
        [spec.name, TENANT_ID, spec.previousNames]
      );
    }
    const existingClient = await pgClient.query(
      `SELECT id FROM clients WHERE "tenantId" = $1 AND name = $2`,
      [TENANT_ID, spec.name]
    );
    let clientId;
    if (existingClient.rows.length > 0) {
      clientId = existingClient.rows[0].id;
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
      console.log(`Cliente criado: ${spec.name}`);
    }

    // 2) Conta de anúncio
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

    // 3) syncEnabled=false | a conta não existe na Meta, não pode entrar no cron
    await pgClient.query(
      `INSERT INTO client_meta_settings ("clientId", "syncEnabled", "defaultClientMetric", "defaultDashboardMetrics")
       VALUES ($1, false, 'roas', $2::jsonb)
       ON CONFLICT ("clientId") DO UPDATE SET "syncEnabled" = false`,
      [clientId, JSON.stringify(["spend", "conversions"])]
    );

    // 4) Tipo de campanha (agrupa o ranking de criativos)
    for (const camp of spec.campaigns) {
      await pgClient.query(
        `INSERT INTO campaign_presets (id, "createdAt", "updatedAt", "tenantId", "metaCampaignId", preset)
         VALUES ($1, now(), now(), $2, $3, $4)
         ON CONFLICT ("tenantId", "metaCampaignId") DO UPDATE SET preset = excluded.preset`,
        [randomUUID(), TENANT_ID, camp.key, camp.preset]
      );
    }

    // 5) Métricas | regeradas do zero para os três níveis fecharem entre si
    await pgClient.query(`DELETE FROM ad_metric_snapshots WHERE "adAccountId" = $1`, [adAccountId]);
    await pgClient.query(`DELETE FROM campaign_metric_snapshots WHERE "adAccountId" = $1`, [adAccountId]);
    await pgClient.query(`DELETE FROM metric_snapshots WHERE "adAccountId" = $1`, [adAccountId]);

    const campRows = [];
    const adRows = [];
    const acctRowsByDay = new Map();
    const creativeNames = new Set();

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

        const adsetDays = splitAdsets(day, camp.adsets, rng);
        adsetDays.forEach((adsetDay, adsetIdx) => {
          const adsetId = `${camp.key}__adset${adsetIdx + 1}`;
          for (const ad of splitAds(adsetDay, camp, d, rng)) {
            creativeNames.add(ad.creativeName);
            adRows.push([
              adAccountId,
              camp.key,
              adsetId,
              `${adsetId}__${slug(ad.creativeName).slice(0, 32)}`,
              ad.adsetName,
              ad.creativeName,
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
          }
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
      campRows
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
      adRows
    );

    const metricInserted = await bulkInsert(
      pgClient,
      "metric_snapshots",
      ["adAccountId", "day", "spend", "impressions", "clicks", "ctr", "cpc", "conversions", "reach", "messages", "roas"],
      metricRows
    );

    const totalSpend = metricRows.reduce((s, r) => s + Number(r[2]), 0);
    const totalConv = metricRows.reduce((s, r) => s + Number(r[7]), 0);

    summary.push({
      client: spec.name,
      clientId,
      adAccountId,
      metaAdAccountId: spec.adAccountId,
      creatives: creativeNames.size,
      campaignRows: campInserted,
      adRows: adInserted,
      accountDayRows: metricInserted,
      totalSpend,
      totalConv
    });

    console.log(
      `  ${spec.name}: ${creativeNames.size} criativos | ${campInserted} linhas de campanha | ${adInserted} de anúncio | ${metricInserted} de conta`
    );
  }

  console.log("\nResumo:");
  for (const s of summary) {
    console.log(
      `- ${s.client}\n    cliente=${s.clientId} conta=${s.metaAdAccountId}\n    gasto total=R$ ${s.totalSpend.toFixed(2)} | conversões=${s.totalConv} | criativos=${s.creatives}`
    );
  }

  console.log(
    "\nGere os previews dos criativos com: node scripts/generate-demo-creative-images.mjs"
  );

  await pgClient.end();
}

const invokedDirectly =
  process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (invokedDirectly) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

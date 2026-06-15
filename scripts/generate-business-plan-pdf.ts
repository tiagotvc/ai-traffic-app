/**
 * Gera o Business Plan completo em PDF (V3).
 * Uso: pnpm exec tsx scripts/generate-business-plan-pdf.ts
 */
import fs from "node:fs";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFPage, type PDFFont } from "pdf-lib";

const OUT = path.join(
  process.cwd(),
  "docs",
  "AI-Traffic-App-Business-Plan-2026-V3.pdf"
);

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 48;
const CONTENT_W = PAGE_W - MARGIN * 2;

type RGB = { r: number; g: number; b: number };
const C = {
  violet: rgb(0.42, 0.22, 0.92),
  dark: rgb(0.12, 0.14, 0.2),
  muted: rgb(0.45, 0.48, 0.55),
  white: rgb(1, 1, 1),
  line: rgb(0.88, 0.9, 0.93),
  green: rgb(0.12, 0.62, 0.45),
  amber: rgb(0.92, 0.55, 0.1)
};

function loadFont(): Buffer {
  const candidates = [
    "C:\\Windows\\Fonts\\arial.ttf",
    "C:\\Windows\\Fonts\\segoeui.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf"
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return fs.readFileSync(p);
  }
  throw new Error("Fonte TTF não encontrada. Instale Arial ou DejaVu Sans.");
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

class Doc {
  pdf!: PDFDocument;
  font!: PDFFont;
  fontBold!: PDFFont;
  page!: PDFPage;
  y = 0;
  pageNum = 0;

  async init() {
    this.pdf = await PDFDocument.create();
    this.pdf.registerFontkit(fontkit);
    const bytes = loadFont();
    this.font = await this.pdf.embedFont(bytes);
    this.fontBold = this.font;
    this.newPage();
  }

  newPage() {
    this.page = this.pdf.addPage([PAGE_W, PAGE_H]);
    this.pageNum += 1;
    this.y = PAGE_H - MARGIN;
    if (this.pageNum > 1) {
      this.page.drawText(`AI Traffic App — Business Plan 2026–2028`, {
        x: MARGIN,
        y: 28,
        size: 8,
        font: this.font,
        color: C.muted
      });
      this.page.drawText(String(this.pageNum), {
        x: PAGE_W - MARGIN - 20,
        y: 28,
        size: 8,
        font: this.font,
        color: C.muted
      });
    }
  }

  ensureSpace(need: number) {
    if (this.y - need < MARGIN + 40) this.newPage();
  }

  heading(title: string, level: 1 | 2 = 1) {
    const size = level === 1 ? 18 : 13;
    this.ensureSpace(36);
    this.page.drawText(title, {
      x: MARGIN,
      y: this.y,
      size,
      font: this.fontBold,
      color: level === 1 ? C.violet : C.dark
    });
    this.y -= size + 10;
  }

  para(text: string, size = 10.5) {
    const lines = wrap(text, this.font, size, CONTENT_W);
    for (const line of lines) {
      this.ensureSpace(16);
      this.page.drawText(line, {
        x: MARGIN,
        y: this.y,
        size,
        font: this.font,
        color: C.dark
      });
      this.y -= size + 4;
    }
    this.y -= 4;
  }

  bullet(items: string[], size = 10) {
    for (const item of items) {
      const lines = wrap(item, this.font, size, CONTENT_W - 14);
      for (let i = 0; i < lines.length; i++) {
        this.ensureSpace(14);
        if (i === 0) {
          this.page.drawText("•", {
            x: MARGIN + 2,
            y: this.y,
            size,
            font: this.font,
            color: C.violet
          });
        }
        this.page.drawText(lines[i], {
          x: MARGIN + 14,
          y: this.y,
          size,
          font: this.font,
          color: C.dark
        });
        this.y -= size + 3;
      }
    }
    this.y -= 4;
  }

  table(headers: string[], rows: string[][], colWidths?: number[]) {
    const cols = headers.length;
    const widths =
      colWidths ??
      headers.map(() => CONTENT_W / cols);
    const rowH = 16;
    const headerH = 20;
    this.ensureSpace(headerH + rows.length * rowH + 8);

    let x = MARGIN;
    for (let c = 0; c < cols; c++) {
      this.page.drawRectangle({
        x,
        y: this.y - headerH,
        width: widths[c],
        height: headerH,
        color: C.violet
      });
      const hLines = wrap(headers[c], this.fontBold, 8, widths[c] - 6);
      this.page.drawText(hLines[0], {
        x: x + 4,
        y: this.y - 14,
        size: 8,
        font: this.fontBold,
        color: C.white
      });
      x += widths[c];
    }
    this.y -= headerH;

    for (const row of rows) {
      x = MARGIN;
      for (let c = 0; c < cols; c++) {
        this.page.drawRectangle({
          x,
          y: this.y - rowH,
          width: widths[c],
          height: rowH,
          borderColor: C.line,
          borderWidth: 0.5
        });
        const cell = row[c] ?? "";
        const clipped = cell.length > 42 ? `${cell.slice(0, 39)}…` : cell;
        this.page.drawText(clipped, {
          x: x + 4,
          y: this.y - 12,
          size: 7.5,
          font: this.font,
          color: C.dark
        });
        x += widths[c];
      }
      this.y -= rowH;
    }
    this.y -= 8;
  }

  barChart(
    title: string,
    labels: string[],
    values: number[],
    unit = "",
    maxVal?: number
  ) {
    const chartH = 120;
    const chartW = CONTENT_W;
    this.ensureSpace(chartH + 40);
    this.page.drawText(title, {
      x: MARGIN,
      y: this.y,
      size: 11,
      font: this.fontBold,
      color: C.dark
    });
    this.y -= 18;

    const max = maxVal ?? Math.max(...values, 1);
    const barW = (chartW - 20) / labels.length - 8;
    const baseY = this.y - chartH;

    this.page.drawLine({
      start: { x: MARGIN, y: baseY },
      end: { x: MARGIN + chartW, y: baseY },
      thickness: 0.5,
      color: C.line
    });

    labels.forEach((label, i) => {
      const h = (values[i] / max) * (chartH - 20);
      const x = MARGIN + 10 + i * (barW + 8);
      this.page.drawRectangle({
        x,
        y: baseY,
        width: barW,
        height: h,
        color: i % 2 === 0 ? C.violet : rgb(0.55, 0.38, 0.95)
      });
      const valText = `${values[i]}${unit}`;
      this.page.drawText(valText, {
        x: x + 2,
        y: baseY + h + 4,
        size: 7,
        font: this.font,
        color: C.muted
      });
      const lbl = label.length > 10 ? label.slice(0, 9) + "…" : label;
      this.page.drawText(lbl, {
        x: x,
        y: baseY - 12,
        size: 7,
        font: this.font,
        color: C.muted
      });
    });
    this.y = baseY - 28;
  }

  lineChart(title: string, labels: string[], series: { name: string; values: number[]; color: RGB }[]) {
    const chartH = 110;
    const chartW = CONTENT_W;
    this.ensureSpace(chartH + 50);
    this.page.drawText(title, {
      x: MARGIN,
      y: this.y,
      size: 11,
      font: this.fontBold,
      color: C.dark
    });
    this.y -= 16;

    const allVals = series.flatMap((s) => s.values);
    const max = Math.max(...allVals, 1);
    const baseY = this.y - chartH;
    const stepX = chartW / (labels.length - 1);

    series.forEach((s) => {
      for (let i = 0; i < s.values.length - 1; i++) {
        const x1 = MARGIN + i * stepX;
        const y1 = baseY + (s.values[i] / max) * (chartH - 10);
        const x2 = MARGIN + (i + 1) * stepX;
        const y2 = baseY + (s.values[i + 1] / max) * (chartH - 10);
        this.page.drawLine({
          start: { x: x1, y: y1 },
          end: { x: x2, y: y2 },
          thickness: 1.5,
          color: s.color
        });
      }
      this.page.drawText(s.name, {
        x: MARGIN + chartW - 80,
        y: baseY + chartH - 10 + series.indexOf(s) * 12,
        size: 8,
        font: this.font,
        color: s.color
      });
    });

    labels.forEach((lbl, i) => {
      if (i % 2 === 0) {
        this.page.drawText(lbl, {
          x: MARGIN + i * stepX - 8,
          y: baseY - 12,
          size: 7,
          font: this.font,
          color: C.muted
        });
      }
    });
    this.y = baseY - 28;
  }

  cover() {
    this.page.drawRectangle({
      x: 0,
      y: 0,
      width: PAGE_W,
      height: PAGE_H,
      color: rgb(0.08, 0.1, 0.16)
    });
    this.page.drawText("AI Traffic App", {
      x: MARGIN,
      y: PAGE_H - 180,
      size: 36,
      font: this.fontBold,
      color: C.white
    });
    this.page.drawText("Business Plan 2026 – 2028", {
      x: MARGIN,
      y: PAGE_H - 220,
      size: 20,
      font: this.font,
      color: rgb(0.75, 0.78, 0.85)
    });
    this.page.drawText("Sistema operacional do gestor de tráfego brasileiro", {
      x: MARGIN,
      y: PAGE_H - 260,
      size: 13,
      font: this.font,
      color: C.violet
    });
    this.paraOnCover(
      "Versão V3 — Pesquisa de mercado, concorrentes, oportunidades em white space,\nprojeções financeiras e roadmap de execução.",
      PAGE_H - 320
    );
    this.paraOnCover("Tiago Carvalho · Traffic AI · Junho 2026", 120);
    this.pageNum = 1;
  }

  paraOnCover(text: string, yPos: number) {
    const lines = text.split("\n");
    let y = yPos;
    for (const line of lines) {
      this.page.drawText(line, {
        x: MARGIN,
        y,
        size: 10,
        font: this.font,
        color: rgb(0.65, 0.68, 0.75)
      });
      y -= 14;
    }
  }

  async save() {
    const bytes = await this.pdf.save();
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, bytes);
    console.log(`PDF gerado: ${OUT}`);
    console.log(`Páginas: ${this.pageNum}`);
  }
}

async function build() {
  const doc = new Doc();
  await doc.init();
  doc.cover();
  doc.newPage();
  doc.heading("Índice");
  doc.bullet([
    "1. Problema · 2. Mercado TAM/SAM/SOM · 3. Concorrentes (deep dive)",
    "4. MVP · 5. White space · 6. IA · 7–9. Criativos, WhatsApp, Apps/Games",
    "10. Precificação · 11–12. Aquisição 100 e 1.000 clientes",
    "13–14. Unit economics e projeções · 15. Valuation · 16–19. Riscos, roadmap, conclusão"
  ]);

  doc.newPage();
  doc.heading("Sumário executivo");
  doc.para(
    "O AI Traffic App (Traffic AI) visa ser o sistema operacional do gestor de tráfego e da agência digital brasileira: campanhas Meta, criativos, clientes, alertas, automações, relatórios e IA em um único workspace — com precificação em BRL, PIX, NF e foco em retenção de conhecimento operacional."
  );
  doc.para(
    "O mercado brasileiro de publicidade digital atingiu R$ 42,7 bilhões em 2025 (+12,7% YoY, IAB Brasil/Ibope). Investimento via agências somou R$ 28,9 bi, com internet acima de 40% do total (CENP-Meios). Ferramentas globais (Motion, Madgicx, Foreplay) cobram em dólar e focam nichos (criativo puro, otimização Meta ou swipe files), deixando espaço para uma plataforma brasileira integrada e acessível."
  );
  doc.bullet([
    "Missão: reduzir tempo operacional e transformar dados dispersos em conhecimento reutilizável.",
    "Modelo: SaaS BRL com planos Basic (R$ 19), Advanced (R$ 57) e Agency (R$ 190/mês) + add-ons.",
    "Meta 24 meses: 800–1.200 clientes pagantes, MRR base R$ 90k–150k, churn < 4% mensal.",
    "Diferencial: ranking de criativos com dados ao vivo + aprendizados estruturados + command center + billing local."
  ]);

  doc.heading("1. O problema");
  doc.para(
    "Gestores e agências operam com Meta Ads Manager, planilhas, WhatsApp, Drive, Notion e ChatGPT. O conhecimento fica fragmentado: quando um gestor sai, criativos vencedores e decisões se perdem. Relatórios consomem horas. Ferramentas internacionais são caras (US$ 99–500/mês) ou cobram por spend/conta, penalizando agências com muitos clientes pequenos."
  );
  doc.para(
    "No Brasil, o gestor de tráfego é frequentemente também account parcial: atende cliente no WhatsApp, monta relatório, ajusta campanha e busca referência criativa. Essa multi-função amplia o valor de uma plataforma unificada — e o custo de ferramentas desconectadas."
  );
  doc.bullet([
    "Relatórios manuais e dashboards desconectados do dia a dia (Reportei, mLabs Analytics).",
    "Creative analytics premium sem operação completa (Motion ~US$ 250/mês).",
    "Otimização Meta sem foco Brasil (Madgicx, pricing em USD e por spend).",
    "Inspiração de anúncios sem gestão de campanha (Foreplay).",
    "Nenhuma ferramenta dominante combina: multi-cliente + ranking criativo + aprendizados + NF/PIX."
  ]);

  doc.newPage();
  doc.heading("2.1 Segmentos e personas");
  doc.table(
    ["Persona", "Tamanho", "Dor principal", "Plano alvo"],
    [
      ["Freelancer Meta", "~35k BR*", "Tempo em relatório", "Basic R$ 19"],
      ["Agência 3–15 clientes", "~8k*", "Escala sem contratar", "Advanced R$ 57"],
      ["Agência 15–50+", "~2k*", "Retenção conhecimento", "Agency R$ 190"],
      ["E-commerce in-house", "~5k*", "Criativo + ROAS", "Advanced/Agency"]
    ],
    [110, 70, 150, 90]
  );
  doc.para("*Estimativa interna baseada em grupos de gestores, CENP 330 agências e mercado freelance digital.", 9);

  doc.heading("2. Mercado — TAM, SAM, SOM");
  doc.para(
    "Fontes: IAB Brasil Digital Adspend 2026 (ano-base 2025); CENP-Meios 2025; Research and Markets (projeção US$ 19,28 bi ad digital BR em 2026). Estimativas de SAM/SOM são modelagens internas para planejamento — validar com entrevistas."
  );
  doc.table(
    ["Camada", "Definição", "Estimativa 2026"],
    [
      ["TAM", "Software B2B para gestão de mídia digital BR", "R$ 1,2–2,0 bi/ano*"],
      ["SAM", "Gestores/agências Meta + paid social BR", "R$ 350–500 mi/ano*"],
      ["SOM", "Captura realista 3 anos (BR LATAM)", "R$ 25–40 mi ARR*"]
    ],
    [90, 220, 120]
  );
  doc.para("*TAM derivado de ~1–2% do mercado de agências digitais (USD 2,76 bi em 2025, Reed Intelligence) alocado a ferramentas. SAM: ~60–80 mil profissionais × ticket R$ 200–600/mês.", 9);

  doc.barChart(
    "TAM / SAM / SOM (R$ milhões anuais — estimativa)",
    ["SOM", "SAM", "TAM"],
    [32, 425, 1600],
    "M"
  );

  doc.newPage();
  doc.heading("3. Análise de concorrentes");
  doc.table(
    ["Concorrente", "Foco", "Preço entrada", "Gap vs Traffic AI"],
    [
      ["Madgicx", "Otimização Meta + IA", "US$ 45–99/mês+", "Sem OS agência BR; USD/spend"],
      ["Motion", "Creative analytics", "US$ 0–250/mês", "Caro; sem command center BR"],
      ["Foreplay", "Swipe + workflow criativo", "US$ 49–59/mês", "Sem gestão campanha/sync"],
      ["Reportei", "Relatórios BR", "R$ 74,90/mês+", "Sem ranking/IA operacional"],
      ["mLabs Analytics", "Dashboards (DashGoo)", "US$ 9,90/marca/mês", "Relatório, não operação"]
    ],
    [75, 95, 75, 155]
  );

  doc.heading("3.1 Madgicx — análise profunda", 2);
  doc.para(
    "Madgicx posiciona-se como super-app de Meta Ads com IA: otimização, analytics, criativos, audiências, automação e Ads Manager 2.0. Plano Pro Complete desde ~US$ 45–99/mês (varia por spend), escalando com gasto em anúncios; add-on Tracking Pro US$ 49/mês. Trial 7 dias. Forte em automação e creative intelligence, mas pricing em dólar e atrelado a spend penaliza agências BR com muitas contas pequenas."
  );
  doc.bullet([
    "Pontos fortes: automações, audience studio, creative scoring, multi-conta enterprise.",
    "Pontos fracos: sem NF/PIX; suporte US-centric; não é OS de agência (sem aprendizados).",
    "Oportunidade Traffic AI: mesmo gestor Meta, mas workspace BR, ranking nativo, preço fixo BRL."
  ]);

  doc.heading("3.2 Motion — análise profunda", 2);
  doc.para(
    "Motion é referência em creative analytics para paid social: leaderboard, tags IA, testes criativos, snapshots para cliente. Free tier limitado; Starter ~US$ 250/mês (até US$ 50k spend); Pro/Growth custom. Foco em marcas com alto spend — menos acessível para agência com 15 clientes pequenos."
  );
  doc.bullet([
    "Pontos fortes: UX de creative, integração atribuição (Northbeam, GA4) em tiers altos.",
    "Pontos fracos: sem command center operacional; preço alto; inspiração sem performance de concorrente.",
    "Traffic AI entrega camada similar de ranking já no produto, bundled com operação diária."
  ]);

  doc.heading("3.3 Foreplay — análise profunda", 2);
  doc.para(
    "Foreplay cobre workflow criativo end-to-end: extensão Chrome, swipe files, Spyder (rastreio concorrentes), Lens analytics sem pricing por ad spend (diferencial 2025). Planos ~US$ 49–59/mês (solo), US$ 149–175 (workflow 5 users), US$ 389–459 (agency 10 users). 200M+ ads na biblioteca comunitária."
  );
  doc.bullet([
    "Pontos fortes: pesquisa competitiva, briefs, colaboração criativa, mobile app.",
    "Pontos fracos: não sincroniza campanhas ao vivo nem gerencia orçamento/alertas.",
    "Complementar ao Traffic AI (inspiração) — não substituto do OS operacional."
  ]);

  doc.heading("3.4 Reportei — análise profunda", 2);
  doc.para(
    "Reportei domina relatórios automáticos no Brasil: planos por quantidade de projetos (clientes), desde ~R$ 74,90/mês (5 projetos). Starter/Pro/Premium com redes sociais + Meta/Google Ads. IA em planos superiores. Foco entrega ao cliente, não operação interna do gestor."
  );
  doc.bullet([
    "Pontos fortes: marca BR, preço acessível, templates, agendamento, PIX/cartão.",
    "Pontos fracos: sem ranking criativo operacional, sem automações de campanha, sem command center.",
    "Estratégia: Traffic AI gera PDF/WhatsApp mas compete na operação — pode integrar export Reportei-style."
  ]);

  doc.heading("3.5 mLabs Analytics (DashGoo) — análise profunda", 2);
  doc.para(
    "DashGoo rebranded mLabs Analytics (abr/2025): dashboards white-label, portal cliente, relatórios multi-marca, IA, funil, concorrentes Instagram. Planos ~US$ 39,90–69,90/mês (anual) por marca; trial 7–14 dias. +10k agências declaradas. Forte ecossistema mLabs (social + analytics)."
  );
  doc.bullet([
    "Pontos fortes: preço por marca baixo, portal cliente, integrações amplas.",
    "Pontos fracos: camada de relatório — gestor ainda opera no Ads Manager separado.",
    "Parceria potencial: Traffic AI como motor operacional + mLabs como camada de entrega."
  ]);

  doc.heading("Matriz de funcionalidades (resumo)");
  doc.table(
    ["Capacidade", "Traffic AI", "Motion", "Madgicx", "Reportei", "Foreplay"],
    [
      ["Multi-cliente workspace", "Sim", "Parcial", "Sim", "Por projeto", "Não"],
      ["Sync Meta ao vivo", "Sim", "Sim", "Sim", "Não", "Não"],
      ["Ranking criativos", "Sim", "Sim", "Parcial", "Não", "Não"],
      ["Command center", "Sim", "Não", "Parcial", "Não", "Não"],
      ["Automações/alertas", "Sim", "Não", "Sim", "Não", "Não"],
      ["Aprendizados estruturados", "Roadmap", "Não", "Não", "Não", "Não"],
      ["Relatórios PDF/WhatsApp", "Sim", "Snapshots", "Sim", "Sim", "Brief"],
      ["Billing PIX + NF BR", "Sim", "Não", "Não", "Não", "Não"],
      ["Precificação BRL acessível", "Sim", "USD alto", "USD", "BRL", "USD"]
    ],
    [95, 55, 55, 55, 55, 55]
  );

  doc.newPage();
  doc.heading("4. MVP atual (produto em código)");
  doc.bullet([
    "Login Meta OAuth + workspace por gestor; multi-cliente e membros.",
    "Dashboard, Command Center, campanhas, conjuntos, anúncios, criativos.",
    "Ranking de criativos com config por tipo de campanha (migration 0014).",
    "Alertas, automações, públicos, lookalike, templates, sync agendado.",
    "IA Gemini: recomendações e refinamento; aplicar na Meta.",
    "Relatórios PDF white-label + resumo WhatsApp.",
    "Billing Asaas: PIX, cartão, assinatura, cupons, admin de planos, NF.",
    "i18n pt-BR/en; RBAC workspace; grace period e bloqueio por inadimplência."
  ]  );

  doc.newPage();
  doc.heading("5. White space — onde focar (oportunidades pouco atendidas)");
  doc.para(
    "Áreas com demanda clara e pouca competição integrada no Brasil — prioridade estratégica para diferenciação e aquisição."
  );
  doc.table(
    ["Oportunidade", "Por que é gap", "Prioridade"],
    [
      ["Memória operacional (aprendizados)", "Conhecimento sai com o gestor; ninguém estrutura", "Alta"],
      ["OS agência BR all-in-one", "Ferramentas US$ + fragmentadas", "Alta"],
      ["Ranking + operação no mesmo login", "Motion/Foreplay não gerenciam campanha", "Alta"],
      ["WhatsApp insights nativos", "Reportei não opera; gestores usam WA diário", "Média-Alta"],
      ["Apps & Games vertical", "UA mobile pouco coberto por tools BR", "Média"],
      ["Billing NF/PIX embutido", "Stripe-first tools ignoram BR", "Média"],
      ["IA de baixo custo (Gemini)", "Concorrentes premium em USD", "Alta"],
      ["Onboarding multi-conta Meta", "Import contas + RBAC membro", "Média"]
    ],
    [140, 200, 80]
  );

  doc.newPage();
  doc.heading("6.1 Arquitetura de IA de baixo custo", 2);
  doc.para(
    "Stack: Gemini 2.0 Flash para batch; contexto montado em servidor (métricas Postgres + metas + alertas). Sem enviar tokens de API Meta ao modelo. Rate limit por tenant conforme plano. Estimativa: 500 recomendações/mês = ~US$ 15–40 de API para tenant Agency — margem preservada."
  );
  doc.table(
    ["Plano", "Sugestões IA/mês", "Custo IA est.", "Preço plano"],
    [
      ["Basic", "50", "~US$ 2", "R$ 19"],
      ["Advanced", "200", "~US$ 8", "R$ 57"],
      ["Agency", "500", "~US$ 20", "R$ 190"],
      ["Add-on IA", "+500", "~US$ 18", "R$ 49 addon"]
    ],
    [80, 90, 80, 80]
  );

  doc.heading("6. Estratégia de IA");
  doc.bullet([
    "Arquitetura: Gemini para análise e sugestões; prompts com contexto do cliente (métricas, metas, histórico).",
    "Custos: estimativa US$ 0,02–0,08 por recomendação batch; limites por plano (50–500/mês).",
    "Escalabilidade: cache de métricas em Postgres; IA sob demanda, não em cada sync.",
    "Roadmap: aprendizados estruturados → RAG sobre histórico → automações sugeridas por IA.",
    "Princípio: IA aciona ação (pausar, ajustar orçamento) com auditoria — não só chat."
  ]);

  doc.heading("7.1 Histórico de aprendizados (roadmap estruturado)", 2);
  doc.para(
    "Gap de mercado: Notion/Drive guardam documentos, mas não ligam aprendizado à campanha/criativo/métrica. Modelo proposto: entradas com tags (nicho, objetivo, criativo_id), vinculadas a resultados antes/depois. Permite busca quando novo cliente similar entra — reduz tempo de ramp-up."
  );
  doc.bullet([
    "v1: notas por cliente + templates de aprendizado.",
    "v2: link automático ao criativo ranqueado.",
    "v3: RAG — IA sugere aprendizados similares ao otimizar campanha."
  ]);

  doc.heading("7. Biblioteca de criativos & ranking");
  doc.para(
    "Diferencial já em produção: ranking por métrica configurável (CPA, ROAS, CTR) com mínimo de impressões, preview, download, copy dos anúncios e visão por campanha/conjunto. Concorrentes cobram US$ 150–500/mês só por essa camada."
  );

  doc.heading("8. WhatsApp Insights (roadmap)");
  doc.para(
    "Resumo de performance enviável ao cliente via WhatsApp (já existe geração de texto); evoluir para: alertas proativos, templates por nicho, link dashboard cliente. Gap forte no BR onde WhatsApp é canal principal de comunicação com clientes."
  );

  doc.heading("9. Módulo Apps & Games");
  doc.para(
    "Vertical de UA mobile (apps, games) com métricas de instalação, cohort e criativos de vídeo. Mercado global grande; no BR ferramentas locais focam e-commerce/lead. Oportunidade: presets de campanha + ranking criativo + relatórios para publishers indie e mid-size."
  );

  doc.newPage();
  doc.heading("10.1 Add-ons detalhados");
  doc.table(
    ["Add-on", "Preço sug.", "Descrição"],
    [
      ["+1 cliente", "R$ 15/mês", "Expande limite sem mudar plano"],
      ["+3 contas Meta", "R$ 25/mês", "Para multi-BM"],
      ["+50 IA", "R$ 29/mês", "Pacote sugestões extras"],
      ["Portal white-label", "R$ 79/mês", "Dashboard cliente branded"]
    ],
    [90, 70, 220]
  );

  doc.heading("10. Precificação e add-ons");
  doc.table(
    ["Plano", "Preço/mês", "Público", "Limites típicos"],
    [
      ["Free", "R$ 0", "Trial / validação", "1 cliente, sync manual"],
      ["Basic", "R$ 19", "Freelancer", "3 clientes, IA limitada"],
      ["Advanced", "R$ 57", "Agência pequena", "10 clientes, automações"],
      ["Agency", "R$ 190", "Multi-cliente", "30+ clientes, sync auto, NF"]
    ],
    [70, 70, 110, 180]
  );
  doc.para("Add-ons planejados: +clientes, +contas Meta, +pacotes IA, white-label portal cliente.");

  doc.barChart("Comparativo preço entrada (R$/mês equivalente)", [
    "Traffic Basic",
    "Reportei",
    "Foreplay",
    "Madgicx",
    "Motion"
  ], [19, 75, 295, 495, 1250]);

  doc.newPage();
  doc.heading("11.1 Playbook 100 clientes (trimestral)");
  doc.table(
    ["Trimestre", "Meta pagantes", "Canal principal", "Investimento marketing"],
    [
      ["Q1", "15", "Founder + grupos WA/FB", "R$ 3k"],
      ["Q2", "35", "Cases ranking + referrals", "R$ 8k"],
      ["Q3", "65", "Afiliados + conteúdo", "R$ 15k"],
      ["Q4", "100", "Parcerias micro-agências", "R$ 22k"]
    ],
    [70, 70, 150, 90]
  );

  doc.heading("11. Primeiros 100 clientes");
  doc.bullet([
    "Founder-led sales: gestores Meta em grupos Facebook/Discord BR, podcasts de tráfego.",
    "Parcerias com 5–10 micro-agências (2–10 clientes) — onboarding white-glove.",
    "Conteúdo: cases de ranking de criativos + economia vs Motion/Reportei.",
    "Trial 7 dias + plano Basic barato como wedge; upsell Advanced em 60 dias.",
    "Meta: 100 pagantes em 9–12 meses; CAC alvo < R$ 300."
  ]);

  doc.heading("12. Primeiros 1.000 clientes");
  doc.bullet([
    "Product-led growth: ranking criativos como hook viral (demo com dados reais).",
    "Programa de afiliados para gestores influencers (10–20% recorrente).",
    "Integração mLabs/mLabs Analytics como canal (complementar, não competir em relatório).",
    "SEO: 'ferramenta gestor tráfego', 'ranking criativos meta', 'relatório meta automático'.",
    "Time CS 2 pessoas + automação onboarding; churn target < 3,5%/mês."
  ]  );

  doc.newPage();
  doc.heading("13. Unit economics (estimativas — validar)");
  doc.table(
    ["Métrica", "Ano 1", "Ano 2", "Ano 3"],
    [
      ["ARPU blended", "R$ 72", "R$ 95", "R$ 110"],
      ["Churn mensal", "5,0%", "4,0%", "3,2%"],
      ["LTV (meses/churn)", "R$ 1.440", "R$ 2.375", "R$ 3.437"],
      ["CAC alvo", "R$ 350", "R$ 280", "R$ 220"],
      ["LTV/CAC", "4,1x", "8,5x", "15,6x"],
      ["Margem bruta SaaS", "~82%", "~85%", "~87%"]
    ],
    [100, 80, 80, 80]
  );

  doc.heading("14.1 Marcos MRR: R$ 100k, R$ 300k e R$ 1M", 2);
  doc.table(
    ["Marco MRR", "Clientes est.", "Mix típico", "Prazo base"],
    [
      ["R$ 100k/mês", "~1.050", "45% Adv / 20% Agency", "Mês 30–36"],
      ["R$ 300k/mês", "~2.800", "35% Adv / 30% Agency", "Mês 42–48"],
      ["R$ 1M/mês", "~8.500", "25% Basic / 50% Adv / 25% Ag", "Mês 60+"]
    ],
    [80, 80, 150, 90]
  );
  doc.para(
    "Cenário agressivo com PLG + afiliados pode antecipar R$ 100k MRR em 24 meses; conservador em 36–40 meses. Requer churn < 3,5% e CAC payback < 5 meses."
  );

  doc.heading("14. Projeções financeiras (cenário base)");
  doc.para(
    "Assumptions: mix 40% Basic / 45% Advanced / 15% Agency; crescimento net +25–40 clientes/mês após mês 6; custo infra+IA ~15% da receita."
  );
  const months = ["M6", "M12", "M18", "M24", "M30", "M36"];
  doc.lineChart(
    "MRR projetado — cenários (R$ mil)",
    months,
    [
      { name: "Conservador", values: [8, 25, 55, 95, 140, 180], color: C.muted },
      { name: "Base", values: [12, 45, 95, 165, 240, 320], color: C.violet },
      { name: "Agressivo", values: [18, 70, 160, 300, 480, 650], color: C.green }
    ]
  );

  doc.table(
    ["Marco", "Clientes", "MRR base", "ARR"],
    [
      ["100 clientes", "100", "R$ 9k", "R$ 108k"],
      ["500 clientes", "500", "R$ 48k", "R$ 576k"],
      ["1.000 clientes", "1.000", "R$ 95k", "R$ 1,14M"],
      ["2.000 clientes", "2.000", "R$ 200k", "R$ 2,4M"],
      ["5.000 clientes", "5.000", "R$ 520k", "R$ 6,24M"]
    ],
    [100, 80, 100, 100]
  );

  doc.barChart("ARR por marco de clientes (R$ milhões)", ["100", "500", "1k", "2k", "5k"], [
    0.11,
    0.58,
    1.14,
    2.4,
    6.24
  ]);

  doc.heading("15. Cenários de valuation (ilustrativo)");
  doc.para(
    "Múltiplos típicos SaaS B2B SMB: 4–8x ARR (early), 6–12x ARR (com churn < 3% e growth > 40% YoY). Não é recomendação de investimento."
  );
  doc.table(
    ["ARR", "Múltiplo 5x", "Múltiplo 8x", "Nota"],
    [
      ["R$ 600k", "R$ 3,0M", "R$ 4,8M", "Seed / pré-seed"],
      ["R$ 2,4M", "R$ 12M", "R$ 19M", "Série A SMB"],
      ["R$ 6M+", "R$ 30M+", "R$ 48M+", "Escala LATAM"]
    ],
    [70, 80, 80, 150]
  );

  doc.heading("16. Riscos e mitigação");
  doc.table(
    ["Risco", "Impacto", "Mitigação"],
    [
      ["Dependência Meta API", "Alto", "Multi-plataforma roadmap; cache local"],
      ["Churn em SMB", "Alto", "Onboarding, CS, valor ranking+alertas"],
      ["Concorrente global entra BR", "Médio", "NF/PIX, suporte, preço BRL"],
      ["Custo IA escala", "Médio", "Limites por plano; batch jobs"],
      ["Regulação dados", "Médio", "LGPD, DPA, hosting BR/EU"]
    ],
    [120, 60, 200]
  );

  doc.heading("17.1 Roadmap visual por trimestre");
  doc.table(
    ["Trimestre", "Produto", "Growth", "Métrica norte"],
    [
      ["2026 Q3", "Ranking GA, bugs billing", "20 entrevistas", "30 trials/sem"],
      ["2026 Q4", "Aprendizados v1", "50 pagantes", "MRR R$ 8k"],
      ["2027 Q1", "WhatsApp insights", "Afiliados beta", "MRR R$ 25k"],
      ["2027 Q2", "Portal cliente", "SEO + parcerias", "MRR R$ 55k"],
      ["2027 Q3", "Apps/Games presets", "LATAM research", "MRR R$ 95k"],
      ["2027 Q4", "TikTok sync beta", "1000 clientes path", "MRR R$ 140k"],
      ["2028 H1", "IA RAG aprendizados", "Espanhol LATAM", "MRR R$ 200k+"]
    ],
    [55, 130, 100, 100]
  );

  doc.heading("17. Roadmap 24 meses");
  doc.table(
    ["Fase", "Período", "Entregas"],
    [
      ["Fase 1", "0–6m", "Ranking criativos GA, billing estável, 100 clientes"],
      ["Fase 2", "6–12m", "Aprendizados, WhatsApp insights, portal cliente"],
      ["Fase 3", "12–18m", "Apps & Games presets, TikTok beta, afiliados"],
      ["Fase 4", "18–24m", "IA RAG, automações inteligentes, LATAM espanhol"]
    ],
    [55, 55, 320]
  );

  doc.heading("18. Plano de execução imediato");
  doc.bullet([
    "Q3 2026: validar pricing com 20 entrevistas de gestores; medir uso ranking.",
    "Q3–Q4: lançar aprendizados v1 + templates WhatsApp cliente.",
    "Investimento mínimo viável: 2 devs + 1 growth (founder) por 12 meses.",
    "KPIs: MRR, churn logo, activation (sync+ranking), NPS, CAC payback < 6 meses."
  ]);

  doc.newPage();
  doc.heading("Apêndice A — Fontes e referências");
  doc.bullet([
    "IAB Brasil — Digital Adspend 2026 (ano-base 2025): R$ 42,7 bi, +12,7% — exame.com/marketing",
    "CENP-Meios 2025: R$ 28,9 bi via agências; internet > 40% — adtrend.com.br",
    "Research and Markets: US$ 19,28 bi ad digital BR 2026 — researchandmarkets.com",
    "Madgicx pricing: academy.madgicx.com — Pro Complete US$ 99+, Tracking Pro US$ 49",
    "Motion: motionapp.com — Free/Starter US$ 250/mês",
    "Foreplay: foreplay.co/pricing — US$ 49–459/mês",
    "Reportei: reportei.com — planos desde R$ 74,90/mês",
    "mLabs Analytics: mlabsanalytics.io — US$ 39,90–69,90/marca/mês"
  ]);
  doc.para(
    "Estimativas SAM/SOM, personas, unit economics e projeções financeiras são modelagens internas para planejamento estratégico. Recomenda-se validação com 20+ entrevistas de gestores e 3 meses de dados reais de CAC/churn antes de decisões de investimento.",
    9
  );

  doc.heading("19. Conclusão");
  doc.para(
    "O AI Traffic App ocupa um espaço claro: sistema operacional brasileiro para gestão de tráfego, com ranking de criativos e billing local, abaixo do custo de empilhar Motion + Reportei + ferramentas avulsas. O mercado digital BR cresce double-digit; a janela é capturar gestores antes que players globais localizem preço. Próximo passo crítico: validar aprendizados e WhatsApp com 30 usuários pagantes e refinar CAC com campanhas reais."
  );

  doc.para("Fontes citadas: IAB Brasil Digital Adspend 2026; CENP-Meios 2025; madgicx.com/academy; motionapp.com; foreplay.co/pricing; reportei.com; mlabsanalytics.io. Estimativas SAM/SOM e financeiras são modelagens internas.", 8);

  await doc.save();
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});

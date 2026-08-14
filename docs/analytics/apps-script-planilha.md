# Planilha de cadastros (Google Sheets via Apps Script)

Registro comercial da Orion sobre os próprios clientes: **uma linha por pessoa**,
atualizada pelo e-mail conforme o status muda (`cadastrado` → `trial` → `assinante`
→ `cancelado`…).

## ⚠️ Antes de tudo: o que pode e o que não pode virar remarketing

Esta planilha registra **todo mundo que se cadastra**, tenha aceitado os cookies ou
não. Isso é legítimo porque é o registro dos seus próprios clientes — a base legal é
execução de contrato (LGPD art. 7º, V), a mesma de uma nota fiscal ou de um CRM.

**Publicidade é outra coisa.** No momento em que a lista sai daqui e entra no Meta
como público personalizado, ela vira tratamento para publicidade — e aí precisa de
consentimento. Por isso existe a coluna `consentimento`:

> **Antes de subir a planilha como público no Meta, filtre `consentimento = sim`.**
> Subir a lista inteira quebra a escolha de LGPD estrita do projeto.

A coluna é preenchida sozinha, com o que a pessoa escolheu no banner de cookies no
momento do cadastro.

## 1. Criar a planilha

1. Crie uma planilha nova no Google Sheets.
2. Renomeie a primeira aba para **`Cadastros`** (o script usa esse nome).
3. Não precisa criar o cabeçalho à mão — o script cria na primeira execução.

## 2. Colar o script

Na planilha: **Extensões → Apps Script**, apague o conteúdo e cole:

```javascript
// Webhook de cadastros da Orion. Upsert por e-mail: uma linha por pessoa.
// Publique como Web App (Implantar → Nova implantação → Web app):
//   Executar como: Eu
//   Quem tem acesso: Qualquer pessoa
// "Qualquer pessoa" é exigência do Google pra aceitar POST de fora; o segredo
// abaixo é o que de fato protege o endpoint.

const SEGREDO = 'COLE_AQUI_O_MESMO_VALOR_DE_CRM_SHEET_WEBHOOK_SECRET';
const ABA = 'Cadastros';

const COLUNAS = [
  'data_cadastro', 'nome', 'email', 'telefone', 'status', 'plano', 'valor',
  'ciclo', 'metodo_cadastro', 'consentimento', 'utm_source', 'utm_medium',
  'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid', 'atualizado_em'
];

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    if (body.secret !== SEGREDO) {
      return json({ ok: false, error: 'unauthorized' });
    }

    const row = body.row || {};
    const email = String(row.email || '').toLowerCase().trim();
    if (!email) return json({ ok: false, error: 'missing_email' });

    // Trava: dois webhooks ao mesmo tempo poderiam criar a mesma pessoa duas vezes.
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      const sheet = pegarAba();
      const linha = acharLinhaPorEmail(sheet, email);

      if (linha === -1) {
        sheet.appendRow(COLUNAS.map(function (c) { return row[c] || ''; }));
      } else {
        atualizarLinha(sheet, linha, row);
      }
      return json({ ok: true });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function pegarAba() {
  const planilha = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = planilha.getSheetByName(ABA);
  if (!sheet) sheet = planilha.insertSheet(ABA);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(COLUNAS);
    sheet.getRange(1, 1, 1, COLUNAS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function acharLinhaPorEmail(sheet, email) {
  if (sheet.getLastRow() < 2) return -1;
  const col = COLUNAS.indexOf('email') + 1;
  const valores = sheet.getRange(2, col, sheet.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < valores.length; i++) {
    if (String(valores[i][0]).toLowerCase().trim() === email) return i + 2;
  }
  return -1;
}

// Só sobrescreve o que veio preenchido: uma atualização de status não pode apagar
// o telefone ou a origem que foram gravados lá no cadastro.
function atualizarLinha(sheet, linha, row) {
  const atuais = sheet.getRange(linha, 1, 1, COLUNAS.length).getValues()[0];

  const novos = COLUNAS.map(function (coluna, i) {
    // data_cadastro é imutável: é a data em que a pessoa entrou, não muda nunca.
    if (coluna === 'data_cadastro') return atuais[i] || row[coluna] || '';
    const valor = row[coluna];
    return (valor === undefined || valor === null || valor === '') ? atuais[i] : valor;
  });

  sheet.getRange(linha, 1, 1, COLUNAS.length).setValues([novos]);
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

## 3. Definir o segredo

1. Gere um segredo qualquer, longo e aleatório. No terminal:
   ```bash
   openssl rand -hex 32
   ```
2. Substitua `COLE_AQUI_O_MESMO_VALOR_DE_CRM_SHEET_WEBHOOK_SECRET` por ele.
3. Guarde: é o mesmo valor que vai em `CRM_SHEET_WEBHOOK_SECRET`.

## 4. Publicar como Web App

1. **Implantar → Nova implantação**.
2. Engrenagem → tipo **App da Web**.
3. Configure:
   - **Executar como:** Eu (seu e-mail)
   - **Quem tem acesso:** Qualquer pessoa
4. **Implantar** e autorize (o Google vai avisar que o app não é verificado — é seu
   próprio script, siga em "Avançado → Acessar projeto").
5. Copie a **URL do app da Web** (termina em `/exec`).

## 5. Configurar no projeto

No `.env` (e nas variáveis de ambiente da Vercel):

```bash
CRM_SHEET_WEBHOOK_URL="https://script.google.com/macros/s/AKfy.../exec"
CRM_SHEET_WEBHOOK_SECRET="o-mesmo-segredo-do-passo-3"
```

Sem essas duas variáveis o sync fica desligado em silêncio — nada quebra, só não
grava nada.

## Testar

Da raiz do projeto (lê a URL e o segredo do próprio `.env`, então não precisa colar
credencial no terminal):

```bash
node -e "
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const url = (env.match(/^CRM_SHEET_WEBHOOK_URL=\"(.*)\"/m) || [])[1];
const secret = (env.match(/^CRM_SHEET_WEBHOOK_SECRET=\"(.*)\"/m) || [])[1];
const row = { email: 'teste@exemplo.com', nome: 'Teste', status: 'cadastrado', consentimento: 'sim' };
fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ secret, row }),
  redirect: 'follow'
})
  .then((r) => r.text())
  .then((t) => console.log(t.includes('\"ok\":true') ? 'OK' : 'FALHOU: ' + t.replace(/\s+/g, ' ').slice(0, 200)));
"
```

Esperado: `OK` e a linha aparecendo na planilha. Rode duas vezes — na segunda ela
deve **atualizar** a linha, não criar outra.

> **Não use `curl` aqui.** O Apps Script responde 302 e o `curl -L` refaz o POST sem
> `Content-Length`, o que devolve `411 Length Required`; com `--post302` ele reposta
> para o destino do redirect e o script quebra. Nenhum dos dois é problema da sua
> configuração, e os dois já custaram tempo. O `fetch` acima é a mesma chamada que o
> `pushSignupSheetRow` faz em produção, então testa o caminho real.

### Erros que já aconteceram

| O que aparece | O que é |
|---|---|
| `{"ok":false,"error":"unauthorized"}` | O segredo do script e o do `.env` estão diferentes. |
| Página HTML com `TypeError: "" is not a function (linha 1)` | Sobrou texto solto no topo do `Código.gs` (o segredo colado fora das aspas, por exemplo). Selecione tudo, cole o script inteiro de novo e **reimplante como nova versão**. |
| Página HTML de erro mesmo com o código certo | A implantação ainda serve a versão antiga. Implantar → Gerenciar implantações → lápis → Versão: Nova versão. |

## Reimplantação (pegadinha comum)

Ao editar o script, **Implantar → Gerenciar implantações → editar (lápis) → Versão:
Nova versão**. Se você criar uma implantação nova do zero, a URL muda e o `.env`
precisa ser atualizado junto.

## Quando algo não aparece

O envio passa pela fila de jobs (`billing_jobs`, tipo `crm_sheet_sync`), com 5
tentativas e backoff. Para investigar:

```sql
SELECT id, status, attempts, "lastError", payload
FROM billing_jobs
WHERE type = 'crm_sheet_sync'
ORDER BY "createdAt" DESC
LIMIT 20;
```

`status = 'failed'` com `attempts = 5` significa que esgotou as tentativas —
`lastError` diz o motivo.

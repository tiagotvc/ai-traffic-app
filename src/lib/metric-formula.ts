const TOKEN_RE = /[a-zA-Z_][a-zA-Z0-9_.]*|\d+(?:\.\d+)?|[+\-*/()]/g;

type Token =
  | { type: "num"; value: number }
  | { type: "var"; name: string }
  | { type: "op"; value: string }
  | { type: "paren"; value: string };

function tokenize(formula: string): Token[] | null {
  const tokens: Token[] = [];
  const re = new RegExp(TOKEN_RE.source, "g");
  let m: RegExpExecArray | null;
  let last = 0;
  while ((m = re.exec(formula)) !== null) {
    if (m.index > last && formula.slice(last, m.index).trim()) return null;
    last = re.lastIndex;
    const t = m[0];
    if (/^\d/.test(t)) tokens.push({ type: "num", value: Number(t) });
    else if ("+-*/()".includes(t)) {
      if (t === "(" || t === ")") tokens.push({ type: "paren", value: t });
      else tokens.push({ type: "op", value: t });
    } else tokens.push({ type: "var", name: t });
  }
  if (last < formula.length && formula.slice(last).trim()) return null;
  return tokens;
}

function precedence(op: string) {
  if (op === "+" || op === "-") return 1;
  if (op === "*" || op === "/") return 2;
  return 0;
}

function toRpn(tokens: Token[]): Token[] | null {
  const out: Token[] = [];
  const stack: Token[] = [];
  for (const t of tokens) {
    if (t.type === "num" || t.type === "var") out.push(t);
    else if (t.type === "op") {
      while (stack.length) {
        const top = stack[stack.length - 1];
        if (top.type !== "op" || precedence(top.value) < precedence(t.value)) break;
        out.push(stack.pop()!);
      }
      stack.push(t);
    } else if (t.type === "paren") {
      if (t.value === "(") stack.push(t);
      else {
        while (stack.length) {
          const top = stack[stack.length - 1];
          if (top.type === "paren" && top.value === "(") break;
          if (top.type !== "op") break;
          out.push(stack.pop()!);
        }
        if (!stack.length) return null;
        stack.pop();
      }
    }
  }
  while (stack.length) {
    const top = stack.pop()!;
    if (top.type === "paren") return null;
    out.push(top);
  }
  return out;
}

export function validateFormula(formula: string, allowedVars: Set<string>): string | null {
  const trimmed = formula.trim();
  if (!trimmed) return "Fórmula vazia";
  const tokens = tokenize(trimmed);
  if (!tokens?.length) return "Fórmula inválida";
  for (const t of tokens) {
    if (t.type === "var" && !allowedVars.has(t.name)) return `Variável desconhecida: ${t.name}`;
  }
  const rpn = toRpn(tokens);
  if (!rpn) return "Fórmula inválida";
  return null;
}

export function evaluateFormula(
  formula: string,
  vars: Record<string, number>
): number | null {
  const tokens = tokenize(formula.trim());
  if (!tokens?.length) return null;
  const rpn = toRpn(tokens);
  if (!rpn) return null;
  const stack: number[] = [];
  for (const t of rpn) {
    if (t.type === "num") stack.push(t.value);
    else if (t.type === "var") {
      const v = vars[t.name];
      if (!Number.isFinite(v)) return null;
      stack.push(v);
    } else if (t.type === "op") {
      const b = stack.pop();
      const a = stack.pop();
      if (a === undefined || b === undefined) return null;
      if (t.value === "+") stack.push(a + b);
      else if (t.value === "-") stack.push(a - b);
      else if (t.value === "*") stack.push(a * b);
      else if (t.value === "/") {
        if (b === 0) return null;
        stack.push(a / b);
      }
    }
  }
  if (stack.length !== 1 || !Number.isFinite(stack[0])) return null;
  return stack[0];
}

export function formulaAllowedVarNames(): Set<string> {
  return new Set([
    "spend",
    "impressions",
    "reach",
    "frequency",
    "clicks",
    "ctr",
    "cpc",
    "cpm",
    "conversions",
    "cpa",
    "cpl",
    "leads",
    "roas",
    "messages",
    "cpmsg"
  ]);
}

export function actionVarName(actionType: string): string {
  return `action_${actionType.replace(/\./g, "_")}`;
}

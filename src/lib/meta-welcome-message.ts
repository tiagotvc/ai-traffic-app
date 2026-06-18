/** Parse Meta page_welcome_message payloads into user-editable greeting + icebreakers. */

export type ParsedWelcomeMessage = {
  greeting: string;
  icebreakers: string[];
};

function pushIcebreaker(out: string[], raw: unknown) {
  if (typeof raw === "string" && raw.trim()) {
    out.push(raw.trim());
    return;
  }
  if (!raw || typeof raw !== "object") return;
  const row = raw as Record<string, unknown>;
  const text = row.title ?? row.response ?? row.text ?? row.question ?? row.autofill_message;
  if (typeof text === "string" && text.trim()) out.push(text.trim());
}

function extractFromObject(obj: Record<string, unknown>): ParsedWelcomeMessage | null {
  const greetingCandidates: unknown[] = [
    obj.text,
    obj.greeting,
    obj.autofill_message,
    obj.message,
    obj.welcome_message
  ];

  let greeting = "";
  for (const c of greetingCandidates) {
    if (typeof c === "string" && c.trim()) {
      greeting = c.trim();
      break;
    }
    if (c && typeof c === "object") {
      const nested = (c as Record<string, unknown>).text;
      if (typeof nested === "string" && nested.trim()) {
        greeting = nested.trim();
        break;
      }
    }
  }

  const icebreakers: string[] = [];
  for (const key of ["ice_breakers", "icebreakers", "quick_replies"] as const) {
    const list = obj[key];
    if (!Array.isArray(list)) continue;
    for (const item of list) pushIcebreaker(icebreakers, item);
  }

  if (!greeting && icebreakers.length) greeting = icebreakers[0]!;

  if (!greeting && !icebreakers.length) return null;
  return { greeting, icebreakers: [...new Set(icebreakers)] };
}

/** Returns null when raw looks like opaque API JSON with no readable message. */
export function parseMetaWelcomeMessage(raw: unknown): ParsedWelcomeMessage | null {
  if (raw == null) return null;

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return parseMetaWelcomeMessage(JSON.parse(trimmed));
      } catch {
        return looksLikeJsonBlob(trimmed) ? null : { greeting: trimmed, icebreakers: [] };
      }
    }
    return { greeting: trimmed, icebreakers: [] };
  }

  if (typeof raw === "object") {
    return extractFromObject(raw as Record<string, unknown>);
  }

  return null;
}

function looksLikeJsonBlob(text: string): boolean {
  return (
    text.includes('"type"') ||
    text.includes('"VISUAL_EDITOR"') ||
    text.includes('"customer_action_type"') ||
    text.includes('"quick_replies"')
  );
}

export function isOpaqueWelcomePayload(text: string | null | undefined): boolean {
  if (!text?.trim()) return false;
  return looksLikeJsonBlob(text.trim()) || (text.trim().startsWith("{") && text.length > 120);
}

export function normalizeMessageTemplateDraft(
  tpl: {
    channel: "whatsapp" | "messenger" | "instagram";
    templateId: string | null;
    greeting: string;
    icebreakers: string[];
  } | null
): typeof tpl {
  if (!tpl) return null;
  const parsed = parseMetaWelcomeMessage(tpl.greeting);
  if (parsed && (isOpaqueWelcomePayload(tpl.greeting) || !tpl.greeting.trim())) {
    return {
      ...tpl,
      greeting: parsed.greeting,
      icebreakers: tpl.icebreakers.length ? tpl.icebreakers : parsed.icebreakers
    };
  }
  if (isOpaqueWelcomePayload(tpl.greeting)) {
    return { ...tpl, greeting: "", icebreakers: tpl.icebreakers };
  }
  return tpl;
}

export function resolveAdMessagePreview(input: {
  messageTemplate?: {
    channel?: string;
    greeting?: string;
    icebreakers?: string[];
  } | null;
  whatsappWelcomeMessage?: string | null;
}): ParsedWelcomeMessage | null {
  const tpl = input.messageTemplate;
  if (tpl?.greeting?.trim() && !isOpaqueWelcomePayload(tpl.greeting)) {
    return {
      greeting: tpl.greeting.trim(),
      icebreakers: (tpl.icebreakers ?? []).filter(Boolean)
    };
  }
  const parsedTpl = tpl?.greeting ? parseMetaWelcomeMessage(tpl.greeting) : null;
  if (parsedTpl?.greeting) return parsedTpl;

  const fromLegacy = input.whatsappWelcomeMessage
    ? parseMetaWelcomeMessage(input.whatsappWelcomeMessage)
    : null;
  if (fromLegacy?.greeting) return fromLegacy;

  return null;
}

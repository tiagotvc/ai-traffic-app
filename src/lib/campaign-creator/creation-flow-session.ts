const FLOW_MODE_KEY = "campaign-creator-flow-mode";

/** Persist chosen creation mode across URL/query resets during the same session. */
export function readCommittedCreationMode(): string | null {
  try {
    return sessionStorage.getItem(FLOW_MODE_KEY);
  } catch {
    return null;
  }
}

export function commitCreationMode(mode: string) {
  try {
    sessionStorage.setItem(FLOW_MODE_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function clearCommittedCreationMode() {
  try {
    sessionStorage.removeItem(FLOW_MODE_KEY);
  } catch {
    /* ignore */
  }
}

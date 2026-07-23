"use client";

import { useCallback, useState } from "react";

import { lastNDaysRange, type DateRange } from "@/components/GoogleDateRangePicker";

/**
 * Intervalo de datas COMPARTILHADO entre as telas Google de um mesmo cliente.
 * Cache em memória por clientId: persiste na navegação SPA (campanha → grupo →
 * palavras-chave…) para o filtro de data ser HERDADO, e reseta no refresh completo
 * (volta ao default de 30 dias). Padrão idêntico ao `useState`.
 *
 * Nunca é escrito no servidor (só via interação do usuário), então o cache de módulo
 * fica vazio no SSR → sem vazamento entre requisições e sem hidratação divergente.
 */
const cache = new Map<string, DateRange>();

export function useGoogleDateRange(clientId: string): [DateRange, (r: DateRange) => void] {
  const [range, setRangeState] = useState<DateRange>(
    () => cache.get(clientId) ?? lastNDaysRange(30)
  );

  const setRange = useCallback(
    (r: DateRange) => {
      cache.set(clientId, r);
      setRangeState(r);
    },
    [clientId]
  );

  return [range, setRange];
}

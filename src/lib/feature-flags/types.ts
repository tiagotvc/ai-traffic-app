/** Mapa de overrides de feature flags de plataforma. Ausente = habilitado (default ON). */
export type FeatureFlagMap = Record<string, boolean>;

/**
 * Nó da árvore de feature flags (Módulo → Funcionalidade → sub-funcionalidade).
 * `id` é hierárquico por pontos (ex.: "brain", "brain.chat"), o que define os ancestrais.
 */
export type FeatureNode = {
  /** Identificador estável e hierárquico (pontos = hierarquia), ex.: "brain.chat". */
  id: string;
  /** Rótulo exibido no admin (PT-BR). */
  label: string;
  /** Descrição curta opcional. */
  description?: string;
  /** Filhos (sub-funcionalidades). */
  children?: FeatureNode[];
  /** Outras features das quais esta depende (interdependência). */
  dependsOn?: string[];
};

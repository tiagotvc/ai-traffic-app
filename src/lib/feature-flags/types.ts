/** Rollout mode for a platform feature flag. */
export type FeatureRolloutMode = "off" | "admin_only" | "global" | "specific_users";

/** Stored override for a single feature (absent = inherit parent / default global at root). */
export type FeatureFlagEntry = {
  mode: FeatureRolloutMode;
  /** Required when mode is `specific_users`. */
  allowedUserIds?: string[];
};

/**
 * Raw platform flag overrides (admin storage).
 * Legacy boolean values are migrated at read time: `false` → off, `true` → global.
 */
export type FeatureFlagConfigMap = Record<string, FeatureFlagEntry | boolean>;

/** Per-user resolved booleans sent to the client (all registry ids). */
export type ResolvedFeatureMap = Record<string, boolean>;

/** @deprecated Use FeatureFlagConfigMap (admin) or ResolvedFeatureMap (client). */
export type FeatureFlagMap = FeatureFlagConfigMap | ResolvedFeatureMap;

export type FeatureFlagContext = {
  userId: string;
  isPlatformAdmin: boolean;
};

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

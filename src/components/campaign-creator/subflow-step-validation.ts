type SubflowValidation = {
  validateCurrent: () => string | null;
  isLast: boolean;
};

/** Section-scoped validation within a subflow; full step validation only on the last section. */
export function resolveSubflowStepError(
  subflow: SubflowValidation | null | undefined,
  validateFullStep: () => string | null
): string | null {
  if (!subflow) return validateFullStep();
  const sectionErr = subflow.validateCurrent();
  if (sectionErr) return sectionErr;
  if (subflow.isLast) return validateFullStep();
  return null;
}

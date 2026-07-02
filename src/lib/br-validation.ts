/** Validações do passo de dados do checkout. O checkout também atende estrangeiro, então o
 * documento é campo livre ("Documento", sem validação de dígitos de CPF/CNPJ) e o telefone
 * aceita formato internacional. Usado no client e nos endpoints de billing. */

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

/** Telefone: 8 a 15 dígitos (faixa do E.164), ignorando máscara, espaços e prefixo "+". */
export function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}

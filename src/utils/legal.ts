/**
 * Versão vigente dos termos — só para exibição/link no frontend.
 * A versão que efetivamente fica registrada no banco é decidida
 * pelo servidor (current_terms_version() em SQL), nunca pelo
 * valor que o cliente enviar — evita que alguém forje a versão
 * "aceita" via uma chamada direta à API.
 */
export const TERMS_VERSION = 'v1-2026-09';

/**
 * O frontend só informa QUE o aceite aconteceu (booleano). Data e
 * versão são decididas e gravadas pelo servidor no momento em que a
 * ação protegida (agendar / entrar na equipe) realmente acontece —
 * nunca a partir do que o cliente mandar.
 */
export function buildConsentMetadata() {
  return { accepted_terms: true };
}

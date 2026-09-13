/**
 * Nunca deixa um erro cru do Postgres/Supabase (ex: "invalid input
 * syntax for type uuid", "new row violates row-level security policy",
 * "duplicate key value violates unique constraint") chegar à tela.
 *
 * As únicas mensagens de erro "cruas" que são seguras de mostrar são as
 * que nós mesmos escrevemos em português dentro das funções SQL
 * (RAISE EXCEPTION), porque foram desenhadas para o usuário final.
 * Qualquer outra coisa cai no fallback genérico.
 */
const SAFE_MESSAGE_PATTERNS = [
  /reservado/i,
  /inválid[oa]/i,
  /inativ[oa]/i,
  /logad[oa]/i,
  /expirad[oa]/i,
  /não encontrad[oa]/i,
  /não p[oô]de mais/i,
  /não pode mais/i,
  /já possui agendamentos/i,
  /não pode ser exclu[íi]d[oa]/i,
  /indispon[íi]vel/i,
  /e-mail ou senha/i,
  /já existe uma conta/i,
  /bloqueada?/i,
  /bloqueado?/i,
];

export function friendlyError(err: unknown, fallback = 'Algo deu errado. Tente novamente em instantes.'): string {
  const message = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
  if (message && SAFE_MESSAGE_PATTERNS.some((p) => p.test(message))) {
    return message;
  }
  return fallback;
}

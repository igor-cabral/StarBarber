/**
 * Constrói uma URL pública "tenant-aware" (com o slug da barbearia).
 * Único ponto de verdade para montar esses links — evita espalhar
 * `/b/${slug}/...` hardcoded pelo projeto.
 *
 * publicPath('barbearia-prime', '/agendar') -> '/b/barbearia-prime/agendar'
 * publicPath('barbearia-prime')             -> '/b/barbearia-prime'
 */
export function publicPath(slug: string, subpath: string = ''): string {
  const cleanSubpath = subpath && !subpath.startsWith('/') ? `/${subpath}` : subpath;
  return `/b/${slug}${cleanSubpath}`;
}

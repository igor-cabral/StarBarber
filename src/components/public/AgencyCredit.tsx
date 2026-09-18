import { ExternalLink } from 'lucide-react';

export function AgencyCredit() {
  return (
    <div className="flex items-center gap-3 text-xs text-white/60">
      <span>Desenvolvido por</span>
      <a
        href="https://igorcabral.com.br"
        target="_blank"
        rel="noreferrer"
        aria-label="Igor Cabral Design & Web"
        className="group inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 transition-colors hover:border-white/20 hover:bg-white/[0.08]"
      >
        <img src="/brand/igor-cabral-logo.png" alt="Igor Cabral Design & Web" className="h-5 w-auto max-w-[112px] object-contain" />
        <ExternalLink size={12} className="opacity-50 transition-opacity group-hover:opacity-100" />
      </a>
    </div>
  );
}

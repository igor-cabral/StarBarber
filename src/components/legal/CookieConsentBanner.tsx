import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

const STORAGE_KEY = 'cookie_notice_acknowledged';

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  function acknowledge() {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 px-5 py-4 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <p className="text-sm text-graphite">
          Usamos apenas cookies essenciais para manter você logado. Não usamos rastreamento de terceiros. Saiba mais
          na nossa <Link to="/cookies" className="underline">Política de Cookies</Link>.
        </p>
        <Button size="sm" onClick={acknowledge} className="shrink-0">
          Entendi
        </Button>
      </div>
    </div>
  );
}

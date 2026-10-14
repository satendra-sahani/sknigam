'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { usePathname } from 'next/navigation';
import { PollsticsHeader } from './PollsticsHeader';
import { PollsticsFooter } from './PollsticsFooter';

const LangCtx = createContext<{ lang: string; setLang: (l: string) => void }>({ lang: 'hi', setLang: () => {} });

export function useLang() {
  return useContext(LangCtx);
}

function deriveActiveNav(pathname: string | null): string {
  if (!pathname) return '';
  if (pathname === '/') return 'home';
  if (pathname === '/video') return 'video';
  if (pathname === '/article') return 'investigation';
  if (pathname.startsWith('/cat/')) return pathname.split('/')[2] || '';
  return '';
}

export function PollsticsShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const activeNav = deriveActiveNav(pathname);
  const [lang, setLangState] = useState('hi');

  useEffect(() => {
    try { const stored = localStorage.getItem('pn-lang'); if (stored) setLangState(stored); } catch {}
  }, []);

  const setLang = (l: string) => {
    setLangState(l);
    try { localStorage.setItem('pn-lang', l); } catch {}
  };

  return (
    <LangCtx.Provider value={{ lang, setLang }}>
      <div className="pn" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#fff' }}>
        <PollsticsHeader activeNav={activeNav} lang={lang} setLang={setLang} />
        <main className="pn-main" style={{ flex: 1 }}>
          {children}
        </main>
        <PollsticsFooter lang={lang} setLang={setLang} />
      </div>
    </LangCtx.Provider>
  );
}

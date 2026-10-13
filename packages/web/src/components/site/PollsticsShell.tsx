'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { PollsticsHeader } from './PollsticsHeader';
import { PollsticsFooter } from './PollsticsFooter';

const LangCtx = createContext<{ lang: string; setLang: (l: string) => void }>({ lang: 'hi', setLang: () => {} });

export function useLang() {
  return useContext(LangCtx);
}

export function PollsticsShell({
  activeNav,
  children,
}: {
  activeNav?: string;
  children: React.ReactNode | ((lang: string, L: (h: string, e: string) => string) => React.ReactNode);
}) {
  const [lang, setLangState] = useState('hi');

  useEffect(() => {
    try { const stored = localStorage.getItem('pn-lang'); if (stored) setLangState(stored); } catch {}
  }, []);

  const setLang = (l: string) => {
    setLangState(l);
    try { localStorage.setItem('pn-lang', l); } catch {}
  };

  const L = (h: string, e: string) => (lang === 'hi' ? h : e);

  return (
    <LangCtx.Provider value={{ lang, setLang }}>
      <div className="pn" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#fff' }}>
        <PollsticsHeader activeNav={activeNav} lang={lang} setLang={setLang} />
        <main className="pn-main" style={{ flex: 1 }}>
          {typeof children === 'function' ? children(lang, L) : children}
        </main>
        <PollsticsFooter lang={lang} setLang={setLang} />
      </div>
    </LangCtx.Provider>
  );
}

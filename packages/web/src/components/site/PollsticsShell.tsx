'use client';

import { PollsticsHeader } from './PollsticsHeader';
import { PollsticsFooter } from './PollsticsFooter';

export function PollsticsShell({
  activeNav,
  lang,
  setLang,
  children,
}: {
  activeNav?: string;
  lang: string;
  setLang: (l: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="pn" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#fff' }}>
      <PollsticsHeader activeNav={activeNav} lang={lang} setLang={setLang} />
      <main className="pn-main" style={{ flex: 1 }}>
        {children}
      </main>
      <PollsticsFooter lang={lang} setLang={setLang} />
    </div>
  );
}

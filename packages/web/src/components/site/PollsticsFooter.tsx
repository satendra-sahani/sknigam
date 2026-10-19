'use client';

import Link from 'next/link';

export function PollsticsFooter({
  lang,
  setLang,
}: {
  lang: string;
  setLang: (l: string) => void;
}) {
  const hi = lang === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);

  return (
    <footer className="pn-footer">
      <div className="pn-footer-inner">
        {/* Brand row */}
        <div className="pn-footer-brand">
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 14, color: '#fff' }}>
            <img src="/assets/pollstics/logo.png" alt="Pollstics" />
            <span>POLLSTICS</span>
          </Link>
          <span className="line" />
        </div>

        {/* Columns */}
        <div className="pn-footer-cols">
          <div className="pn-footer-about">
            <span className="col-title">{L('हमारे बारे में', 'About us')}</span>
            <p>{L(
              'पोलस्टिक्स एक स्वतंत्र हिंदी डिजिटल न्यूज़ प्लेटफ़ॉर्म है, जो राजनीति, समाज, दुनिया और संस्कृति की खबरें तथ्यों और ज़िम्मेदारी के साथ पाठकों तक पहुँचाता है। हमारा मकसद निष्पक्ष, सटीक और भरोसेमंद पत्रकारिता के ज़रिए हर पाठक तक सही जानकारी पहुँचाना है।',
              'Pollstics is an independent Hindi digital news platform that brings politics, society, the world and culture to its readers with facts and responsibility. Our mission is to deliver accurate, trustworthy and unbiased journalism to every reader.',
            )}</p>
          </div>

          <div className="pn-footer-social-col">
            <span className="col-title">{L('सोशल मीडिया', 'Social media')}</span>
            <div className="pn-social-icons">
              <a href="#" aria-label="YouTube">
                <svg width="26" height="26" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="4" fill="currentColor" /><path d="M10 9l5 3-5 3z" fill="#141414" /></svg>
              </a>
              <a href="#" aria-label="X">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4l16 16M20 4 4 20" /></svg>
              </a>
              <a href="#" aria-label="Facebook">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v7h4v-7h3l1-4h-4V8.5a.5.5 0 0 1 .5-.5z" /></svg>
              </a>
              <a href="#" aria-label="Instagram">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" /></svg>
              </a>
              <a href="#" aria-label="WhatsApp">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21l1.6-4.6A9 9 0 1 1 8 19.6z" /><path d="M9 9.5c.5 2 2.5 4 4.5 4.5l1-1.2 2 .9-.3 1.6c-3.5.5-8-4-7.5-7.5L10.3 7.5l.9 2z" /></svg>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pn-footer-bottom">
          <span>&copy; 2026 Pollstics. {L('सर्वाधिकार सुरक्षित।', 'All rights reserved.')}</span>
          <span className="spacer" />
          <div className="pn-footer-lang">
            <button onClick={() => setLang('hi')}>हिंदी</button>
            <span>|</span>
            <button onClick={() => setLang('en')}>English</button>
          </div>
        </div>
      </div>
    </footer>
  );
}

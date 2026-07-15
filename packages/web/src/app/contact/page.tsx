/**
 * Contact — Pollistics Management Consulting.
 * Port of the handoff Contact.html: banner, contact info column + message form,
 * and the office map band. Styling via <SiteShell>.
 */
import { SiteShell } from '@/components/site/SiteShell';
import { ContactForm } from '@/components/site/ContactForm';

export const metadata = {
  title: 'Contact — Pollistics Management Consulting',
};

const svg = (d: React.ReactNode) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);

const INFO = [
  { h: 'Call us', p: '+91 96500 60882', icon: <path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014 2h3a2 2 0 012 1.7c.1 1 .4 1.9.7 2.8a2 2 0 01-.4 2.1L8.1 9.9a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.6 2.8.7A2 2 0 0122 16.9z" /> },
  { h: 'Email', p: 'strategy@pollistics.in', icon: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></> },
  { h: 'Office', p: 'New Delhi · Mumbai · Lucknow', icon: <><path d="M12 2a7 7 0 017 7c0 5-7 13-7 13S5 14 5 9a7 7 0 017-7z" /><circle cx="12" cy="9" r="2.5" /></> },
  { h: 'Hours', p: 'Mon – Sat · 9:30am – 7:00pm IST', icon: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></> },
];

export default function ContactPage() {
  return (
    <SiteShell active="contact" footer="default">
      {/* BANNER */}
      <section className="c-banner">
        <span className="deco" style={{ width: 360, height: 360, right: -120, top: -140 }} />
        <span className="deco" style={{ width: 220, height: 220, left: '8%', bottom: -120 }} />
        <div className="page"><h1>Contact Us</h1><p>Planning a campaign or a publication? Let&apos;s talk.</p></div>
      </section>

      {/* CONTACT */}
      <section className="section">
        <div className="page">
          <div className="c-wrap">
            <div className="c-info">
              <div className="c-divider"><span className="dash"><i className="d3" /><i className="d2" /><i className="d1" /></span><span className="pill-label">Get in touch</span></div>
              <h2>We&apos;d love to <span className="o">hear from you.</span></h2>
              <p className="lead2">Reach out for campaign strategy, data &amp; analytics, or to publish with Pollistics Press. Our team responds within one working day.</p>
              {INFO.map((i) => (
                <div className="c-item" key={i.h}>
                  <div className="ic">{svg(i.icon)}</div>
                  <div><h5>{i.h}</h5><p>{i.p}</p></div>
                </div>
              ))}
              <div className="c-social">
                <a href="#" aria-label="Facebook"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H7v3h3v6h3v-6h3l1-3h-4v-2c0-.6.4-1 1-1z" /></svg></a>
                <a href="#" aria-label="X"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h3l-7 8 8 12h-6l-5-7-6 7H1l8-9L1 2h6l5 6z" /></svg></a>
                <a href="#" aria-label="LinkedIn"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5A2.5 2.5 0 002.5 6 2.5 2.5 0 005 8.5 2.5 2.5 0 007.5 6 2.5 2.5 0 004.98 3.5zM3 9h4v12H3zM10 9h3.8v1.7h.05c.53-1 1.83-2.05 3.76-2.05 4 0 4.74 2.64 4.74 6.07V21H18.5v-5.4c0-1.3 0-2.96-1.8-2.96-1.8 0-2.08 1.4-2.08 2.86V21H10z" /></svg></a>
              </div>
            </div>

            <ContactForm />
          </div>
        </div>
      </section>

      {/* MAP */}
      <section className="section map-band" style={{ paddingTop: 0 }}>
        <div className="page">
          <div className="mapph" style={{ display: 'block', position: 'relative', overflow: 'hidden', padding: 0 }}>
            <iframe
              title="Pollistics offices across India"
              src="https://www.google.com/maps?q=India&z=4&output=embed"
              style={{ width: '100%', height: '100%', border: 0, display: 'block', filter: 'grayscale(0.1)' }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
            <div style={{ position: 'absolute', left: '50%', bottom: 22, transform: 'translateX(-50%)', maxWidth: '92%', background: '#fff', color: 'var(--navy)', fontWeight: 700, padding: '12px 24px', borderRadius: 30, boxShadow: '0 16px 40px -16px rgba(15,39,66,.55)', textAlign: 'center', pointerEvents: 'none' }}>
              📍 New Delhi · Mumbai · Lucknow — war rooms across India
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

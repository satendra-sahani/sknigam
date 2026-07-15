/**
 * Services — Pollistics political consulting.
 * Port of the handoff Services.html: page hero, six core services, the full
 * capability map and a closing CTA band. Styling via <SiteShell>.
 */
import Link from 'next/link';
import { SiteShell } from '@/components/site/SiteShell';

export const metadata = {
  title: 'Our Political Consulting Services — Pollistics',
};

const svg = (d: React.ReactNode, w = 36) => (
  <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);

const CORE = [
  { h: 'Opinion Poll Surveys', p: 'Pre-poll, tracker and benchmark surveys with statistically-sound, booth-weighted sampling.', href: '/contact', icon: <><path d="M3 3v18h18" /><path d="M7 14l3-3 3 2 4-5" /></> },
  { h: 'Door-to-Door Campaigns', p: 'Trained karyakarta networks for household contact, voter-slip distribution and outreach.', href: '/contact', icon: <path d="M3 10l9-7 9 7v11h-6v-7H9v7H3z" /> },
  { h: 'War Room Strategy', p: 'A live command centre — real-time field data, sentiment heatmaps and rapid response.', href: '/contact', icon: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></> },
  { h: 'Social Media Management', p: 'Micro-targeted social campaigns, content war-rooms and reputation management at scale.', href: '/contact', icon: <><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M8 12h8 M12 8v8" /></> },
  { h: 'Digital Media Management', p: 'Programmatic ads, creative production and analytics-driven outreach for every platform.', href: '/contact', icon: <path d="M3 11l19-9-9 19-2-8-8-2z" /> },
  { h: 'Software & Technology', p: 'Voter-data platforms, the Pollistics app and bespoke election software for the field.', href: '/download', icon: <><rect x="3" y="4" width="18" height="14" rx="2" /><path d="M8 21h8 M12 18v3" /></> },
];

const CATS = [
  { h: 'Political Consulting', icon: <path d="M3 11l19-9-9 19-2-8-8-2z" />, items: ['Political Survey & Research', 'Door-to-Door Survey', 'Election Strategist', 'Campaign Management', 'Opinion Poll Survey', 'Exit Poll'] },
  { h: 'Communication & Media', icon: <><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M8 12h8 M12 8v8" /></>, items: ['Social Media Campaign', 'Digital Media Campaign', 'Political Advertising', 'Membership Drive', 'Voter Registration Drive', 'War Room'] },
  { h: 'Data, Tech & Software', icon: <><rect x="3" y="4" width="18" height="4" /><rect x="3" y="10" width="18" height="4" /><rect x="3" y="16" width="12" height="4" /></>, items: ['Voter Data & Analytics', 'Booth-level Research', 'Election Management Software', 'Voterlist Search Software', 'IT Advisory', 'Pollistics App'] },
];

export default function ServicesPage() {
  return (
    <SiteShell active="services" footer="default">
      {/* HERO */}
      <section className="phero">
        <div className="page phero-grid">
          <div>
            <span className="tag">Our services</span>
            <h1 style={{ marginTop: 18 }}>Political consulting, <span className="o">end to end.</span></h1>
            <p className="sub">From the first opinion poll to counting-day intelligence — every capability a modern Indian campaign needs, delivered by one data-driven team.</p>
            <div className="cta-row">
              <Link href="/contact" className="btn btn-coral">Book a strategy call →</Link>
              <a href="#categories" className="btn btn-ghost">All capabilities</a>
            </div>
          </div>
          <div className="phero-img">
            <img src="/assets/hero-banner.png" alt="" />
            <div className="ov" />
          </div>
        </div>
      </section>

      {/* CORE SERVICES */}
      <section className="section">
        <div className="page">
          <div className="section-head center">
            <span className="tag soft">What we do</span>
            <h2>Six core services.</h2>
            <p style={{ marginInline: 'auto' }}>Each backed by booth-level data, advanced analytics and a team that has run winning campaigns in 19 states.</p>
          </div>
          <div className="svc-cards" style={{ textAlign: 'left' }}>
            {CORE.map((s) => (
              <div className="svc" key={s.h}>
                <div className="ic">{svg(s.icon, 36)}</div>
                <h3>{s.h}</h3>
                <p>{s.p}</p>
                <Link href={s.href} className="vd">Enquire →</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="section cat-band" id="categories">
        <div className="page center">
          <span className="tag">Full capability map</span>
          <h2 style={{ fontSize: 38, fontWeight: 800, marginTop: 16 }}>Everything under one roof.</h2>
          <div className="cat-grid" style={{ textAlign: 'left' }}>
            {CATS.map((c) => (
              <div className="cat" key={c.h}>
                <div className="ic">{svg(c.icon, 22)}</div>
                <h4>{c.h}</h4>
                <ul>{c.items.map((i) => <li key={i}>{i}</li>)}</ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="page">
          <div className="cta-band">
            <span className="tag soft">Ready to talk?</span>
            <h2 style={{ marginTop: 14 }}>Let&apos;s build your winning campaign.</h2>
            <p>Tell us about your seat, your timeline and your goals. Our strategy desk responds within one working day.</p>
            <Link href="/contact" className="btn btn-coral">Get in touch →</Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

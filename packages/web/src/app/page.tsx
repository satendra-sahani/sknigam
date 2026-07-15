'use client';

/**
 * Pollistics — public marketing home page.
 *
 * A faithful port of the Claude Design handoff (index.html): a publishing-led
 * hero, the consulting intro, "What We Do", client logos, the Director's
 * message, the governance-consult highlight, testimonials, an enquiry form and
 * the animated counters. All styling lives in src/styles/pollistics.css, scoped
 * under `.pol` via <SiteShell>.
 */

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { SiteShell } from '@/components/site/SiteShell';
import { EnquiryForm } from '@/components/site/EnquiryForm';

const svg = (d: React.ReactNode, w = 38) => (
  <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);

const SERVICES = [
  { h: 'Opinion Poll Surveys', p: 'Pre-poll, tracker and benchmark surveys with statistically-sound, booth-weighted sampling across constituencies.', href: '#enquiry', icon: <><path d="M3 3v18h18" /><path d="M7 14l3-3 3 2 4-5" /></> },
  { h: 'Door-to-Door Campaigns', p: 'Trained karyakarta networks for household contact, voter-slip distribution and last-mile outreach.', href: '#enquiry', icon: <path d="M3 10l9-7 9 7v11h-6v-7H9v7H3z" /> },
  { h: 'War Room Strategy', p: 'A live command centre — real-time field data, sentiment heatmaps and rapid-response messaging.', href: '#enquiry', icon: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></> },
  { h: 'Social Media Management', p: 'Micro-targeted social campaigns, content war-rooms and reputation management at scale.', href: '#enquiry', icon: <><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M8 12h8 M12 8v8" /></> },
  { h: 'Digital Media Management', p: 'Programmatic ads, creative production and analytics-driven digital outreach for every platform.', href: '#enquiry', icon: <path d="M3 11l19-9-9 19-2-8-8-2z" /> },
  { h: 'Software & Technology Solutions', p: 'Voter-data platforms, the Pollistics app and bespoke election software built for the field.', href: '/download', icon: <><rect x="3" y="4" width="18" height="14" rx="2" /><path d="M8 21h8 M12 18v3" /></> },
];

const CLIENTS = [
  { l: 'National Party', icon: <path d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z" /> },
  { l: 'Regional Party', icon: <><circle cx="12" cy="12" r="9" /><path d="M12 3v18 M3 12h18" /></> },
  { l: 'State Govt.', icon: <path d="M3 10l9-7 9 7v11h-6v-6H9v6H3z" /> },
  { l: 'Govt. of UP', icon: <><circle cx="12" cy="8" r="3.4" /><path d="M5 21c0-4 3.2-6.5 7-6.5s7 2.5 7 6.5" /></> },
  { l: 'Govt. of Rajasthan', icon: <><rect x="3" y="8" width="18" height="12" rx="2" /><path d="M9 8V6a3 3 0 016 0v2" /></> },
];

const CHIPS = [
  { t: <>You keep<br />the rights</>, icon: <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" /> },
  { t: <>Earn up to<br />70% royalties</>, icon: <path d="M7 5h10 M7 9h10 M7 9c5 0 5 6 0 6l6 5 M7 15h4" /> },
  { t: <>Global<br />distribution</>, icon: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18 M12 3c3 3.5 3 14.5 0 18 M12 3c-3 3.5-3 14.5 0 18" /></> },
  { t: <>Data-driven<br />impact</>, icon: <><path d="M4 20V10 M9 20V4 M14 20v-6 M19 20V8 M14 8l5-4" /><path d="M17 4h2v2" /></> },
];

const COUNTS = [
  { target: 2000, suffix: '+', label: 'Constituencies', wm: '/assets/wm-parliament.png', icon: <path d="M3 21h18 M5 21V10 M9.5 21V10 M14.5 21V10 M19 21V10 M12 3L3 8h18z" /> },
  { target: 19, suffix: '+', label: 'States & UTs', wm: '/assets/wm-map.png', icon: <><path d="M12 2a7 7 0 017 7c0 5-7 13-7 13S5 14 5 9a7 7 0 017-7z" /><circle cx="12" cy="9" r="2.5" /></> },
  { target: 17, suffix: '+', label: 'Years of Experience', wm: '/assets/wm-growth.png', icon: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></> },
];

function Counters() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nums = ref.current?.querySelectorAll<HTMLDivElement>('.num[data-target]');
    if (!nums) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const el = en.target as HTMLDivElement;
        const target = +(el.dataset.target || '0');
        const suf = el.dataset.suffix || '';
        const dur = 1400, t0 = performance.now();
        const step = (t: number) => {
          const p = Math.min((t - t0) / dur, 1);
          const e = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * e).toLocaleString('en-IN') + (p === 1 ? suf : '');
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        io.unobserve(el);
      });
    }, { threshold: 0.4 });
    nums.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);

  return (
    <section className="section counters">
      <div className="page center" ref={ref}>
        <div className="count-divider">
          <span className="dash"><i className="d3" /><i className="d2" /><i className="d1" /></span>
          <span className="pre">India&apos;s most experienced</span>
          <span className="dash"><i className="d1" /><i className="d2" /><i className="d3" /></span>
        </div>
        <h2>POLITICAL <span className="o">STRATEGY ORGANIZATION</span></h2>
        <p className="lead" style={{ maxWidth: 680, margin: '14px auto 0' }}>
          Pollistics brings 17 years of experience, working with current heads of state and political parties, and has served more than 2,000 constituencies across India.
        </p>
        <div className="count-grid">
          {COUNTS.map((c) => (
            <div className="count" key={c.label}>
              <div className="ic">{svg(c.icon, 28)}</div>
              <div className="num" data-target={c.target} data-suffix={c.suffix}>0</div>
              <div className="numhr" />
              <div className="lbl">{c.label}</div>
              <img className="wm" src={c.wm} alt="" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <SiteShell active="home" footer="default">
      {/* HERO */}
      <section className="hero">
        <div className="hero-wave">
          <span className="blob" style={{ width: 520, height: 520, borderRadius: '50%', left: -180, top: -160, opacity: 0.1 }} />
          <span className="blob" style={{ width: 240, height: 240, borderRadius: '0 0 240px 0', left: 0, bottom: 0, opacity: 0.9, clipPath: 'ellipse(70% 90% at 0% 100%)' }} />
        </div>
        <div className="page">
          <div className="hero-inner">
            <div>
              <span className="tag">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, verticalAlign: -2 }}><path d="M4 5a2 2 0 012-2h12v18H6a2 2 0 01-2-2z M8 3v18" /></svg>
                Pollistics Press · Self-publishing
              </span>
              <h1 style={{ marginTop: 18 }}>Turn your research into a <span className="o" style={{ display: 'inline' }}>published book.</span></h1>
              <p className="sub">From a constituency handbook to a 75-year psephology treatise — we format, print, list and sell it. You keep the rights and up to 70% royalties.</p>
              <div className="cta-row">
                <Link href="/publish#publish-form" className="btn btn-coral">Publish your book →</Link>
                <Link href="/bookstore" className="btn btn-ghost">Browse the bookstore ›</Link>
              </div>
              <div className="hero-chips">
                {CHIPS.map((c, i) => (
                  <div className="c" key={i}>
                    <span className="ic">{svg(c.icon, 22)}</span>
                    <span className="t">{c.t}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="hero-photo">
              <span className="arch" />
              <img src="/assets/hero-podium.png" alt="Pollistics Press — books, dashboards & app" style={{ width: '100%', height: 'auto', aspectRatio: '1165 / 1008', objectFit: 'contain', display: 'block' }} />
            </div>
          </div>
        </div>
      </section>

      {/* INTRO */}
      <section className="section intro">
        <img className="parliament" src="/assets/parliament-watermark.png" alt="" />
        <div className="page">
          <span className="tag soft">Insight-led solutions</span>
          <h2>Pollistics Management Consulting Private Limited<span className="dot">.</span></h2>
          <div className="subh">Data-Driven Decisions. Trusted Expertise working at the intersection of public, policy and politics.</div>
          <div className="cols">
            <p>At Pollistics, we go beyond analysis to deliver practice, impact-oriented consulting solutions. With over a decade of experience, we support governments, political leaders and parties, civic and development organisations to win elections, read voters, and act on change effectively.</p>
            <p>Our expertise spans booth-level research, opinion and exit polling, war-room strategy, door-to-door campaigns and digital outreach. We combine ground-truth field intelligence with advanced data analytics, so your decisions rest on evidence — not instinct. By leveraging technology platforms, real-time data and culturally-rooted methodologies, we help clients improve performance, ensure compliance, and screen execution in complex and dynamic environments.</p>
          </div>
        </div>
      </section>

      {/* WHAT WE DO */}
      <section className="section wwd" id="services">
        <div className="page center">
          <div className="wwd-divider">
            <span className="dash"><i className="d3" /><i className="d2" /><i className="d1" /></span>
            <span className="pill-label">What We Do</span>
            <span className="dash"><i className="d1" /><i className="d2" /><i className="d3" /></span>
          </div>
          <div className="cards" style={{ textAlign: 'left' }}>
            {SERVICES.map((s) => (
              <div className="card" key={s.h}>
                <div className="ic">{svg(s.icon, 38)}</div>
                <h3>{s.h}</h3>
                <p>{s.p}</p>
                {s.href.startsWith('/')
                  ? <Link href={s.href} className="vd">View details →</Link>
                  : <a href={s.href} className="vd">View details →</a>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROUD */}
      <section className="section proud">
        <span className="dots-l" /><span className="dots-r" />
        <div className="page center">
          <span className="tag soft">Our clients</span>
          <h2 className="head2">We are proud to work with <span className="o">leading organizations</span></h2>
          <div className="hr" />
          <div className="logos">
            {CLIENTS.map((c) => (
              <div className="logo-emb" key={c.l}>
                <div className="circle">{svg(c.icon, 30)}</div>
                <div className="lbl">{c.l}</div>
                <span className="ul" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DIRECTOR MESSAGE */}
      <section className="section msg">
        <span className="deco" style={{ width: 380, height: 380, right: -120, top: -120 }} />
        <span className="deco" style={{ width: 240, height: 240, left: '10%', bottom: -120 }} />
        <span className="grid-dots" />
        <div className="page msg-grid">
          <div>
            <span className="tag">Welcome</span>
            <h2>Message from the Director —<br />India&apos;s most trusted election strategist</h2>
            <p>For over a decade, Pollistics has delivered data-led political consulting to candidates and parties across India. We pair booth-level field research with advanced analytics and a relentless focus on execution, so every rupee of a campaign budget works harder.</p>
            <p>From the first survey to counting-day intelligence, our teams have run winning campaigns in 19 states. We don&apos;t sell hope — we engineer mandates.</p>
            <div className="stats">
              <span className="s"><span className="ic"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" fill="currentColor" /></svg></span><span><span className="k">99.9%</span><br /><span className="l">data accuracy</span></span></span>
              <span className="s"><span className="ic">{svg(<><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" /><path d="M9 12l2 2 4-4" /></>, 24)}</span><span><span className="k">ECI-verified</span><br /><span className="l">rolls</span></span></span>
              <span className="s"><span className="ic">{svg(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>, 24)}</span><span><span className="k">24×7</span><br /><span className="l">war room</span></span></span>
            </div>
          </div>
          <div className="msg-photo">
            <img src="/assets/parliament-dark.png" alt="Parliament of India" />
            <div className="quote">
              <div className="qm">&ldquo;</div>
              <p>We combine ground-truth intelligence with advanced analytics to deliver decisions that win elections.</p>
              <div className="by">— Director, Pollistics</div>
            </div>
          </div>
        </div>
      </section>

      {/* CONSULT HIGHLIGHT */}
      <section className="section consult">
        <div className="page consult-grid">
          <div className="consult-photo"><img src="/assets/consult-left.png" alt="Turning ground reality into strategy" /></div>
          <div className="box">
            <span className="dots" />
            <div className="badge-ic">{svg(<path d="M3 21h18 M4 21V10 M20 21V10 M12 3L3 8h18z M8 21v-7 M12 21v-7 M16 21v-7" />, 28)}</div>
            <h2>The success of public policy &amp; governance is <span className="o">paramount</span> to us.</h2>
            <p><b>Pollistics</b> turns ground reality into strategy. We support governments, institutions and public-sector clients in navigating complex governance challenges — with a sharp, evidence-led toolkit that delivers measurable, visible impact on the ground.</p>
            <div className="actions">
              <a href="#enquiry" className="btn btn-coral" style={{ height: 52, padding: '0 26px' }}>{svg(<><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18 M8 2v4 M16 2v4" /></>, 17)}Book a phone consultation</a>
              <span className="call-pill"><span className="ic">{svg(<path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014 2h3a2 2 0 012 1.7c.1 1 .4 1.9.7 2.8a2 2 0 01-.4 2.1L8.1 9.9a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.6 2.8.7A2 2 0 0122 16.9z" />, 17)}</span>Call: +91 96500 60882</span>
            </div>
            <div className="statrow">
              <div className="s"><span className="ic">{svg(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>, 24)}</span><span><span className="k">10+ Years</span><br /><span className="l">of Experience</span></span></div>
              <div className="s"><span className="ic">{svg(<><circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 019 9 M12 8a4 4 0 014 4" /></>, 24)}</span><span><span className="k">250+</span><br /><span className="l">Projects Delivered</span></span></div>
              <div className="s"><span className="ic">{svg(<><path d="M3 17l6-6 4 4 7-8" /><path d="M14 7h6v6" /></>, 24)}</span><span><span className="k">Nationwide</span><br /><span className="l">Impact</span></span></div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="section testi">
        <div className="page center">
          <div className="testi-divider">
            <span className="dash"><i className="d3" /><i className="d2" /><i className="d1" /></span>
            <span className="pill-label">Testimonials</span>
            <span className="dash"><i className="d1" /><i className="d2" /><i className="d3" /></span>
          </div>
          <h2 className="testi-title">What clients say about us</h2>
          <div className="testi-title-hr" />
          <div className="testi-grid" style={{ textAlign: 'left' }}>
            <div className="testi-card">
              <div className="qc">&ldquo;</div>
              <p>Pollistics turned a 12-point deficit into a win. Their booth-level read was sharper than anything we had seen — and the war room gave us the count before the press conference.</p>
              <div className="who"><span className="av">{svg(<><circle cx="12" cy="8" r="3.4" /><path d="M5 21c0-4 3.2-6.5 7-6.5s7 2.5 7 6.5" /></>, 22)}</span><span><div className="n">Campaign Manager</div><div className="r">State Assembly · 2024</div></span></div>
            </div>
            <div className="testi-card">
              <div className="qc">&ldquo;</div>
              <p>Their door-to-door network covered over 1,100 households a day. Turnout in our weakest booths jumped nine points. Genuinely the most professional political team we have worked with.</p>
              <div className="who"><span className="av">{svg(<><circle cx="12" cy="8" r="3.4" /><path d="M5 21c0-4 3.2-6.5 7-6.5s7 2.5 7 6.5" /></>, 22)}</span><span><div className="n">General Secretary</div><div className="r">Lok Sabha · 2024</div></span></div>
            </div>
          </div>
        </div>
      </section>

      {/* ENQUIRY */}
      <section className="section enquiry" id="enquiry">
        <div className="page center">
          <div className="enq-divider">
            <span className="dash"><i className="d3" /><i className="d2" /><i className="d1" /></span>
            <span className="pill-label">Get in touch</span>
            <span className="dash"><i className="d1" /><i className="d2" /><i className="d3" /></span>
          </div>
          <h2 className="enq-title">Make an online <span className="o">enquiry</span></h2>
          <div className="enq-title-hr" />
          <p className="lead" style={{ maxWidth: 560, margin: '18px auto 0' }}>Tell us about your seat, your timeline and your goals. Our strategy desk responds within one working day.</p>
          <EnquiryForm />
          <div className="enq-trust">
            <span className="t">{svg(<><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" /><path d="M9 12l2 2 4-4" /></>, 16)} 100% Confidential</span>
            <span className="t">{svg(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>, 16)} Response within 1 working day</span>
            <span className="t">{svg(<><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" /></>, 16)} No obligation</span>
          </div>
        </div>
      </section>

      {/* COUNTERS */}
      <Counters />
    </SiteShell>
  );
}

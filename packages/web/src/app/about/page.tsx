/**
 * Company / About — Pollistics.
 * Faithful port of the handoff About.html: founder banner, proud clients,
 * "why work with us", testimonials, "who we are" prose and the 17-years CTA.
 * Styling from pollistics.css, scoped via <SiteShell>.
 */
import Link from 'next/link';
import { SiteShell } from '@/components/site/SiteShell';

export const metadata = {
  title: 'About — Pollistics Management Consulting',
};

const svg = (d: React.ReactNode, w = 24) => (
  <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);

const CLIENTS = [
  { l: 'Govt. of Maharashtra', icon: <><path d="M12 2a4 4 0 014 4c0 2-4 6-4 6s-4-4-4-6a4 4 0 014-4z M5 22c0-4 3-7 7-7s7 3 7 7" /></> },
  { l: 'Govt. of Rajasthan', icon: <path d="M3 21h18 M5 21V10l7-5 7 5v11" /> },
  { l: 'State Tourism', icon: <><circle cx="12" cy="12" r="9" /><path d="M12 3v18 M3 12h18" /></> },
  { l: 'India Foundation', icon: <path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z" /> },
  { l: 'National Party', icon: <><path d="M12 2a4 4 0 014 4c0 2-4 6-4 6s-4-4-4-6a4 4 0 014-4z M5 22c0-4 3-7 7-7s7 3 7 7" /></> },
];

const WHY = [
  { h: 'Domain-Focused Expertise', p: 'Our teams bring hands-on experience across technology, consulting and large-scale programs. We understand sector-specific challenges and deliver solutions that are practical, compliant and aligned with real-world needs.', icon: <><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20c0-3 2.5-5 6-5s6 2 6 5 M15 20c0-2 1-3.5 3-3.5" /></> },
  { h: 'Agile & Scalable Model', p: 'Pollistics follows an agile execution framework that adapts to changing requirements without compromising quality or timelines. Our scalable models ensure seamless delivery for both pilot initiatives and enterprise-level programs.', icon: <path d="M3 11l19-9-9 19-2-8-8-2z" /> },
  { h: 'Partnership-Oriented Engagement', p: "We work as an extension of our clients' teams. Through continuous collaboration, transparent reporting and responsive support, we build long-term partnerships focused on shared success.", icon: <><path d="M16 4h2a2 2 0 012 2v2 M8 4H6a2 2 0 00-2 2v2 M16 20h2a2 2 0 002-2v-2 M8 20H6a2 2 0 01-2-2v-2" /><circle cx="12" cy="12" r="3" /></> },
];

export default function AboutPage() {
  return (
    <SiteShell active="about" footer="default">
      {/* BANNER */}
      <section className="about-banner">
        <span className="deco" style={{ width: 360, height: 360, right: -120, top: -140 }} />
        <span className="deco" style={{ width: 220, height: 220, left: '8%', bottom: -120 }} />
        <div className="page"><h1>About</h1></div>
      </section>

      {/* FOUNDER */}
      <section className="section" style={{ paddingTop: 64 }}>
        <div className="page">
          <div className="founder-wrap">
            <img className="founder-photo" src="/assets/founder.png" alt="Mr. S. K. Nigam — Founder & Director" />
            <div className="who">
              <span className="tag">Who we are</span>
              <h3>Founder &amp; Director — Mr. S. K. Nigam</h3>
              <p>Mr. S. K. Nigam is a seasoned management consultant and the Founder &amp; Director of Pollistics Management Consulting Private Limited, established in 2008. With 17+ years of experience, he has led Pollistics&apos; work across governance, public policy, IT systems, third-party inspections and political advisory.</p>
              <p>Under his leadership, Pollistics has built a strong national footprint — delivering data-driven research, analytics and consulting to government bodies and political entities. He holds B.Tech and M.Tech degrees in Engineering and has spent his career at the intersection of technology and democracy.</p>
            </div>
          </div>
        </div>
      </section>

      {/* PROUD */}
      <section className="section proud" style={{ paddingTop: 0 }}>
        <div className="page center">
          <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--coral)' }}>We are proud to work with these organizations</h2>
          <div className="logos">
            {CLIENTS.map((c, i) => (
              <div className="logo-emb" key={i}>
                <div className="circle">{svg(c.icon, 34)}</div>
                <span className="lbl">{c.l}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY WORK WITH US */}
      <section className="section why">
        <span className="deco" style={{ width: 420, height: 420, right: -140, top: -160 }} />
        <span className="deco" style={{ width: 260, height: 260, left: '6%', bottom: '8%' }} />
        <div className="page center">
          <span className="tag">Why work with us</span>
          <h2 style={{ fontSize: 40, fontWeight: 800, marginTop: 16 }}>Innovative thinking backed by<br />proven execution.</h2>
          <div className="cols" style={{ textAlign: 'left' }}>
            {WHY.map((w) => (
              <div className="col" key={w.h}>
                <div className="ic">{svg(w.icon, 24)}</div>
                <h4>{w.h}</h4>
                <p>{w.p}</p>
              </div>
            ))}
          </div>

          <div className="divide" />

          <h2 style={{ fontSize: 34, fontWeight: 800, color: 'var(--coral)' }}>What clients say about us</h2>
          <div className="testi-grid" style={{ textAlign: 'left' }}>
            <div className="testi-card"><div className="q">&ldquo;</div><p>Pollistics Management Consulting successfully managed social media, IVR systems and multimedia production for a prestigious international cultural festival under a state government undertaking. Their comprehensive digital and technical services played a key role in the success of this high-profile event.</p></div>
            <div className="testi-card"><div className="q">&ldquo;</div><p>Pollistics Management Consulting successfully executed a large-scale agricultural survey across seven states for a national-level body. Their professional performance in determining the desired result, as per scope, was found to be satisfactory throughout the project.</p></div>
          </div>
        </div>
      </section>

      {/* WHO WE ARE PROSE */}
      <section className="section">
        <div className="page center" style={{ marginBottom: 40 }}>
          <span className="pill-label">Milestones</span>
          <h2 style={{ fontSize: 38, fontWeight: 800, marginTop: 20 }}>Who we are</h2>
          <p className="lead" style={{ maxWidth: 840, margin: '16px auto 0' }}>Our management team consists of alumni from India&apos;s topmost institutes — IIT, IIM and NIT. Our IT and database department is headed by engineers and MCAs from premier institutes, while experienced social-science post-graduates lead our political, social and economic research divisions, and graduates from leading institutes work as surveyors and data collectors.</p>
        </div>
        <div className="page prose">
          <div className="block">
            <h2>What we are</h2>
            <p>Pollistics is a centre of excellence in the field of Election Studies. We believe in — and are proud of — our core values of integrity and loyalty towards our clients. Having been in political consulting for the last 17 years, we skilfully help our clients achieve their goals: winning elections, meeting the expectations of the people, and rising to the top. We assess current trends, help shape the image of the leader or candidate alongside party position through effective scientific methods, and equip them with the technology to sustain it.</p>
          </div>
          <div className="block">
            <h2>Our mission, vision and values</h2>
            <p>Our mission is to deliver hassle-free services to our clients. We provide a widespread, all-inclusive analysis of compiled data to smoothen the process of tabulating records using a comprehensive management system — turning raw electoral data into decisions campaigns can act on.</p>
          </div>
        </div>
      </section>

      {/* EXPERT BANNER */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="page">
          <div className="expert-banner">
            <img src="/assets/experts-banner.png" alt="Experts from various political backgrounds" />
          </div>
        </div>
      </section>

      {/* 17 YEARS */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="page">
          <h2 style={{ fontSize: 30, fontWeight: 800 }}>17 Years of Pollistics</h2>
          <p className="lead" style={{ maxWidth: 900, marginTop: 14 }}>Join our celebration of 17 years of Pollistics — one of India&apos;s leading political-consulting firms. Over the years we&apos;ve helped more than 2,000 clients achieve their goals, from MPs to MLAs to Ministers. Our experts, with experience across diverse political backgrounds, have been building winning narratives since 2008.</p>
          <p className="lead" style={{ maxWidth: 900, marginTop: 14 }}>Our cutting-edge tools and innovative strategies have helped clients gain valuable insights and make informed decisions. Let&apos;s look at the journey and the successes we&apos;ve achieved together.</p>
          <div style={{ marginTop: 26, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <Link href="/contact" className="btn btn-coral">Work with us →</Link>
            <Link href="/#services" className="btn btn-ghost">Our services</Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

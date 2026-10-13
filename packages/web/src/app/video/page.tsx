'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { PollsticsShell } from '@/components/site/PollsticsShell';

const IMG = '/assets/pollstics';

export default function VideoPage() {
  const [lang, setLang] = useState('hi');
  const hi = lang === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);

  const shortsRef = useRef<HTMLDivElement>(null);
  const videosRef = useRef<HTMLDivElement>(null);
  const podRef = useRef<HTMLDivElement>(null);
  const scrollBy = (ref: React.RefObject<HTMLDivElement | null>, dx: number) => ref.current?.scrollBy({ left: dx, behavior: 'smooth' });

  const shortsList = [
    { hi: 'बजट में आपके लिए क्या खास?', en: 'What\'s special for you in the budget?' },
    { hi: 'चुनावी वोट: 60 सेकंड में देश का मूड', en: 'Election vote: Country\'s mood in 60 seconds' },
    { hi: 'एक गाँव, एक सवाल', en: 'One village, one question' },
    { hi: 'नौकरी के आँकड़े हकीकत?', en: 'Employment figures: reality?' },
    { hi: 'आज की बड़ी खबर', en: 'Today\'s big news' },
    { hi: 'संसद में आज क्या हुआ', en: 'What happened in Parliament today' },
  ];

  const videosList = [
    { hi: 'ग्राउंड रिपोर्ट: बाढ़ के बाद का गाँव', en: 'Ground report: The village after the flood' },
    { hi: 'सूखा: क्या संकट में पानी पर बढ़ रही है?', en: 'Drought: Is the water crisis growing?' },
    { hi: 'शिक्षा का निजीकरण और बराबरी', en: 'Privatization of education and equality' },
    { hi: 'लोकतंत्र की बात, हक और जिम्मेदारी', en: 'Democracy talk: Rights and responsibilities' },
    { hi: 'सवाल-जवाब: नई शिक्षा नीति', en: 'Q&A: New education policy' },
  ];

  const podcastsList = [
    { hi: 'पोलस्टिक्स पॉडकास्ट: एपिसोड 24', en: 'Pollstics Podcast: Episode 24' },
    { hi: 'राजनीतिक पहचान, हम कौन हैं?', en: 'Political identity: Who are we?' },
    { hi: 'विकासवाद बनाम अस्मिता', en: 'Developmentalism vs Identity' },
    { hi: 'दुनिया इस हफ्ते', en: 'The world this week' },
    { hi: 'विचार की बात', en: 'A matter of thought' },
  ];

  const seeAll = L('सभी देखें', 'See all');

  return (
    <PollsticsShell activeNav="video" lang={lang} setLang={setLang}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(32px,4.5vw,44px)', paddingBottom: 48 }}>

        {/* ═══ BREADCRUMB ═══ */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#666', padding: '12px 0 0' }}>
          <Link href="/" style={{ color: '#7a0f1a', textDecoration: 'none', fontWeight: 600 }}>
            {L('होम', 'Home')}
          </Link>
          <span style={{ color: '#999' }}>&gt;</span>
          <span style={{ color: '#333' }}>
            {L('शॉर्ट वीडियो / वीडियो / पॉडकास्ट', 'Shorts / Video / Podcast')}
          </span>
        </nav>

        {/* ═══ PAGE TITLE ═══ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <h1 style={{ margin: 0, fontSize: 'clamp(24px,3.5vw,32px)', fontWeight: 800, color: '#7a0f1a', whiteSpace: 'nowrap' }}>
            {L('शॉर्ट वीडियो / वीडियो / पॉडकास्ट', 'Shorts / Video / Podcast')}
          </h1>
          <span style={{ flex: 1, height: 2, background: 'linear-gradient(90deg,#7a0f1a 0%,transparent 100%)' }} />
        </div>

        {/* ═══ FEATURED VIDEO HERO ═══ */}
        <section style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,420px),1fr))',
          background: '#141414',
          color: '#fff',
          borderRadius: 6,
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        }}>
          <div style={{ minHeight: 225 }}>
            <img
              src={`${IMG}/video/vid-hero-photo.png`}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
          <div style={{
            background: 'linear-gradient(90deg,#2b2a26 0%,#141414 60%)',
            padding: 'clamp(20px,3vw,32px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ background: '#c8102e', color: '#fff', fontWeight: 700, padding: '2px 6px', fontSize: 13, borderRadius: 2 }}>
                {L('ग्राउंड रिपोर्ट', 'Ground report')}
              </span>
              <span style={{ fontSize: 13, color: '#ccc' }}>18:20</span>
            </div>
            <h2 style={{ margin: 0, fontSize: 'clamp(18px,2.5vw,22px)', fontWeight: 700, lineHeight: 1.35 }}>
              {L(
                'ग्राउंड रिपोर्ट: बाढ़ के बाद का गाँव, जहाँ राहत अब तक नहीं पहुँची',
                'Ground Report: The village after the flood, where relief still hasn\'t arrived',
              )}
            </h2>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: '#ccc' }}>
              {L(
                'बारिश के कई हफ्तों बाद भी इस गाँव में ना सड़क है, ना साफ पानी, ना सरकारी राहत। देखिए हमारी ग्राउंड रिपोर्ट में जमीनी हकीकत।',
                'Even weeks after the rains, this village has no roads, no clean water, no government relief. Watch the ground reality in our ground report.',
              )}
            </p>
            <div>
              <button style={{
                background: '#fff',
                color: '#141414',
                fontWeight: 700,
                fontSize: 14,
                padding: '7px 14px',
                borderRadius: 3,
                border: 'none',
                cursor: 'pointer',
              }}>
                {L('अभी देखें', 'Watch now')}
              </button>
            </div>
          </div>
        </section>

        {/* ═══ SHORTS ROW ═══ */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 5, height: 22, background: '#c8102e', borderRadius: 2, flexShrink: 0 }} />
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#141414' }}>
              {L('शॉर्ट वीडियो', 'Shorts')}
            </h2>
            <span style={{ flex: 1, height: 1, background: '#e0e0e0' }} />
            <Link href="#" style={{ fontSize: 14, fontWeight: 600, color: '#c8102e', textDecoration: 'none', whiteSpace: 'nowrap' }}>
              {seeAll} →
            </Link>
          </div>
          <div style={{ position: 'relative' }}>
            <div
              ref={shortsRef}
              style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}
            >
              {shortsList.map((item, i) => (
                <Link href="#" key={i} style={{ flex: 'none', width: 198, color: '#141414', textDecoration: 'none', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ position: 'relative', aspectRatio: '198/92', background: '#e8e8e8', borderRadius: 3, overflow: 'hidden' }}>
                    <img src={`${IMG}/video/vid-s-${i}.png`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </div>
                  <p style={{ margin: '6px 0 0', fontSize: 13, fontWeight: 600, lineHeight: 1.35 }}>
                    {L(item.hi, item.en)}
                  </p>
                </Link>
              ))}
            </div>
            <button
              aria-label="Next"
              onClick={() => scrollBy(shortsRef, 220)}
              style={{
                position: 'absolute', right: -15, top: '50%', transform: 'translateY(-50%)',
                width: 30, height: 30, borderRadius: '50%', border: '1px solid #d6d6d6',
                background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#7a0f1a'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#141414'; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          </div>
        </section>

        {/* ═══ VIDEO ROW ═══ */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 5, height: 22, background: '#c8102e', borderRadius: 2, flexShrink: 0 }} />
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#141414' }}>
              {L('वीडियो', 'Video')}
            </h2>
            <span style={{ flex: 1, height: 1, background: '#e0e0e0' }} />
            <Link href="#" style={{ fontSize: 14, fontWeight: 600, color: '#c8102e', textDecoration: 'none', whiteSpace: 'nowrap' }}>
              {seeAll} →
            </Link>
          </div>
          <div style={{ position: 'relative' }}>
            <div
              ref={videosRef}
              style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}
            >
              {videosList.map((item, i) => (
                <Link href="#" key={i} style={{ flex: 'none', width: 238, color: '#141414', textDecoration: 'none', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ position: 'relative', aspectRatio: '238/97', background: '#e8e8e8', borderRadius: 3, overflow: 'hidden' }}>
                    <img src={`${IMG}/video/vid-v-${i}.png`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </div>
                  <p style={{ margin: '6px 0 0', fontSize: 13, fontWeight: 600, lineHeight: 1.35 }}>
                    {L(item.hi, item.en)}
                  </p>
                </Link>
              ))}
            </div>
            <button
              aria-label="Next"
              onClick={() => scrollBy(videosRef, 260)}
              style={{
                position: 'absolute', right: -15, top: '50%', transform: 'translateY(-50%)',
                width: 30, height: 30, borderRadius: '50%', border: '1px solid #d6d6d6',
                background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#7a0f1a'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#141414'; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          </div>
        </section>

        {/* ═══ PODCAST ROW ═══ */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 5, height: 22, background: '#c8102e', borderRadius: 2, flexShrink: 0 }} />
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#141414' }}>
              {L('पॉडकास्ट', 'Podcast')}
            </h2>
            <span style={{ flex: 1, height: 1, background: '#e0e0e0' }} />
            <Link href="#" style={{ fontSize: 14, fontWeight: 600, color: '#c8102e', textDecoration: 'none', whiteSpace: 'nowrap' }}>
              {seeAll} →
            </Link>
          </div>
          <div style={{ position: 'relative' }}>
            <div
              ref={podRef}
              style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}
            >
              {podcastsList.map((item, i) => (
                <Link href="#" key={i} style={{ flex: 'none', width: 238, color: '#141414', textDecoration: 'none', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ position: 'relative', aspectRatio: '238/85', background: '#e8e8e8', borderRadius: 3, overflow: 'hidden' }}>
                    <img src={`${IMG}/video/vid-p-${i}.png`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </div>
                  <p style={{ margin: '6px 0 0', fontSize: 13, fontWeight: 600, lineHeight: 1.35 }}>
                    {L(item.hi, item.en)}
                  </p>
                </Link>
              ))}
            </div>
            <button
              aria-label="Next"
              onClick={() => scrollBy(podRef, 260)}
              style={{
                position: 'absolute', right: -15, top: '50%', transform: 'translateY(-50%)',
                width: 30, height: 30, borderRadius: '50%', border: '1px solid #d6d6d6',
                background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#7a0f1a'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#141414'; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          </div>
        </section>

      </div>
    </PollsticsShell>
  );
}

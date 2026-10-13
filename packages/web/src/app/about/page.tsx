'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PollsticsShell } from '@/components/site/PollsticsShell';

const IMG = '/assets/pollstics';

export default function AboutPage() {
  const [lang, setLang] = useState('hi');
  const hi = lang === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);

  const principles = [
    {
      num: '01',
      title: L('स्वतंत्रता', 'Independence'),
      text: L(
        'हम किसी राजनीतिक दल, कॉरपोरेट या सत्ता केंद्र के प्रति जवाबदेह नहीं हैं। हमारी जवाबदेही पाठक के प्रति है।',
        'We are not accountable to any political party, corporate, or power center. Our accountability is to the reader.',
      ),
    },
    {
      num: '02',
      title: L('तथ्य', 'Facts'),
      text: L(
        'हर ख़बर दस्तावेज़ों, आँकड़ों और कई स्रोतों से जाँचने के बाद प्रकाशित की जाती है।',
        'Every story is published only after being verified through documents, data, and multiple sources.',
      ),
    },
    {
      num: '03',
      title: L('जवाबदेही', 'Accountability'),
      text: L(
        'ग़लती होने पर हम उसे खुले तौर पर स्वीकार करते हैं और सुधार प्रकाशित करते हैं।',
        'When we make a mistake, we openly acknowledge it and publish a correction.',
      ),
    },
  ];

  return (
    <PollsticsShell activeNav="" lang={lang} setLang={setLang}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 clamp(16px,4vw,40px)' }}>
        {/* Breadcrumb */}
        <nav style={{ fontSize: 14, color: '#666', padding: '18px 0 10px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Link href="/" style={{ color: '#7a0f1a', textDecoration: 'none', fontWeight: 600 }}>Home</Link>
          <span>&gt;</span>
          <span>{L('हमारे बारे में', 'About Us')}</span>
        </nav>

        {/* Title */}
        <h1
          style={{
            fontSize: 'clamp(34px,5vw,56px)',
            fontWeight: 800,
            lineHeight: 1.1,
            margin: '0 0 16px',
            color: '#141414',
          }}
        >
          {L('परिचय', 'Introduction')}
        </h1>
        <div style={{ borderBottom: '2px solid #141414', marginBottom: 'clamp(28px,4vw,48px)' }} />

        {/* Intro section */}
        <section
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'clamp(24px,3vw,48px)',
            marginBottom: 'clamp(36px,5vw,56px)',
          }}
        >
          {/* Text */}
          <div style={{ flex: '999 1 480px', maxWidth: 760 }}>
            <p
              style={{
                fontSize: 'clamp(18px,2.2vw,22px)',
                fontWeight: 700,
                lineHeight: 1.6,
                color: '#141414',
                margin: '0 0 20px',
              }}
            >
              {L(
                'पोलस्टिक्स एक स्वतंत्र हिंदी डिजिटल न्यूज़ प्लेटफ़ॉर्म है जो राजनीति, समाज, दुनिया और संस्कृति की खबरें तथ्यों और ज़िम्मेदारी के साथ पाठकों तक पहुँचाता है।',
                'Pollstics is an independent Hindi digital news platform that brings news about politics, society, the world and culture to readers with facts and responsibility.',
              )}
            </p>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: '#333', margin: '0 0 18px' }}>
              {L(
                'हमारा काम सत्ता से सवाल पूछना, ज़मीनी हक़ीक़तों को दर्ज करना, और उन आवाज़ों को जगह देना है जो अक्सर मुख्यधारा की बहस से बाहर रह जाती हैं।',
                'Our job is to question power, to document ground realities, and to give space to voices that are often left out of mainstream debate.',
              )}
            </p>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: '#333', margin: 0 }}>
              {L(
                'हम मानते हैं कि अच्छी पत्रकारिता लोकतंत्र की बुनियाद है, और उसकी पहली ज़िम्मेदारी पाठक के प्रति है।',
                'We believe that good journalism is the foundation of democracy, and its first responsibility is to the reader.',
              )}
            </p>
          </div>

          {/* Image */}
          <div style={{ flex: '1 1 260px' }}>
            <img
              src={`${IMG}/video/vid-hero-photo.png`}
              alt={L('पोलस्टिक्स टीम', 'Pollstics team')}
              style={{ width: '100%', aspectRatio: '4/5', objectFit: 'cover', display: 'block' }}
            />
          </div>
        </section>

        {/* Principles */}
        <section style={{ borderTop: '2px solid #141414', marginBottom: 'clamp(36px,5vw,56px)' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,260px),1fr))',
            }}
          >
            {principles.map((p) => (
              <div
                key={p.num}
                style={{
                  padding: '24px 24px 24px 0',
                  borderBottom: '2px solid #141414',
                }}
              >
                <span
                  style={{
                    display: 'block',
                    fontSize: 14,
                    fontWeight: 800,
                    color: '#7a0f1a',
                    marginBottom: 8,
                  }}
                >
                  {p.num}
                </span>
                <h3 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 10px', color: '#141414' }}>
                  {p.title}
                </h3>
                <p style={{ fontSize: 15, lineHeight: 1.65, color: '#333', margin: 0 }}>
                  {p.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Contact CTA */}
        <div style={{ marginBottom: 'clamp(36px,5vw,56px)' }}>
          <Link
            href="/contact"
            style={{
              display: 'inline-block',
              background: '#7a0f1a',
              color: '#fff',
              fontWeight: 800,
              fontSize: 16,
              padding: '14px 22px',
              textDecoration: 'none',
              border: 0,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = '#5c0a13')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = '#7a0f1a')}
          >
            {L('कांटैक्ट', 'Contact')} &rarr;
          </Link>
        </div>
      </div>
    </PollsticsShell>
  );
}

'use client';

import Link from 'next/link';
import { useLang } from '@/components/site/PollsticsShell';

const IMG = '/assets/pollstics';

function ArticleContent() {
  const { lang } = useLang();
  const hi = lang === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);

  const tags = [
    { hi: 'चुनावी चंदा', en: 'Electoral funding' },
    { hi: 'चुनाव आयोग', en: 'Election Commission' },
    { hi: 'पारदर्शिता', en: 'Transparency' },
    { hi: 'राजनीतिक दल', en: 'Political parties' },
  ];

  const related = [
    {
      img: `${IMG}/home/acc-1.png`,
      hi: 'संवैधानिक संस्थाओं की स्वतंत्रता कितनी सुरक्षित?',
      en: 'How safe is the independence of constitutional institutions?',
      time: L('4 घंटे पहले', '4 hours ago'),
    },
    {
      img: `${IMG}/home/acc-2.png`,
      hi: 'सरकारी योजनाओं की ज़मीनी हकीकत: लाभार्थियों की क्या है राय?',
      en: 'Ground reality of government schemes: What do beneficiaries say?',
      time: L('6 घंटे पहले', '6 hours ago'),
    },
    {
      img: `${IMG}/video/vid-s-1.png`,
      hi: 'संसद का शीतकालीन सत्र: विपक्ष के तेवर और सरकार की रणनीति',
      en: "Parliament winter session: Opposition's stance and government's strategy",
      time: L('8 घंटे पहले', '8 hours ago'),
    },
    {
      img: `${IMG}/home/acc-3.png`,
      hi: 'सूचना के अधिकार पर नए प्रस्ताव से उठे सवाल',
      en: 'Questions raised by new proposal on Right to Information',
      time: L('12 घंटे पहले', '12 hours ago'),
    },
  ];

  const shareBtn: React.CSSProperties = {
    width: 36,
    height: 36,
    border: '2px solid #141414',
    background: 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: 16,
    fontWeight: 700,
    color: '#141414',
    transition: 'all .2s',
  };

  return (
    <>
      {/* ── Breadcrumb ── */}
      <nav
        style={{
          maxWidth: 760,
          margin: '0 auto',
          padding: '18px 20px 0',
          fontSize: 14,
          color: '#666',
        }}
      >
        <Link href="/" style={{ color: '#7a0f1a', textDecoration: 'none', fontWeight: 600 }}>
          {L('होम', 'Home')}
        </Link>
        <span style={{ margin: '0 6px' }}>&gt;</span>
        <span style={{ fontWeight: 600, color: '#141414' }}>
          {L('जाँच पड़ताल', 'Investigation')}
        </span>
      </nav>

      {/* ── Article header ── */}
      <article style={{ maxWidth: 760, margin: '0 auto', padding: '0 20px' }}>
        {/* Title */}
        <h1
          style={{
            fontSize: 'clamp(28px, 4.4vw, 46px)',
            fontWeight: 800,
            lineHeight: 1.2,
            color: '#141414',
            margin: '20px 0 16px',
          }}
        >
          {L(
            'चुनावी चंदे की नई राह: राजनीतिक दलों की फ़ंडिंग में कितनी पारदर्शिता?',
            'Electoral Funding: How Transparent Is Political Party Financing?',
          )}
        </h1>

        {/* Summary / lede */}
        <p
          style={{
            fontSize: 'clamp(18px, 2.6vw, 21px)',
            lineHeight: 1.6,
            color: '#3a3a3a',
            fontWeight: 500,
            margin: '0 0 24px',
          }}
        >
          {L(
            'चुनावी चंदे को लेकर नए खुलासों ने राजनीतिक दलों की वित्तीय पारदर्शिता पर फिर से सवाल खड़े कर दिए हैं। क्या मौजूदा नियम पर्याप्त हैं, या सुधार की अब भी ज़रूरत है?',
            'New revelations about electoral funding have once again raised questions about the financial transparency of political parties. Are the existing rules sufficient, or is reform still needed?',
          )}
        </p>

        {/* Author bar */}
        <div
          style={{
            borderTop: '2px solid #141414',
            borderBottom: '1px solid #dcdcdc',
            padding: '14px 0',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 28,
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#141414' }}>
              {L('पोलस्टिक्स संवाददाता', 'Pollstics Correspondent')}
            </div>
            <div style={{ fontSize: 13, color: '#777', marginTop: 2 }}>
              {L('9 अक्टूबर 2026 · 8 मिनट में पढ़ें', '9 October 2026 · 8 min read')}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['W', 'X', 'f', '⧉'].map((icon) => (
              <button
                key={icon}
                style={shareBtn}
                onMouseEnter={(e) => {
                  (e.currentTarget.style.background = '#7a0f1a');
                  (e.currentTarget.style.borderColor = '#7a0f1a');
                  (e.currentTarget.style.color = '#fff');
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget.style.background = 'transparent');
                  (e.currentTarget.style.borderColor = '#141414');
                  (e.currentTarget.style.color = '#141414');
                }}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* Hero image */}
        <figure style={{ margin: '0 0 32px' }}>
          <img
            src={`${IMG}/home/lead.png`}
            alt={L(
              'चुनावी चंदे की नई राह',
              'Electoral Funding',
            )}
            style={{
              width: '100%',
              aspectRatio: '16/9',
              objectFit: 'cover',
              display: 'block',
              borderRadius: 2,
            }}
          />
          <figcaption
            style={{
              fontSize: 13,
              color: '#888',
              marginTop: 8,
              fontStyle: 'italic',
            }}
          >
            {L('प्रतीकात्मक तस्वीर', 'Representational image')}
          </figcaption>
        </figure>

        {/* ── Body ── */}
        <div
          style={{
            fontSize: 19,
            lineHeight: 1.8,
            color: '#1a1a1a',
          }}
        >
          {/* Body group 1 */}
          <p style={{ margin: '0 0 22px' }}>
            {L(
              'राजनीतिक दलों को मिलने वाले चंदे का सवाल भारतीय लोकतंत्र में लंबे समय से बहस का विषय रहा है। चुनावी बॉन्ड योजना रद्द होने के बाद यह उम्मीद की गई थी कि राजनीतिक फ़ंडिंग में पारदर्शिता बढ़ेगी।',
              'The question of donations received by political parties has long been a subject of debate in Indian democracy. After the electoral bond scheme was scrapped, it was expected that transparency in political funding would increase.',
            )}
          </p>
          <p style={{ margin: '0 0 22px' }}>
            {L(
              'पोलस्टिक्स ने पिछले तीन वित्त वर्षों में प्रमुख राष्ट्रीय और क्षेत्रीय दलों द्वारा चुनाव आयोग को सौंपी गई योगदान रिपोर्टों का अध्ययन किया।',
              'Pollstics studied the contribution reports submitted to the Election Commission by major national and regional parties over the past three financial years.',
            )}
          </p>
          <p style={{ margin: '0 0 32px' }}>
            {L(
              'विश्लेषण से पता चलता है कि दलों की कुल आय का बड़ा हिस्सा अब भी अज्ञात स्रोतों से आता है, जिनकी जानकारी सार्वजनिक करना क़ानूनन ज़रूरी नहीं है।',
              'The analysis reveals that a large portion of party income still comes from unknown sources, information about which is not legally required to be made public.',
            )}
          </p>

          {/* Sub-heading */}
          <h2
            style={{
              fontSize: 'clamp(22px, 3.4vw, 30px)',
              fontWeight: 800,
              color: '#141414',
              margin: '0 0 20px',
              lineHeight: 1.3,
            }}
          >
            {L('दस्तावेज़ क्या बताते हैं', 'What the documents reveal')}
          </h2>

          {/* Body group 2 */}
          <p style={{ margin: '0 0 22px' }}>
            {L(
              'दस्तावेज़ों के मुताबिक़ कई दलों ने इलेक्टोरल ट्रस्ट के ज़रिए बड़ी रक़म हासिल की।',
              'According to documents, several parties received large sums through electoral trusts.',
            )}
          </p>
          <p style={{ margin: '0 0 32px' }}>
            {L(
              'चुनाव सुधार पर काम करने वाले संगठनों का कहना है कि नक़द चंदे की सीमा और घटाई जानी चाहिए।',
              'Organizations working on election reform say the cash donation limit should be further reduced.',
            )}
          </p>

          {/* Blockquote */}
          <blockquote
            style={{
              margin: '36px 0',
              padding: '24px 0',
              borderTop: '2px solid #7a0f1a',
              borderBottom: '2px solid #7a0f1a',
              fontStyle: 'italic',
              fontSize: 'clamp(22px, 3vw, 28px)',
              lineHeight: 1.5,
              color: '#7a0f1a',
              fontWeight: 600,
            }}
          >
            <p style={{ margin: '0 0 10px' }}>
              {L(
                '"जब तक चंदे का स्रोत सार्वजनिक नहीं होगा, तब तक मतदाता यह नहीं जान सकता कि नीतियाँ किसके हित में बन रही हैं।"',
                '"Until the source of donations is made public, voters cannot know in whose interest policies are being made."',
              )}
            </p>
            <footer
              style={{
                fontSize: 15,
                fontStyle: 'normal',
                fontWeight: 500,
                color: '#555',
              }}
            >
              {L('— एक चुनाव सुधार विशेषज्ञ', '— An election reform expert')}
            </footer>
          </blockquote>

          {/* Body group 3 */}
          <p style={{ margin: '0 0 22px' }}>
            {L(
              'इस रिपोर्ट के लिए हमने सभी प्रमुख दलों से प्रतिक्रिया माँगी।',
              'We sought a response from all major parties for this report.',
            )}
          </p>
          <p style={{ margin: '0 0 36px' }}>
            {L(
              'पोलस्टिक्स इस विषय पर अपनी पड़ताल जारी रखेगा।',
              'Pollstics will continue its investigation on this topic.',
            )}
          </p>
        </div>

        {/* ── Tags ── */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            marginBottom: 48,
          }}
        >
          {tags.map((t) => (
            <span
              key={t.en}
              style={{
                fontSize: 14,
                fontWeight: 600,
                padding: '6px 12px',
                background: '#f4f1f1',
                color: '#141414',
                borderRadius: 2,
                cursor: 'pointer',
                transition: 'all .2s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget.style.background = '#7a0f1a');
                (e.currentTarget.style.color = '#fff');
              }}
              onMouseLeave={(e) => {
                (e.currentTarget.style.background = '#f4f1f1');
                (e.currentTarget.style.color = '#141414');
              }}
            >
              {L(t.hi, t.en)}
            </span>
          ))}
        </div>
      </article>

      {/* ── Related articles ── */}
      <section
        style={{
          width: '100%',
          padding: '0 20px 56px',
          maxWidth: 1200,
          margin: '0 auto',
        }}
      >
        <div
          style={{
            borderTop: '4px solid #7a0f1a',
            paddingTop: 16,
            marginBottom: 24,
          }}
        >
          <h2
            style={{
              fontSize: 'clamp(22px, 3.2vw, 30px)',
              fontWeight: 800,
              color: '#141414',
              margin: 0,
            }}
          >
            {L('ये भी पढ़ें', 'Read more')}
          </h2>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(min(100%, max(160px, calc((100% - 72px) / 4))), 1fr))',
            gap: 24,
          }}
        >
          {related.map((r) => (
            <Link
              key={r.en}
              href="/article"
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div
                style={{
                  cursor: 'pointer',
                  transition: 'transform .2s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget.style.transform = 'translateY(-2px)');
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget.style.transform = 'translateY(0)');
                }}
              >
                <img
                  src={r.img}
                  alt={L(r.hi, r.en)}
                  style={{
                    width: '100%',
                    aspectRatio: '16/9',
                    objectFit: 'cover',
                    display: 'block',
                    borderRadius: 2,
                  }}
                />
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    lineHeight: 1.4,
                    color: '#141414',
                    margin: '10px 0 6px',
                  }}
                >
                  {L(r.hi, r.en)}
                </h3>
                <span style={{ fontSize: 13, color: '#888' }}>{r.time}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

export default function ArticlePage() {
  return <ArticleContent />;
}

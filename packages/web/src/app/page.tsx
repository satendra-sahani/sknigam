'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useLang } from '@/components/site/PollsticsShell';

const IMG = '/assets/pollstics';

function HomeContent() {
  const { lang } = useLang();
  const hi = lang === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);

  const trendRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const [mediaTab, setMediaTab] = useState(0);

  const ago = (n: number, u: 'h' | 'd') =>
    L(`${n} ${u === 'h' ? 'घंटे' : 'दिन'} पहले`, `${n} ${u === 'h' ? 'hours' : 'days'} ago`);
  const seeAll = L('सभी देखें', 'See all');

  const latestList = [
    { hi: 'लोकसभा में आचारसंहिता को लेकर फिर गर्माई बहस', en: 'Lok Sabha debate heats up again over code of conduct', hr: 1 },
    { hi: 'राजस्थान चुनाव: कांग्रेस-बीजेपी के घोषणापत्र में किसानों के लिए नए वादे', en: 'Rajasthan elections: New promises for farmers in Congress-BJP manifestos', hr: 3 },
    { hi: 'पहाड़ी क्षेत्रों में भारी बारिश, कई गांवों का संपर्क टूटा', en: 'Heavy rainfall in hilly regions, several villages cut off', hr: 5 },
    { hi: 'बॉलीवुड में फिर चर्चा में राजनीतिक फिल्मों का दौर', en: 'Political films back in the spotlight in Bollywood', hr: 6 },
    { hi: 'G20 के बाद भारत की वैश्विक भूमिका और मज़बूत', en: 'India\'s global role strengthens after G20', hr: 8 },
  ];

  const bars = [
    { hi: 'इलेक्टोरल बॉन्ड', en: 'Electoral bonds', pct: 57, color: '#7a0f1a' },
    { hi: 'कॉरपोरेट दान', en: 'Corporate donations', pct: 24, color: '#a3434d' },
    { hi: 'व्यक्तिगत दान', en: 'Individual donations', pct: 12, color: '#c98a90' },
    { hi: 'अन्य स्रोत', en: 'Other sources', pct: 7, color: '#dcb2b6' },
  ];

  const accCards = [
    { kicker: L('जवाबदेही', 'Accountability'), hi: 'संवैधानिक संस्थाओं की स्वतंत्रता कितनी सुरक्षित?', en: 'How safe is the independence of constitutional institutions?', hr: 4 },
    { kicker: L('शासन', 'Governance'), hi: 'सरकारी योजनाओं की ज़मीनी हकीकत: लाभार्थियों की क्या है राय?', en: 'Ground reality of government schemes: What do beneficiaries say?', hr: 6 },
    { kicker: L('राजनीति', 'Politics'), hi: 'संसद का शीतकालीन सत्र: विपक्ष के तेवर और सरकार की रणनीति', en: 'Parliament winter session: Opposition\'s stance and government\'s strategy', hr: 8 },
    { kicker: L('जवाबदेही', 'Accountability'), hi: 'सूचना के अधिकार पर नए प्रस्ताव से उठे सवाल', en: 'Questions raised by new proposal on Right to Information', hr: 12 },
  ];

  const trending = [
    { hi: 'चुनावी चंदा', en: 'Electoral funding' },
    { hi: 'इलेक्टोरल बॉन्ड', en: 'Electoral bonds' },
    { hi: 'लोकसभा चुनाव', en: 'Lok Sabha elections' },
    { hi: 'किसानों का आंदोलन', en: 'Farmers\' protest' },
    { hi: 'संसद सत्र', en: 'Parliament session' },
    { hi: 'राजनीतिक पारदर्शिता', en: 'Political transparency' },
  ];

  const sections = [
    {
      key: 'politics',
      title: L('राजनीति', 'Politics'),
      href: '/cat/politics',
      icon: (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 22h18" /><path d="M6 18v-7" /><path d="M10 18v-7" /><path d="M14 18v-7" /><path d="M18 18v-7" /><path d="M12 2 20 7H4z" /></svg>
      ),
      items: [
        { hi: 'गठबंधन की गणित: सीट बंटवारे पर कहाँ अटकी बात', en: 'Coalition math: Where seat-sharing talks are stuck', exHi: 'लोकसभा चुनाव से पहले विपक्षी गठबंधन में सीट बंटवारे को लेकर बातचीत अभी भी जारी है।', exEn: 'Seat-sharing discussions within the opposition alliance ahead of Lok Sabha elections are still ongoing.', tag: L('राजनीति', 'POLITICS'), time: ago(1, 'h'), img: `${IMG}/home/politics-0.png` },
        { hi: 'युवा मतदाता किन मुद्दों पर वोट दे रहे हैं', en: 'What issues are young voters casting their ballots on?', exHi: 'रोजगार, शिक्षा, महंगाई और भ्रष्टाचार इस बार युवा मतदाताओं के प्रमुख मुद्दे बने हुए हैं।', exEn: 'Employment, education, inflation and corruption remain top priorities for young voters this time.', tag: L('राजनीति', 'POLITICS'), time: ago(2, 'h'), img: `${IMG}/home/politics-1.png` },
        { hi: 'विधानसभा सत्र: कितने विधेयक बिना बहस के पास हुए', en: 'Assembly session: How many bills passed without debate?', exHi: 'विधानसभा के चालू सत्र में सरकार ने अब तक कई अहम विधेयकों को बिना विस्तृत बहस के पारित किया है।', exEn: 'In the current assembly session, the government has passed several important bills without detailed debate.', tag: L('राजनीति', 'POLITICS'), time: ago(3, 'h'), img: `${IMG}/home/politics-2.png` },
        { hi: 'दल बदल कानून और बदलती निष्ठाएं', en: 'Anti-defection law and shifting loyalties', exHi: 'हाल के वर्षों में दल बदल कानून को लेकर सुप्रीम कोर्ट और चुनाव आयोग के फैसलों पर नज़र।', exEn: 'A look at Supreme Court and Election Commission rulings on anti-defection law in recent years.', tag: L('राजनीति', 'POLITICS'), time: ago(2, 'd'), img: `${IMG}/home/politics-3.png` },
      ],
    },
    {
      key: 'world',
      title: L('दुनिया', 'World'),
      href: '/cat/world',
      icon: (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" /></svg>
      ),
      items: [
        { hi: 'जलवायु सम्मेलन से पहले विकासशील देशों की माँगें', en: 'Developing nations\' demands ahead of climate summit', exHi: 'विकासशील देशों ने जलवायु वित्त, प्रौद्योगिकी हस्तांतरण और नुकसान-भरपाई को लेकर अपनी माँगें रखीं।', exEn: 'Developing countries have put forward demands on climate finance, technology transfer and loss-and-damage compensation.', tag: L('दुनिया', 'WORLD'), time: ago(1, 'h'), img: `${IMG}/home/world-0.png` },
        { hi: 'पश्चिम एशिया: युद्धविराम के बाद राहत कितनी पहुँची', en: 'West Asia: How much relief has reached after the ceasefire?', exHi: 'युद्धविराम के बाद भी कई क्षेत्रों में मानवीय सहायता की भारी कमी बनी हुई है।', exEn: 'Despite the ceasefire, many areas continue to face a severe shortage of humanitarian aid.', tag: L('दुनिया', 'WORLD'), time: ago(2, 'h'), img: `${IMG}/home/world-1.png` },
        { hi: 'दक्षिण एशिया में व्यापार के नए रास्ते', en: 'New trade routes in South Asia', exHi: 'भारत, बांग्लादेश और श्रीलंका के बीच समुद्री और स्थल मार्गों से व्यापार को बढ़ाने पर चर्चा।', exEn: 'Discussions on boosting trade through sea and land routes between India, Bangladesh and Sri Lanka.', tag: L('दुनिया', 'WORLD'), time: ago(3, 'h'), img: `${IMG}/home/world-2.png` },
        { hi: 'यूरोप के चुनाव और प्रवासियों का सवाल', en: 'European elections and the migration question', exHi: 'यूरोप में बढ़ती प्रवासी संख्या ने चुनावी राजनीति को नया मोड़ दिया है।', exEn: 'Rising migrant numbers in Europe have given a new twist to electoral politics.', tag: L('दुनिया', 'WORLD'), time: ago(2, 'd'), img: `${IMG}/home/world-3.png` },
      ],
    },
    {
      key: 'art',
      title: L('कला-साहित्य', 'Art & Literature'),
      href: '/cat/art',
      icon: (
        <svg width="44" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
      ),
      items: [
        { hi: 'हिंदी कविता के नए स्वर: छोटे शहरों से उठती आवाज़ें', en: 'New voices in Hindi poetry: Rising from small towns', exHi: 'नई पीढ़ी के कवि अपने अनुभवों और स्थानीय यथार्थ को हिंदी कविता में नई ऊर्जा दे रहे हैं।', exEn: 'A new generation of poets is bringing fresh energy to Hindi poetry with their experiences and local realities.', tag: L('हिंदी साहित्य', 'Hindi literature'), time: ago(1, 'h'), img: `${IMG}/home/art-0.png` },
        { hi: 'लोक रंगमंच की बचती-बिसरती विरासत', en: 'The fading heritage of folk theatre', exHi: 'लोक साहित्य हमारी सांस्कृतिक पहचान की धरोहर है, जिसे सहेजने की आज और भी ज़रूरत है।', exEn: 'Folk literature is a treasure of our cultural identity, and preserving it is more important now than ever.', tag: L('साहित्य', 'Literature'), time: ago(2, 'h'), img: `${IMG}/home/art-1.png` },
        { hi: 'विस्थापन पर लिखा गया एक सरस उपन्यास', en: 'A compelling novel about displacement', exHi: 'यह उपन्यास राजनीति, समाज और मानवीय संवेदनाओं का अनोखा संगम प्रस्तुत करता है।', exEn: 'This novel presents a unique blend of politics, society and human emotions.', tag: L('पुस्तक समीक्षा', 'Book review'), time: ago(3, 'h'), img: `${IMG}/home/art-2.png` },
        { hi: 'मधुबनी से मॉडर्न तक: लोक चित्रकला का बाज़ार', en: 'From Madhubani to modern: The folk art market', exHi: 'परंपरागत लोक कला अब वैश्विक मंच पर अपनी अलग पहचान बना रही है।', exEn: 'Traditional folk art is now carving out its own identity on the global stage.', tag: L('सांस्कृतिक विमर्श', 'Cultural discourse'), time: ago(2, 'd'), img: `${IMG}/home/art-3.png` },
      ],
    },
  ];

  const shortTitlesHi = ['बजट में आपके लिए क्या खास?', 'युवा बोले: 60 सेकंड में देश का मूड', 'एक गाँव, एक सवाल', 'नेताओं के अनकहे इंटरव्यू', 'आज की बड़ी खबर'];
  const shortTitlesEn = ['What\'s special for you in the budget?', 'Youth speak: Country\'s mood in 60 seconds', 'One village, one question', 'Untold interviews of leaders', 'Today\'s big news'];
  const videoTitlesHi = ['ग्राउंड रिपोर्ट: बाढ़ के बाद का गाँव', 'बहस: क्या संसद में चर्चा घट रही है?', 'डॉक्यूमेंट्री: पानी की लड़ाई', 'सवाल-जवाब: नई शिक्षा नीति', 'चुनाव डायरी: पहला पड़ाव'];
  const videoTitlesEn = ['Ground report: The village after the flood', 'Debate: Is parliamentary discussion declining?', 'Documentary: The water battle', 'Q&A: New education policy', 'Election diary: First stop'];
  const podTitlesHi = ['पोलस्टिक्स पॉडकास्ट: एपिसोड 24', 'राजनीति की बात, हफ़्ते भर की', 'किताबों पर बातचीत', 'दुनिया इस हफ़्ते', 'सिनेमा की बात'];
  const podTitlesEn = ['Pollstics Podcast: Episode 24', 'Weekly political roundup', 'Conversations on books', 'The world this week', 'Cinema talk'];

  const mediaTitlesHi = [shortTitlesHi, videoTitlesHi, podTitlesHi];
  const mediaTitlesEn = [shortTitlesEn, videoTitlesEn, podTitlesEn];

  const homeMedia = mediaTab === 0
    ? shortTitlesHi.map((_, i) => ({ title: L(shortTitlesHi[i], shortTitlesEn[i]), views: [12, 24, 18, 32, 45][i] + 'K ' + L('व्यूज', 'views'), time: ago(i + 1, 'd'), img: `${IMG}/home/short-${i}.png`, overlay: false }))
    : mediaTitlesHi[mediaTab].map((_, i) => ({ title: L(mediaTitlesHi[mediaTab][i], mediaTitlesEn[mediaTab][i]), views: (8 + i * 3) + 'K ' + L('व्यूज', 'views'), time: ago(i + 1, 'd'), img: '', overlay: true }));

  const interviews = [
    {
      img: `${IMG}/home/iv-0.png`,
      quote: L('पत्रकारिता का काम सत्ता से सवाल पूछना है, उसका प्रचार करना नहीं।', 'The job of journalism is to question power, not to promote it.'),
      who: L('— रविश कुमार', '— Ravish Kumar'),
      topic: L('वरिष्ठ पत्रकार एवं लेखक', 'Senior journalist and author'),
    },
    {
      img: `${IMG}/home/iv-1.png`,
      quote: L('गाँव की कहानियाँ तभी बचेंगी जब हम उन्हें अपनी भाषा में लिखेंगे।', 'Village stories will survive only when we write them in our own language.'),
      who: L('— गीतांजलि श्री', '— Geetanjali Shree'),
      topic: L('प्रसिद्ध लेखिका एवं साहित्यकार', 'Renowned author and litterateur'),
    },
  ];

  const scrollBy = (ref: React.RefObject<HTMLDivElement | null>, dx: number) => ref.current?.scrollBy({ left: dx, behavior: 'smooth' });

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(32px,4.5vw,44px)' }}>
        {/* ═══ HERO ═══ */}
        <section className="pn-hero">
          {/* Lead article */}
          <Link href="#" className="pn-hero-lead">
            <img src={`${IMG}/home/lead.png`} alt="" />
            <span className="cat">{L('जाँच-पड़ताल', 'Investigation')}</span>
            <h1>{L('चुनावी चंदे की नई राह: राजनीतिक दलों की फ़ंडिंग में कितनी पारदर्शिता?', 'Electoral Funding: How Transparent Is Political Party Financing?')}</h1>
            <p className="summary">{L('चुनावी चंदे को लेकर नए खुलासों ने राजनीतिक दलों की वित्तीय पारदर्शिता पर फिर से सवाल खड़े कर दिए हैं। क्या मौजूदा नियम पर्याप्त हैं, या सुधार की अब भी ज़रूरत है?', 'New revelations about electoral funding have once again raised questions about the financial transparency of political parties. Are the existing rules sufficient, or is reform still needed?')}</p>
            <span className="time">{ago(1, 'h')}</span>
          </Link>

          {/* Latest News sidebar */}
          <div className="pn-latest">
            <div className="pn-latest-head">
              <h2>{L('ताज़ा खबरें', 'Latest news')}</h2>
              <span className="line" />
            </div>
            {latestList.map((item, i) => (
              <Link href="#" className="pn-latest-item" key={i}>
                <img src={`${IMG}/home/latest-${i}.png`} alt="" />
                <span className="info">
                  <span className="title">{L(item.hi, item.en)}</span>
                  <span className="time">{ago(item.hr, 'h')}</span>
                </span>
              </Link>
            ))}
          </div>

          {/* Chart widget + video promo */}
          <div className="pn-hero-side">
            <div className="pn-chart-widget">
              <Link href="#" className="see-all">{seeAll} →</Link>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: -6 }}>
                <h3>{L('राजनीतिक फंडिंग में पारदर्शिता कितनी?', 'How transparent is political funding?')}</h3>
                <span className="subtitle">{L('चुनावी चंदे के प्रमुख स्रोत (अनुमानित %)', 'Major sources of electoral funding (estimated %)')}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {bars.map((b) => (
                  <div className="pn-bar-row" key={b.hi}>
                    <span className="pn-bar-label">{L(b.hi, b.en)}</span>
                    <span className="pn-bar-track"><span className="pn-bar-fill" style={{ width: `${b.pct}%`, background: b.color }} /></span>
                    <span className="pn-bar-pct">{b.pct}%</span>
                  </div>
                ))}
              </div>
              <div className="pn-chart-note">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#7a0f1a" strokeWidth="1.6"><circle cx="8" cy="8" r="6" /><path d="M18.09 10.37A6 6 0 1 1 10.34 18" /><path d="M7 6h1v4" /><path d="m16.71 13.88.7.71-2.82 2.82" /></svg>
                <p>{L('विशेषज्ञों का मानना है कि राजनीतिक फंडिंग में अधिक पारदर्शिता लोकतंत्र को मजबूत करेगी।', 'Experts believe that greater transparency in political funding will strengthen democracy.')}</p>
              </div>
            </div>
            <Link href="/video" className="pn-video-promo">
              <span className="bg" style={{ backgroundImage: `url(${IMG}/home/lead.png)` }} />
              <span className="inner">
                <span style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span className="label">{L('वीडियो/पॉडकास्ट', 'Video/Podcast')}</span>
                  <span className="title">{L('क्या इलेक्टोरल बॉन्ड्स से बढ़ी राजनीतिक अपारदर्शिता?', 'Have electoral bonds increased political opacity?')}</span>
                </span>
                <span className="pn-play-btn"><svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M7 4l13 8-13 8z" /></svg></span>
              </span>
            </Link>
          </div>
        </section>

        {/* ═══ ACCOUNTABILITY ═══ */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="pn-sec-head">
            <h2>{L('जवाबदेही', 'Accountability')}</h2>
            <div style={{ flex: 1 }} />
            <Link href="/cat/accountability" className="see-all">{seeAll} →</Link>
          </div>
          <div className="pn-card-grid">
            {accCards.map((card, i) => (
              <Link href="#" className="pn-card" key={i}>
                <img src={`${IMG}/home/acc-${i}.png`} alt="" />
                <span className="body">
                  <span className="kicker">{card.kicker}</span>
                  <span className="title">{L(card.hi, card.en)}</span>
                  <span className="time">{ago(card.hr, 'h')}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ═══ TRENDING ═══ */}
        <section className="pn-trending">
          <span className="pn-trending-label">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m22 7-8.5 8.5-5-5L2 17" /><path d="M16 7h6v6" /></svg>
            {L('ट्रेंडिंग खबरें', 'Trending')}
          </span>
          <div className="pn-trending-scroll" ref={trendRef}>
            {trending.map((t) => (
              <Link href="#" key={t.hi}>#&nbsp;{L(t.hi, t.en)}</Link>
            ))}
          </div>
          <div className="pn-trending-nav">
            <button aria-label="Previous" onClick={() => scrollBy(trendRef, -240)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="m15 18-6-6 6-6" /></svg>
            </button>
            <button aria-label="Next" onClick={() => scrollBy(trendRef, 240)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          </div>
        </section>

        {/* ═══ POLITICS / WORLD / ART SECTIONS ═══ */}
        {sections.map((sec) => (
          <section className="pn-content-sec" key={sec.key}>
            <div className="pn-content-head">
              <span className="icon">{sec.icon}</span>
              <h2>{sec.title}</h2>
              <span className="line" />
              <Link href={sec.href} className="see-all">{seeAll} →</Link>
            </div>
            <div className="pn-content-grid">
              {sec.items.map((it, i) => (
                <Link href="#" className="pn-article-card" key={i}>
                  <img src={it.img} alt="" />
                  <span className="body">
                    <span className="tag">{it.tag}</span>
                    <span className="title">{L(it.hi, it.en)}</span>
                    <span className="excerpt">{L(it.exHi, it.exEn)}</span>
                    <span className="meta">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                      {it.time}
                      <span style={{ flex: 1 }} />
                      <span className="arrow">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                      </span>
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}

        {/* ═══ MEDIA / VIDEO CAROUSEL ═══ */}
        <section className="pn-media-sec">
          <div className="pn-media-head">
            <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span className="pn-media-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><rect x="2" y="5" width="20" height="14" rx="4" fill="#fff" /><path d="M10 9l5 3-5 3z" fill="#c4161c" /></svg>
              </span>
              <h2>{L('वीडियो/पॉडकास्ट', 'Video/Podcast')}</h2>
            </span>
            <div className="pn-media-tabs">
              {[L('शॉर्ट वीडियो', 'Shorts'), L('वीडियो', 'Video'), L('पॉडकास्ट', 'Podcast')].map((lb, i) => (
                <button key={i} className={i === mediaTab ? 'active' : ''} onClick={() => setMediaTab(i)}>{lb}</button>
              ))}
            </div>
            <div style={{ flex: 1 }} />
            <Link href="/video" style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{seeAll} →</Link>
          </div>
          <div className="pn-media-carousel">
            <div className="pn-media-scroll" ref={mediaRef}>
              {homeMedia.map((v, i) => (
                <Link href="/video" className="pn-media-card" key={i}>
                  <div style={{ position: 'relative', aspectRatio: '244/150', background: '#2a2a2a' }}>
                    {v.img && <img src={v.img} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
                    {v.overlay && (
                      <>
                        <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 44, height: 44, borderRadius: '50%', border: '3px solid #fff', background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M7 4l13 8-13 8z" /></svg>
                        </span>
                        <span style={{ position: 'absolute', right: 6, bottom: 6, background: 'rgba(0,0,0,0.8)', fontSize: 13, fontWeight: 700, padding: '2px 7px', pointerEvents: 'none', color: '#fff' }}>{mediaTab === 2 ? '32:10' : '12:45'}</span>
                      </>
                    )}
                  </div>
                  <span className="body">
                    <span className="title">{v.title}</span>
                    <span className="meta">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
                      {v.views}
                      <span style={{ flex: 1 }} />
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                      {v.time}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
            <button className="pn-media-nav prev" aria-label="Previous" onClick={() => scrollBy(mediaRef, -270)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="m15 18-6-6 6-6" /></svg>
            </button>
            <button className="pn-media-nav next" aria-label="Next" onClick={() => scrollBy(mediaRef, 270)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          </div>
        </section>

        {/* ═══ INTERVIEWS ═══ */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="pn-content-head">
            <svg width="48" height="48" viewBox="0 0 48 48" style={{ flex: 'none' }}><path d="M6 4h36a4 4 0 0 1 4 4v24a4 4 0 0 1-4 4H24l-10 9v-9H6a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4z" fill="#b0141f" /><text x="24" y="32" textAnchor="middle" fontSize="30" fontWeight="800" fill="#fff" fontFamily="Georgia,serif">&ldquo;</text></svg>
            <h2>{L('साक्षात्कार', 'Interview')}</h2>
            <span className="line" />
            <Link href="/cat/interview" className="see-all">{seeAll} →</Link>
          </div>
          <div className="pn-interview-grid">
            {interviews.map((iv, i) => (
              <Link href="#" className="pn-interview-card" key={i}>
                <img src={iv.img} alt="" />
                <span className="pn-interview-body">
                  <span className="qmark">&ldquo;</span>
                  <span className="quote-wrap">
                    <span className="quote">{iv.quote}</span>
                    <span style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 38px', gap: 10, alignItems: 'end' }}>
                      <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span className="who">{iv.who}</span>
                        <span className="topic">{iv.topic}</span>
                      </span>
                      <span className="pn-interview-arrow">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#141414" strokeWidth="2.4"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                      </span>
                    </span>
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ═══ SPECIAL / GROUND REPORT ═══ */}
        <section className="pn-special">
          <div className="pn-special-photo">
            <img src={`${IMG}/home/special-photo.png`} alt="" />
            <div className="pn-special-stats">
              {[
                { n: '5', label: L('राज्यों का दौरा', 'States visited'), icon: <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6"><path d="M12 2s-3 4-3 6a3 3 0 0 0 6 0c0-2-3-6-3-6z" fill="#e8231f" stroke="#e8231f" /><path d="M3 15l4-2 3 2 4-2 3 2 4-2v5l-4 2-3-2-4 2-3-2-4 2z" /></svg> },
                { n: '50+', label: L('गाँवों की ज़मीनी रिपोर्ट', 'Village ground reports'), icon: <svg width="34" height="34" viewBox="0 0 24 24" fill="#fff"><circle cx="12" cy="7" r="3" /><circle cx="5.5" cy="9" r="2.3" /><circle cx="18.5" cy="9" r="2.3" /><path d="M6 21v-4a6 6 0 0 1 12 0v4z" /><path d="M1 21v-3a4.5 4.5 0 0 1 4.5-4.5c.6 0 1 .1 1.5.2A7 7 0 0 0 5 17v4z" /><path d="M23 21v-3a4.5 4.5 0 0 0-4.5-4.5c-.6 0-1 .1-1.5.2A7 7 0 0 1 19 17v4z" /></svg> },
                { n: '100+', label: L('स्थानीय लोगों से बातचीत', 'Local interviews'), icon: <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M8 13h8M8 17h8M8 9h2" /></svg> },
              ].map((st, i) => (
                <div className="pn-stat" key={i}>
                  <span style={{ color: '#fff', display: 'flex', flex: 'none' }}>{st.icon}</span>
                  <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
                    <span className="n">{st.n}</span>
                    <span className="label">{st.label}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="pn-special-content">
            <span className="map-bg" style={{ backgroundImage: `url(${IMG}/home/special-map.png)` }} />
            <span className="tag">{L('ग्राउंड रिपोर्ट', 'Ground report')}</span>
            <h2>{L('पानी का हिसाब: पाँच राज्यों में भूजल संकट की ग्राउंड रिपोर्ट', 'Water Audit: Ground Report on the Groundwater Crisis in Five States')}</h2>
            <p>{L('देश के पाँच राज्यों में तेजी से घटते भूजल स्तर, सूखते कुएँ, बदलती खेती और पानी के लिए जूझते लोगों की ज़मीनी हकीकत पर हमारी विशेष रिपोर्ट।', 'Our special report on the ground reality of rapidly declining groundwater levels, drying wells, changing agriculture, and people struggling for water in five states.')}</p>
            <Link href="/cat/special" className="cta">{L('पूरी रिपोर्ट पढ़ें', 'Read full report')} <span>→</span></Link>
          </div>
        </section>
      </div>
    </>
  );
}

export default function HomePage() {
  return <HomeContent />;
}

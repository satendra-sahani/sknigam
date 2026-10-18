'use client';

import Link from 'next/link';
import { useLang } from '@/components/site/PollsticsShell';

const IMG = '/assets/pollstics';

const NAV_MAP: Record<string, [string, string]> = {
  accountability: ['जवाबदेही', 'Accountability'],
  discourse: ['विमर्श', 'Discourse'],
  politics: ['राजनीति', 'Politics'],
  world: ['दुनिया', 'World'],
  investigation: ['जाँच पड़ताल', 'Investigation'],
  art: ['कला-साहित्य', 'Art-Literature'],
  cinema: ['सिनेमा', 'Cinema'],
  interview: ['साक्षात्कार', 'Interview'],
  special: ['पोलस्टिक्स विशेष', 'Pollstics Special'],
};

interface CatData {
  lead: { img: string; tagHi: string; tagEn: string; hi: string; en: string; sumHi: string; sumEn: string };
  side: { img: string; tagHi: string; tagEn: string; hi: string; en: string; exHi: string; exEn: string; hr: number }[];
  latest: { img: string; hi: string; en: string; exHi: string; exEn: string; hr: number }[];
  mostRead: { img: string; hi: string; en: string; readsHi: string; readsEn: string }[];
}

function getCatData(slug: string): CatData {
  if (slug === 'accountability') {
    return {
      lead: { img: `${IMG}/cat/acc-lead.png`, tagHi: 'जाँच-पड़ताल', tagEn: 'Investigation', hi: 'सड़क बनी नहीं, भुगतान हो गया: तीन जिलों के ठेकों की पड़ताल', en: 'Roads not built, payments already made: Investigation of contracts in three districts', sumHi: 'दस्तावेज़ों, अधिकारियों और ज़मीनी हकीकत के आधार पर पोलस्टिक्स की विशेष रिपोर्ट में खुलासा — सड़कों की गुणवत्ता अधूरी, लेकिन करोड़ों का भुगतान पहले ही जारी।', sumEn: 'Pollstics\' special report based on documents, officials and ground reality reveals — road quality incomplete, but payments of crores already released.' },
      side: [
        { img: `${IMG}/cat/acc-side-0.png`, tagHi: 'प्रशासन', tagEn: 'Administration', hi: 'सूचना के अधिकार के 40 आवेदन, जवाब सिर्फ़ एक का', en: '40 RTI applications, only one answered', exHi: 'तीन विभागों में दायर 40 आरटीआई आवेदनों में से केवल एक का जवाब मिला, पारदर्शिता पर फिर सवाल।', exEn: 'Of 40 RTI applications filed in three departments, only one was answered — transparency questioned again.', hr: 2 },
        { img: `${IMG}/cat/acc-side-1.png`, tagHi: 'ग्रामीण भारत', tagEn: 'Rural India', hi: 'स्मार्ट सिटी मिशन: वादों और ज़मीनी हकीकत का हिसाब', en: 'Smart City Mission: Accounting for promises vs ground reality', exHi: 'कागज़ों पर चमकते स्मार्ट शहरों के बीच ग्रामीण इलाकों में आज भी पानी के लिए संघर्ष।', exEn: 'Amid smart cities shining on paper, rural areas still struggle for water.', hr: 3 },
      ],
      latest: [
        { img: `${IMG}/cat/acc-latest-0.png`, hi: 'अस्पतालों में ख़ाली पद, मरीज़ों की लंबी कतारें', en: 'Vacant posts in hospitals, long queues of patients', exHi: 'स्वास्थ्य सुविधाओं के दावों और ज़मीनी हकीकत के बीच बढ़ती दूरी ने प्रशासन पर सवाल खड़े किए हैं।', exEn: 'The growing gap between claims of healthcare facilities and ground reality has raised questions about the administration.', hr: 2 },
        { img: `${IMG}/cat/acc-latest-1.png`, hi: 'सांसद निधि का पैसा कहाँ ख़र्च हुआ?', en: 'Where was the MP fund money spent?', exHi: 'कई ज़िलों में सांसद निधि से स्वीकृत कार्य अधूरे, लाभार्थियों को अब तक नहीं मिला लाभ।', exEn: 'In several districts, works approved from MP funds remain incomplete, beneficiaries yet to receive benefits.', hr: 3 },
        { img: `${IMG}/cat/acc-latest-2.png`, hi: 'सरकारी स्कूलों में मिड-डे मील की गुणवत्ता पर सवाल', en: 'Questions over mid-day meal quality in government schools', exHi: 'कई राज्यों से शिकायतें — भोजन की गुणवत्ता में अनियमितता, बच्चों की सेहत पर असर।', exEn: 'Complaints from several states — irregularity in food quality, impact on children\'s health.', hr: 4 },
        { img: `${IMG}/cat/acc-latest-3.png`, hi: 'पुलिस शिकायतों का निपटारा: आँकड़ों में देरी', en: 'Police complaint resolution: Delays in the data', exHi: 'RTI से खुलासा: कई थानों में शिकायतें महीनों से लंबित, पीड़ितों को नहीं मिल रहा न्याय।', exEn: 'RTI reveals: Complaints pending for months at several stations, victims not getting justice.', hr: 5 },
      ],
      mostRead: [
        { img: `${IMG}/cat/most-0.png`, hi: 'सड़क बनी नहीं, भुगतान हो गया: तीन जिलों के ठेकों की पड़ताल', en: 'Roads not built, payments made: Investigation of contracts in three districts', readsHi: '1.2 लाख बार पढ़ा गया', readsEn: '1.2L reads' },
        { img: `${IMG}/cat/most-1.png`, hi: 'विधानसभा सत्र: कितने विधेयक बिना बहस के पास हुए', en: 'Assembly session: How many bills passed without debate', readsHi: '95 हज़ार बार पढ़ा गया', readsEn: '95K reads' },
        { img: `${IMG}/cat/most-2.png`, hi: 'भाषा का सवाल: हिंदी, अंग्रेज़ी और क्षेत्रीय पहचान', en: 'The language question: Hindi, English and regional identity', readsHi: '78 हज़ार बार पढ़ा गया', readsEn: '78K reads' },
        { img: `${IMG}/cat/most-3.png`, hi: 'पड़ोसी देशों के साथ व्यापार समझौते पर नई बातचीत शुरू', en: 'New talks begin on trade agreements with neighbouring countries', readsHi: '62 हज़ार बार पढ़ा गया', readsEn: '62K reads' },
      ],
    };
  }

  const POOLS: Record<string, [string, string][]> = {
    discourse: [
      ['लोकतंत्र में असहमति की जगह कितनी बची है?', 'How much room is left for dissent in democracy?'],
      ['सोशल मीडिया और सार्वजनिक बहस का बदलता चरित्र', 'The changing character of social media and public debate'],
      ['आरक्षण पर नई बहस: आँकड़े क्या कहते हैं', 'New debate on reservations: What do the numbers say?'],
      ['भाषा का सवाल: हिंदी, अंग्रेज़ी और क्षेत्रीय पहचान', 'The language question: Hindi, English and regional identity'],
      ['शिक्षा का निजीकरण और बराबरी का वादा', 'Privatization of education and the promise of equality'],
      ['मीडिया की स्वतंत्रता पर एक ज़रूरी बातचीत', 'A necessary conversation on media freedom'],
      ['शहर किसके लिए बन रहे हैं?', 'Who are cities being built for?'],
    ],
    politics: [
      ['गठबंधन की गणित: सीट बंटवारे पर कहाँ अटकी बात', 'Coalition math: Where seat-sharing talks are stuck'],
      ['युवा मतदाता किन मुद्दों पर वोट दे रहे हैं', 'What issues are young voters casting their ballots on?'],
      ['विधानसभा सत्र: कितने विधेयक बिना बहस के पास हुए', 'Assembly session: How many bills passed without debate?'],
      ['दल बदल कानून और बदलती निष्ठाएं', 'Anti-defection law and shifting loyalties'],
      ['राज्यसभा चुनाव: क्रॉस-वोटिंग के डर से विधायक होटल में', 'Rajya Sabha elections: MLAs in hotels fearing cross-voting'],
      ['पंचायत चुनाव में महिलाओं की भागीदारी', 'Women\'s participation in panchayat elections'],
      ['विपक्ष की रणनीति: एकजुटता या अलग राह', 'Opposition strategy: Unity or separate paths'],
    ],
    world: [
      ['जलवायु सम्मेलन से पहले विकासशील देशों की माँगें', 'Developing nations\' demands ahead of climate summit'],
      ['पश्चिम एशिया: युद्धविराम के बाद राहत कितनी पहुँची', 'West Asia: How much relief has reached after the ceasefire?'],
      ['दक्षिण एशिया में व्यापार के नए रास्ते', 'New trade routes in South Asia'],
      ['यूरोप के चुनाव और प्रवासियों का सवाल', 'European elections and the migration question'],
      ['पड़ोसी देशों के साथ व्यापार समझौते पर नई बातचीत शुरू', 'New talks begin on trade agreements with neighbouring countries'],
      ['संयुक्त राष्ट्र में सुधार की माँग फिर तेज़', 'Demand for UN reform intensifies again'],
      ['अफ़्रीका में भारत की बढ़ती मौजूदगी', 'India\'s growing presence in Africa'],
    ],
    investigation: [
      ['चुनावी चंदे की नई राह: राजनीतिक दलों की फ़ंडिंग में कितनी पारदर्शिता?', 'Electoral Funding: How Transparent Is Political Party Financing?'],
      ['दवा की कीमतें: एक ही दवा, तीन अलग दाम', 'Drug prices: Same medicine, three different prices'],
      ['खनन पट्टों की नीलामी में अनियमितताओं के दस्तावेज़', 'Documents of irregularities in mining lease auctions'],
      ['भर्ती परीक्षा पेपर लीक: कड़ियाँ कहाँ तक जाती हैं', 'Recruitment exam paper leak: How far do the links go?'],
      ['मनरेगा मज़दूरी में देरी: पाँच ज़िलों का डेटा', 'MGNREGA wage delays: Data from five districts'],
      ['ज़मीन अधिग्रहण: मुआवज़े के इंतज़ार में किसान', 'Land acquisition: Farmers waiting for compensation'],
      ['कचरा प्रबंधन के ठेके और कागज़ी सफ़ाई', 'Waste management contracts and paper cleanup'],
    ],
    art: [
      ['हिंदी कविता के नए स्वर: छोटे शहरों से उठती आवाज़ें', 'New voices in Hindi poetry: Rising from small towns'],
      ['लोक रंगमंच की बचती-सिमटती परंपरा', 'The fading tradition of folk theatre'],
      ['पुस्तक समीक्षा: विस्थापन पर लिखा गया एक ज़रूरी उपन्यास', 'Book review: An essential novel on displacement'],
      ['मधुबनी से गोंड तक: लोक चित्रकला का बाज़ार', 'From Madhubani to Gond: The folk art market'],
      ['प्रेमचंद को आज क्यों पढ़ें', 'Why read Premchand today?'],
      ['छोटे प्रकाशक, बड़ी किताबें', 'Small publishers, big books'],
      ['साहित्य उत्सवों में किसकी आवाज़?', 'Whose voice at literary festivals?'],
    ],
    cinema: [
      ['स्वतंत्र सिनेमा को दर्शक कहाँ मिल रहे हैं', 'Where is independent cinema finding audiences?'],
      ['क्षेत्रीय सिनेमा ने इस साल बॉक्स ऑफ़िस पर क्या बदला', 'How regional cinema changed the box office this year'],
      ['ओटीटी और सेंसरशिप की नई बहस', 'OTT and the new censorship debate'],
      ['फ़िल्म समीक्षा: एक छोटे शहर की बड़ी कहानी', 'Film review: A small town\'s big story'],
      ['सिंगल स्क्रीन थिएटरों का आख़िरी दौर', 'The last era of single-screen theatres'],
      ['डॉक्यूमेंट्री फ़िल्मकारों की मुश्किलें', 'The struggles of documentary filmmakers'],
      ['हिंदी सिनेमा में राजनीति का चित्रण', 'Portrayal of politics in Hindi cinema'],
    ],
    interview: [
      ['बातचीत: "पत्रकारिता का काम सत्ता से सवाल पूछना है"', 'Interview: "Journalism\'s job is to question power"'],
      ['बातचीत: "गाँव की कहानियाँ अपनी भाषा में लिखनी होंगी"', 'Interview: "Village stories must be written in our own language"'],
      ['एक अर्थशास्त्री से: बेरोज़गारी के आँकड़ों का सच', 'An economist on: The truth about unemployment data'],
      ['पर्यावरण कार्यकर्ता से बातचीत: नदियाँ क्यों सूख रही हैं', 'With an environmentalist: Why rivers are drying up'],
      ['फ़िल्मकार से बातचीत: सिनेमा और समाज', 'With a filmmaker: Cinema and society'],
      ['पूर्व चुनाव आयुक्त से: चुनाव सुधार की ज़रूरत', 'Former election commissioner on: The need for election reform'],
      ['युवा उद्यमी से: छोटे शहर, बड़े सपने', 'Young entrepreneur: Small town, big dreams'],
    ],
    special: [
      ['पानी का हिसाब: पाँच राज्यों में भूजल संकट की ग्राउंड रिपोर्ट', 'Water Audit: Ground Report on the Groundwater Crisis in Five States'],
      ['पानी का हिसाब, भाग 2: बुंदेलखंड के सूखे कुएँ', 'Water audit, part 2: Bundelkhand\'s dried wells'],
      ['प्रवासी मज़दूरों की वापसी: पाँच साल बाद', 'Return of migrant workers: Five years later'],
      ['हाशिये के स्कूल: जहाँ एक शिक्षक, पाँच कक्षाएँ', 'Schools at the margins: Where one teacher handles five classes'],
      ['चुनाव डायरी: 30 दिन, 12 राज्य', 'Election diary: 30 days, 12 states'],
      ['खेती का संकट: एक साल, एक गाँव', 'Farming crisis: One year, one village'],
      ['शहरों की हवा: सांस लेने की क़ीमत', 'City air: The cost of breathing'],
    ],
  };

  const IMGS: Record<string, string[]> = {
    politics: ['home/politics-0','home/politics-1','home/politics-2','home/politics-3','home/latest-0','home/latest-1','video/vid-s-0'],
    world: ['home/world-0','home/world-1','home/world-2','home/world-3','home/latest-4','video/vid-p-3','home/special-map'],
    investigation: ['home/lead','home/acc-1','home/acc-2','video/vid-s-1','home/acc-3','video/vid-s-3','home/acc-0'],
    art: ['home/art-0','home/art-1','home/art-2','home/art-3','video/vid-p-4','home/latest-3','video/vid-p-2'],
    cinema: ['home/latest-3','home/art-1','home/art-3','home/art-0','home/art-2','video/vid-p-4','video/vid-v-1'],
    interview: ['home/iv-0','home/iv-1','video/vid-p-0','video/vid-v-3','video/vid-v-0','video/vid-s-4','video/vid-p-1'],
    special: ['home/special-photo','video/vid-v-1','home/special-map','video/vid-s-2','video/vid-v-0','home/latest-2','video/vid-v-2'],
    discourse: ['cat/dis-lead','cat/dis-side-0','cat/dis-side-1','cat/dis-latest-0','cat/dis-latest-1','cat/dis-latest-2','cat/dis-latest-3'],
  };

  const SUMMARY_HI = 'दस्तावेज़ों, आँकड़ों और ज़मीनी बातचीत के आधार पर पोलस्टिक्स की रिपोर्ट।';
  const SUMMARY_EN = 'Pollstics report based on documents, data and ground-level conversations.';

  const pool = POOLS[slug] || POOLS.politics;
  const imgs = IMGS[slug] || IMGS.politics;

  return {
    lead: { img: `${IMG}/${imgs[0]}.png`, tagHi: NAV_MAP[slug]?.[0] || slug, tagEn: NAV_MAP[slug]?.[1] || slug, hi: pool[0][0], en: pool[0][1], sumHi: SUMMARY_HI, sumEn: SUMMARY_EN },
    side: [
      { img: `${IMG}/${imgs[1]}.png`, tagHi: NAV_MAP[slug]?.[0] || slug, tagEn: NAV_MAP[slug]?.[1] || slug, hi: pool[1][0], en: pool[1][1], exHi: SUMMARY_HI, exEn: SUMMARY_EN, hr: 2 },
      { img: `${IMG}/${imgs[2]}.png`, tagHi: NAV_MAP[slug]?.[0] || slug, tagEn: NAV_MAP[slug]?.[1] || slug, hi: pool[2][0], en: pool[2][1], exHi: SUMMARY_HI, exEn: SUMMARY_EN, hr: 3 },
    ],
    latest: [3, 4, 5, 6].map((i, j) => ({
      img: `${IMG}/${imgs[3 + j] || imgs[0]}.png`, hi: pool[i]?.[0] || pool[0][0], en: pool[i]?.[1] || pool[0][1], exHi: SUMMARY_HI, exEn: SUMMARY_EN, hr: j + 2,
    })),
    mostRead: [
      { img: `${IMG}/cat/most-0.png`, hi: pool[0][0], en: pool[0][1], readsHi: '1.2 लाख बार पढ़ा गया', readsEn: '1.2L reads' },
      { img: `${IMG}/cat/most-1.png`, hi: pool[2][0], en: pool[2][1], readsHi: '95 हज़ार बार पढ़ा गया', readsEn: '95K reads' },
      { img: `${IMG}/cat/most-2.png`, hi: pool[4]?.[0] || pool[1][0], en: pool[4]?.[1] || pool[1][1], readsHi: '78 हज़ार बार पढ़ा गया', readsEn: '78K reads' },
      { img: `${IMG}/cat/most-3.png`, hi: pool[6]?.[0] || pool[3][0], en: pool[6]?.[1] || pool[3][1], readsHi: '62 हज़ार बार पढ़ा गया', readsEn: '62K reads' },
    ],
  };
}

function CategoryContent({ slug }: { slug: string }) {
  const { lang } = useLang();
  const hi = lang === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const ago = (n: number, u: 'h' | 'd') => L(`${n} ${u === 'h' ? 'घंटे' : 'दिन'} पहले`, `${n} ${u === 'h' ? 'hours' : 'days'} ago`);
  const seeAll = L('सभी देखें', 'See all');
  const catTitle = NAV_MAP[slug] ? L(NAV_MAP[slug][0], NAV_MAP[slug][1]) : slug;
  const data = getCatData(slug);

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ alignSelf: 'flex-start', display: 'flex', gap: 10, fontSize: 14, color: '#444', padding: '4px 16px', border: '1px solid #e6e6e6', borderRadius: 16 }}>
            <Link href="/" style={{ color: '#444' }}>{L('होम', 'Home')}</Link>
            <span>›</span>
            <span>{catTitle}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <h1 style={{ margin: 0, fontSize: 'clamp(40px,5.4vw,64px)', lineHeight: 1.15, fontWeight: 800, color: '#b0141f', flex: 'none' }}>{catTitle}</h1>
            <span style={{ flex: 1, height: 3, background: '#c4161c', minWidth: 20, marginTop: 14 }} />
          </div>
        </div>

        {/* Hero section */}
        <section className="pn-cat-hero">
          <Link href="/article" className="pn-cat-lead">
            <img src={data.lead.img} alt="" />
            <span className="overlay">
              <span className="spacer" />
              <span className="tag">{L(data.lead.tagHi, data.lead.tagEn)}</span>
              <span className="title">{L(data.lead.hi, data.lead.en)}</span>
              <span style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 48px', gap: 16, alignItems: 'end' }}>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span className="summary">{L(data.lead.sumHi, data.lead.sumEn)}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, color: '#fff' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                    {ago(1, 'h')}
                  </span>
                </span>
                <span className="arrow-btn">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                </span>
              </span>
            </span>
          </Link>

          <div className="pn-cat-side">
            {data.side.map((it, i) => (
              <Link href="/article" className="pn-cat-side-card" key={i}>
                <img src={it.img} alt="" />
                <span className="body">
                  <span className="tag">{L(it.tagHi, it.tagEn)}</span>
                  <span className="title">{L(it.hi, it.en)}</span>
                  <span className="excerpt">{L(it.exHi, it.exEn)}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto', paddingTop: 6, fontSize: 15, color: '#444' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                    {ago(it.hr, 'h')}
                    <span style={{ flex: 1 }} />
                    <span className="arrow-btn">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                    </span>
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Latest + Most Read columns */}
        <div className="pn-cat-columns">
          {/* Latest */}
          <section className="pn-cat-latest">
            <div className="pn-sec-header">
              <span className="bar" />
              <h2>{L('ताज़ा', 'Latest')}</h2>
              <span className="line" />
              <Link href="#" className="see-all">{seeAll} →</Link>
            </div>
            {data.latest.map((it, i) => (
              <Link href="/article" className="pn-cat-latest-row" key={i}>
                <img src={it.img} alt="" />
                <span className="info">
                  <span style={{ flex: '1 1 280px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span className="title">{L(it.hi, it.en)}</span>
                    <span className="excerpt">{L(it.exHi, it.exEn)}</span>
                  </span>
                  <span style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, color: '#444' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                    {ago(it.hr, 'd')}
                  </span>
                </span>
              </Link>
            ))}
            <button className="pn-cat-load-more">{L('और ख़बरें', 'More stories')} <span>↓</span></button>
          </section>

          {/* Most Read */}
          <aside className="pn-cat-most-read">
            <div className="pn-sec-header">
              <span className="bar" />
              <h2>{L('सबसे ज़्यादा पढ़ी गईं', 'Most read')}</h2>
              <span className="line" />
              <Link href="#" className="see-all">{seeAll} →</Link>
            </div>
            {data.mostRead.map((m, i) => (
              <Link href="/article" className="pn-cat-most-item" key={i}>
                <span className="num">{i + 1}</span>
                <span className="card">
                  <img src={m.img} alt="" />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingRight: 6 }}>
                    <span className="title">{L(m.hi, m.en)}</span>
                    <span className="reads">{L(m.readsHi, m.readsEn)}</span>
                  </span>
                </span>
              </Link>
            ))}
          </aside>
        </div>
      </div>
    </>
  );
}

export default function CategoryPage({ params }: { params: { slug: string } }) {
  return <CategoryContent slug={params.slug} />;
}

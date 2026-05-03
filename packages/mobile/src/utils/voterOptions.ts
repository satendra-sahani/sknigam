/**
 * Dropdown reference data for the voter visit form.
 *
 * Parties — main UP-relevant political parties + Independent/Other.  Each
 * entry has an English `code` (the value we store in `partySupport`) and a
 * Hindi `labelHi` for the UI.  Codes are intentionally short so they look
 * consistent in analytics groupings.
 *
 * Castes — a pragmatic, not-exhaustive tree of (caste → sub-castes).  Real
 * sub-caste data varies a lot by region; this list covers the common ones
 * that field staff in UP ask about.  The special "Other" caste allows
 * free-form entry so we never block a voter whose community isn't listed.
 */

export interface PartyOption {
  code: string;
  labelEn: string;
  labelHi: string;
}

export const PARTIES: PartyOption[] = [
  { code: 'BJP', labelEn: 'BJP — Bharatiya Janata Party', labelHi: 'भाजपा' },
  { code: 'SP', labelEn: 'SP — Samajwadi Party', labelHi: 'सपा' },
  { code: 'BSP', labelEn: 'BSP — Bahujan Samaj Party', labelHi: 'बसपा' },
  { code: 'INC', labelEn: 'INC — Indian National Congress', labelHi: 'कांग्रेस' },
  { code: 'RLD', labelEn: 'RLD — Rashtriya Lok Dal', labelHi: 'रालोद' },
  { code: 'AAP', labelEn: 'AAP — Aam Aadmi Party', labelHi: 'आप' },
  { code: 'AIMIM', labelEn: 'AIMIM', labelHi: 'एआईएमआईएम' },
  { code: 'SBSP', labelEn: 'SBSP — Suheldev Bharatiya Samaj Party', labelHi: 'सुभासपा' },
  { code: 'Apna Dal', labelEn: 'Apna Dal (S)', labelHi: 'अपना दल (सोनेलाल)' },
  { code: 'NISHAD', labelEn: 'Nishad Party', labelHi: 'निषाद पार्टी' },
  { code: 'Independent', labelEn: 'Independent', labelHi: 'निर्दलीय' },
  { code: 'Undecided', labelEn: 'Undecided', labelHi: 'अनिश्चित' },
  { code: 'Other', labelEn: 'Other', labelHi: 'अन्य' },
];

export interface CasteOption {
  code: string;
  labelEn: string;
  labelHi: string;
  subCastes: Array<{ code: string; labelEn: string; labelHi: string }>;
}

// Sub-caste lists are a common-sense aggregation of the communities
// frequently encountered on UP booth-level voter rolls.  Order roughly
// by prevalence.  The final "Other" entry in every list lets staff type
// something if the voter's specific sub-caste isn't present.
export const CASTES: CasteOption[] = [
  {
    code: 'Brahmin',
    labelEn: 'Brahmin',
    labelHi: 'ब्राह्मण',
    subCastes: [
      { code: 'Sanadhya', labelEn: 'Sanadhya', labelHi: 'सनाढ्य' },
      { code: 'Kanyakubja', labelEn: 'Kanyakubja', labelHi: 'कान्यकुब्ज' },
      { code: 'Saryupareen', labelEn: 'Saryupareen', labelHi: 'सरयूपारीण' },
      { code: 'Maithil', labelEn: 'Maithil', labelHi: 'मैथिल' },
      { code: 'Gaur', labelEn: 'Gaur', labelHi: 'गौड़' },
      { code: 'Tyagi', labelEn: 'Tyagi', labelHi: 'त्यागी' },
      { code: 'Bhumihar', labelEn: 'Bhumihar', labelHi: 'भूमिहार' },
      { code: 'Other', labelEn: 'Other', labelHi: 'अन्य' },
    ],
  },
  {
    code: 'Kshatriya',
    labelEn: 'Kshatriya (Thakur / Rajput)',
    labelHi: 'क्षत्रिय (ठाकुर / राजपूत)',
    subCastes: [
      { code: 'Thakur', labelEn: 'Thakur', labelHi: 'ठाकुर' },
      { code: 'Rajput', labelEn: 'Rajput', labelHi: 'राजपूत' },
      { code: 'Chauhan', labelEn: 'Chauhan', labelHi: 'चौहान' },
      { code: 'Tomar', labelEn: 'Tomar', labelHi: 'तोमर' },
      { code: 'Bais', labelEn: 'Bais', labelHi: 'बैस' },
      { code: 'Parihar', labelEn: 'Parihar', labelHi: 'परिहार' },
      { code: 'Other', labelEn: 'Other', labelHi: 'अन्य' },
    ],
  },
  {
    code: 'Vaishya',
    labelEn: 'Vaishya / Bania',
    labelHi: 'वैश्य / बनिया',
    subCastes: [
      { code: 'Gupta', labelEn: 'Gupta', labelHi: 'गुप्ता' },
      { code: 'Agarwal', labelEn: 'Agarwal', labelHi: 'अग्रवाल' },
      { code: 'Jain', labelEn: 'Jain', labelHi: 'जैन' },
      { code: 'Kesarwani', labelEn: 'Kesarwani', labelHi: 'केसरवानी' },
      { code: 'Gahoi', labelEn: 'Gahoi', labelHi: 'गहोई' },
      { code: 'Maheshwari', labelEn: 'Maheshwari', labelHi: 'माहेश्वरी' },
      { code: 'Teli', labelEn: 'Teli', labelHi: 'तेली' },
      { code: 'Other', labelEn: 'Other', labelHi: 'अन्य' },
    ],
  },
  {
    code: 'Yadav',
    labelEn: 'Yadav',
    labelHi: 'यादव',
    subCastes: [
      { code: 'Ahir', labelEn: 'Ahir', labelHi: 'अहीर' },
      { code: 'Gwala', labelEn: 'Gwala', labelHi: 'ग्वाला' },
      { code: 'Krishnaut', labelEn: 'Krishnaut', labelHi: 'कृष्णौत' },
      { code: 'Other', labelEn: 'Other', labelHi: 'अन्य' },
    ],
  },
  {
    code: 'Kurmi',
    labelEn: 'Kurmi / Patel',
    labelHi: 'कुर्मी / पटेल',
    subCastes: [
      { code: 'Patel', labelEn: 'Patel', labelHi: 'पटेल' },
      { code: 'Verma', labelEn: 'Verma', labelHi: 'वर्मा' },
      { code: 'Sachan', labelEn: 'Sachan', labelHi: 'सचान' },
      { code: 'Gangwar', labelEn: 'Gangwar', labelHi: 'गंगवार' },
      { code: 'Other', labelEn: 'Other', labelHi: 'अन्य' },
    ],
  },
  {
    code: 'Jat',
    labelEn: 'Jat',
    labelHi: 'जाट',
    subCastes: [
      { code: 'Hindu Jat', labelEn: 'Hindu Jat', labelHi: 'हिंदू जाट' },
      { code: 'Muslim Jat', labelEn: 'Muslim Jat', labelHi: 'मुस्लिम जाट' },
      { code: 'Other', labelEn: 'Other', labelHi: 'अन्य' },
    ],
  },
  {
    code: 'Kushwaha',
    labelEn: 'Kushwaha / Maurya / Shakya / Saini',
    labelHi: 'कुशवाहा / मौर्य / शाक्य / सैनी',
    subCastes: [
      { code: 'Maurya', labelEn: 'Maurya', labelHi: 'मौर्य' },
      { code: 'Shakya', labelEn: 'Shakya', labelHi: 'शाक्य' },
      { code: 'Saini', labelEn: 'Saini', labelHi: 'सैनी' },
      { code: 'Koiri', labelEn: 'Koiri', labelHi: 'कोइरी' },
      { code: 'Other', labelEn: 'Other', labelHi: 'अन्य' },
    ],
  },
  {
    code: 'Lodh',
    labelEn: 'Lodh / Lodhi',
    labelHi: 'लोध / लोधी',
    subCastes: [
      { code: 'Lodhi Rajput', labelEn: 'Lodhi Rajput', labelHi: 'लोधी राजपूत' },
      { code: 'Lodh', labelEn: 'Lodh', labelHi: 'लोध' },
      { code: 'Other', labelEn: 'Other', labelHi: 'अन्य' },
    ],
  },
  {
    code: 'Nishad',
    labelEn: 'Nishad / Kewat / Mallah / Bind',
    labelHi: 'निषाद / केवट / मल्लाह / बिंद',
    subCastes: [
      { code: 'Mallah', labelEn: 'Mallah', labelHi: 'मल्लाह' },
      { code: 'Kewat', labelEn: 'Kewat', labelHi: 'केवट' },
      { code: 'Bind', labelEn: 'Bind', labelHi: 'बिंद' },
      { code: 'Kashyap', labelEn: 'Kashyap', labelHi: 'कश्यप' },
      { code: 'Other', labelEn: 'Other', labelHi: 'अन्य' },
    ],
  },
  {
    code: 'Rajbhar',
    labelEn: 'Rajbhar',
    labelHi: 'राजभर',
    subCastes: [{ code: 'Rajbhar', labelEn: 'Rajbhar', labelHi: 'राजभर' }, { code: 'Other', labelEn: 'Other', labelHi: 'अन्य' }],
  },
  {
    code: 'Pasi',
    labelEn: 'Pasi',
    labelHi: 'पासी',
    subCastes: [{ code: 'Pasi', labelEn: 'Pasi', labelHi: 'पासी' }, { code: 'Other', labelEn: 'Other', labelHi: 'अन्य' }],
  },
  {
    code: 'Jatav',
    labelEn: 'Jatav / Chamar',
    labelHi: 'जाटव / चमार',
    subCastes: [
      { code: 'Jatav', labelEn: 'Jatav', labelHi: 'जाटव' },
      { code: 'Chamar', labelEn: 'Chamar', labelHi: 'चमार' },
      { code: 'Ahirwar', labelEn: 'Ahirwar', labelHi: 'अहिरवार' },
      { code: 'Other', labelEn: 'Other', labelHi: 'अन्य' },
    ],
  },
  {
    code: 'Valmiki',
    labelEn: 'Valmiki / Balmiki',
    labelHi: 'वाल्मीकि / बाल्मीकि',
    subCastes: [{ code: 'Valmiki', labelEn: 'Valmiki', labelHi: 'वाल्मीकि' }, { code: 'Other', labelEn: 'Other', labelHi: 'अन्य' }],
  },
  {
    code: 'Muslim',
    labelEn: 'Muslim',
    labelHi: 'मुस्लिम',
    subCastes: [
      { code: 'Sunni', labelEn: 'Sunni', labelHi: 'सुन्नी' },
      { code: 'Shia', labelEn: 'Shia', labelHi: 'शिया' },
      { code: 'Ansari', labelEn: 'Ansari', labelHi: 'अंसारी' },
      { code: 'Qureshi', labelEn: 'Qureshi', labelHi: 'कुरैशी' },
      { code: 'Pathan', labelEn: 'Pathan', labelHi: 'पठान' },
      { code: 'Sheikh', labelEn: 'Sheikh', labelHi: 'शेख' },
      { code: 'Saifi', labelEn: 'Saifi', labelHi: 'सैफी' },
      { code: 'Other', labelEn: 'Other', labelHi: 'अन्य' },
    ],
  },
  {
    code: 'Sikh',
    labelEn: 'Sikh',
    labelHi: 'सिख',
    subCastes: [{ code: 'Sikh', labelEn: 'Sikh', labelHi: 'सिख' }, { code: 'Other', labelEn: 'Other', labelHi: 'अन्य' }],
  },
  {
    code: 'Christian',
    labelEn: 'Christian',
    labelHi: 'ईसाई',
    subCastes: [{ code: 'Christian', labelEn: 'Christian', labelHi: 'ईसाई' }, { code: 'Other', labelEn: 'Other', labelHi: 'अन्य' }],
  },
  {
    code: 'Other',
    labelEn: 'Other',
    labelHi: 'अन्य',
    subCastes: [{ code: 'Other', labelEn: 'Other', labelHi: 'अन्य' }],
  },
];

export function partyLabel(code: string | undefined, lang: 'en' | 'hi'): string {
  if (!code) return '';
  const hit = PARTIES.find((p) => p.code === code);
  if (!hit) return code;
  return lang === 'hi' ? hit.labelHi : hit.labelEn;
}

export function casteLabel(code: string | undefined, lang: 'en' | 'hi'): string {
  if (!code) return '';
  const hit = CASTES.find((c) => c.code === code);
  if (!hit) return code;
  return lang === 'hi' ? hit.labelHi : hit.labelEn;
}

export function subCasteLabel(
  casteCode: string | undefined,
  subCode: string | undefined,
  lang: 'en' | 'hi',
): string {
  if (!subCode) return '';
  const caste = CASTES.find((c) => c.code === casteCode);
  if (!caste) return subCode;
  const sub = caste.subCastes.find((s) => s.code === subCode);
  if (!sub) return subCode;
  return lang === 'hi' ? sub.labelHi : sub.labelEn;
}

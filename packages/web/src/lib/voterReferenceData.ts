// Reference dropdown data for the web /voters filter modal.
//
// Kept here (not pulled across the monorepo) so the web stays a self-
// contained package. The lists mirror the canonical sources:
//  - CASTES → packages/mobile/src/utils/voterOptions.ts (same codes/sub-codes)
//  - UP_DISTRICTS → packages/shared/src/upReferenceData.ts (75 UP districts)
//
// Codes are the values the API expects (English, exact case). Hindi labels
// are display-only; the web uses English labels because the admin surface is
// English-first.

export interface CasteOption {
  code: string;
  label: string;
  subCastes: { code: string; label: string }[];
}

export const CASTES: CasteOption[] = [
  {
    code: 'Brahmin',
    label: 'Brahmin',
    subCastes: [
      { code: 'Sanadhya', label: 'Sanadhya' },
      { code: 'Kanyakubja', label: 'Kanyakubja' },
      { code: 'Saryupareen', label: 'Saryupareen' },
      { code: 'Maithil', label: 'Maithil' },
      { code: 'Gaur', label: 'Gaur' },
      { code: 'Tyagi', label: 'Tyagi' },
      { code: 'Bhumihar', label: 'Bhumihar' },
      { code: 'Other', label: 'Other' },
    ],
  },
  {
    code: 'Kshatriya',
    label: 'Kshatriya (Thakur / Rajput)',
    subCastes: [
      { code: 'Thakur', label: 'Thakur' },
      { code: 'Rajput', label: 'Rajput' },
      { code: 'Chauhan', label: 'Chauhan' },
      { code: 'Tomar', label: 'Tomar' },
      { code: 'Bais', label: 'Bais' },
      { code: 'Parihar', label: 'Parihar' },
      { code: 'Other', label: 'Other' },
    ],
  },
  {
    code: 'Vaishya',
    label: 'Vaishya / Bania',
    subCastes: [
      { code: 'Gupta', label: 'Gupta' },
      { code: 'Agarwal', label: 'Agarwal' },
      { code: 'Jain', label: 'Jain' },
      { code: 'Kesarwani', label: 'Kesarwani' },
      { code: 'Gahoi', label: 'Gahoi' },
      { code: 'Maheshwari', label: 'Maheshwari' },
      { code: 'Teli', label: 'Teli' },
      { code: 'Other', label: 'Other' },
    ],
  },
  {
    code: 'Yadav',
    label: 'Yadav',
    subCastes: [
      { code: 'Ahir', label: 'Ahir' },
      { code: 'Gwala', label: 'Gwala' },
      { code: 'Krishnaut', label: 'Krishnaut' },
      { code: 'Other', label: 'Other' },
    ],
  },
  {
    code: 'Kurmi',
    label: 'Kurmi / Patel',
    subCastes: [
      { code: 'Patel', label: 'Patel' },
      { code: 'Verma', label: 'Verma' },
      { code: 'Sachan', label: 'Sachan' },
      { code: 'Gangwar', label: 'Gangwar' },
      { code: 'Other', label: 'Other' },
    ],
  },
  {
    code: 'Jat',
    label: 'Jat',
    subCastes: [
      { code: 'Hindu Jat', label: 'Hindu Jat' },
      { code: 'Muslim Jat', label: 'Muslim Jat' },
      { code: 'Sikh Jat', label: 'Sikh Jat' },
      { code: 'Other', label: 'Other' },
    ],
  },
  {
    code: 'Kushwaha',
    label: 'Kushwaha / Maurya / Shakya / Saini',
    subCastes: [
      { code: 'Maurya', label: 'Maurya' },
      { code: 'Shakya', label: 'Shakya' },
      { code: 'Saini', label: 'Saini' },
      { code: 'Koiri', label: 'Koiri' },
      { code: 'Other', label: 'Other' },
    ],
  },
  {
    code: 'Lodh',
    label: 'Lodh / Lodhi',
    subCastes: [
      { code: 'Lodhi Rajput', label: 'Lodhi Rajput' },
      { code: 'Lodh', label: 'Lodh' },
      { code: 'Other', label: 'Other' },
    ],
  },
  {
    code: 'Nishad',
    label: 'Nishad / Kewat / Mallah / Bind',
    subCastes: [
      { code: 'Mallah', label: 'Mallah' },
      { code: 'Kewat', label: 'Kewat' },
      { code: 'Bind', label: 'Bind' },
      { code: 'Kashyap', label: 'Kashyap' },
      { code: 'Other', label: 'Other' },
    ],
  },
  {
    code: 'Rajbhar',
    label: 'Rajbhar',
    subCastes: [
      { code: 'Rajbhar', label: 'Rajbhar' },
      { code: 'Other', label: 'Other' },
    ],
  },
  {
    code: 'Pasi',
    label: 'Pasi',
    subCastes: [
      { code: 'Pasi', label: 'Pasi' },
      { code: 'Other', label: 'Other' },
    ],
  },
  {
    code: 'Jatav',
    label: 'Jatav / Chamar',
    subCastes: [
      { code: 'Jatav', label: 'Jatav' },
      { code: 'Chamar', label: 'Chamar' },
      { code: 'Ahirwar', label: 'Ahirwar' },
      { code: 'Other', label: 'Other' },
    ],
  },
  {
    code: 'Valmiki',
    label: 'Valmiki / Balmiki',
    subCastes: [
      { code: 'Valmiki', label: 'Valmiki' },
      { code: 'Other', label: 'Other' },
    ],
  },
  {
    code: 'Muslim',
    label: 'Muslim',
    subCastes: [
      { code: 'Sunni', label: 'Sunni' },
      { code: 'Shia', label: 'Shia' },
      { code: 'Ansari', label: 'Ansari' },
      { code: 'Qureshi', label: 'Qureshi' },
      { code: 'Pathan', label: 'Pathan' },
      { code: 'Sheikh', label: 'Sheikh' },
      { code: 'Saifi', label: 'Saifi' },
      { code: 'Other', label: 'Other' },
    ],
  },
  {
    code: 'Sikh',
    label: 'Sikh',
    subCastes: [
      { code: 'Jat Sikh', label: 'Jat Sikh' },
      { code: 'Khatri', label: 'Khatri' },
      { code: 'Ramgarhia', label: 'Ramgarhia' },
      { code: 'Mazhabi', label: 'Mazhabi' },
      { code: 'Other', label: 'Other' },
    ],
  },
  {
    code: 'Christian',
    label: 'Christian',
    subCastes: [
      { code: 'Roman Catholic', label: 'Roman Catholic' },
      { code: 'Protestant', label: 'Protestant' },
      { code: 'SC Christian', label: 'SC Christian' },
      { code: 'Other', label: 'Other' },
    ],
  },
  {
    code: 'Jain',
    label: 'Jain',
    subCastes: [
      { code: 'Digambar', label: 'Digambar' },
      { code: 'Shvetambar', label: 'Shvetambar' },
      { code: 'Other', label: 'Other' },
    ],
  },
  {
    code: 'Buddhist',
    label: 'Buddhist',
    subCastes: [
      { code: 'Navayana', label: 'Navayana / Neo-Buddhist' },
      { code: 'Theravada', label: 'Theravada' },
      { code: 'Mahayana', label: 'Mahayana' },
      { code: 'Other', label: 'Other' },
    ],
  },
  {
    code: 'Other',
    label: 'Other',
    subCastes: [{ code: 'Other', label: 'Other' }],
  },
];

export function subCastesFor(casteCode: string): { code: string; label: string }[] {
  if (!casteCode) return [];
  const hit = CASTES.find((c) => c.code === casteCode);
  return hit ? hit.subCastes : [];
}

// All 75 UP districts, alphabetised. Mirrors packages/shared/src/upReferenceData.ts
// (UP_DISTRICTS) — copy is intentional so /voters stays self-contained.
export const UP_DISTRICTS: string[] = [
  'Agra',
  'Aligarh',
  'Ambedkar Nagar',
  'Amethi',
  'Amroha',
  'Auraiya',
  'Ayodhya',
  'Azamgarh',
  'Baghpat',
  'Bahraich',
  'Ballia',
  'Balrampur',
  'Banda',
  'Barabanki',
  'Bareilly',
  'Basti',
  'Bhadohi',
  'Bijnor',
  'Budaun',
  'Bulandshahr',
  'Chandauli',
  'Chitrakoot',
  'Deoria',
  'Etah',
  'Etawah',
  'Farrukhabad',
  'Fatehpur',
  'Firozabad',
  'Gautam Buddha Nagar',
  'Ghaziabad',
  'Ghazipur',
  'Gonda',
  'Gorakhpur',
  'Hamirpur',
  'Hapur',
  'Hardoi',
  'Hathras',
  'Jalaun',
  'Jaunpur',
  'Jhansi',
  'Kannauj',
  'Kanpur Dehat',
  'Kanpur Nagar',
  'Kasganj',
  'Kaushambi',
  'Kheri',
  'Kushinagar',
  'Lalitpur',
  'Lucknow',
  'Maharajganj',
  'Mahoba',
  'Mainpuri',
  'Mathura',
  'Mau',
  'Meerut',
  'Mirzapur',
  'Moradabad',
  'Muzaffarnagar',
  'Pilibhit',
  'Pratapgarh',
  'Prayagraj',
  'Raebareli',
  'Rampur',
  'Saharanpur',
  'Sambhal',
  'Sant Kabir Nagar',
  'Shahjahanpur',
  'Shamli',
  'Shravasti',
  'Siddharthnagar',
  'Sitapur',
  'Sonbhadra',
  'Sultanpur',
  'Unnao',
  'Varanasi',
];

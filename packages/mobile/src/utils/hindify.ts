/**
 * Light Roman -> Devanagari replacement for booth/polling-station strings.
 *
 * Booth names from India's voter data typically look like
 * `Primary School Gijoli Room No 1` or `Pri.Vi. Etmadpur` — a mix of
 * English structural terms and Roman-spelled Hindi village names.
 * This helper translates the structural boilerplate to Devanagari and
 * does a syllable-level transliteration for the remaining Roman words
 * so that Hindi-speaking field staff see a single-script label.
 *
 * Village names don't have canonical Hindi spellings in a dictionary
 * we control, so we fall back to an ITRANS-like phonetic render.
 * Accuracy isn't perfect but it's recognisable, which is the bar a
 * booth card needs to clear.
 */

const BOOTH_TERMS: Array<[RegExp, string]> = [
  [/primary\s+school/gi, 'प्राथमिक विद्यालय'],
  [/primary\s+vidyalaya/gi, 'प्राथमिक विद्यालय'],
  [/pri\.?\s*vi\.?/gi, 'प्रा.वि.'],
  [/pra\.?\s*vi\.?/gi, 'प्रा.वि.'],
  [/u\.?p\.?\s*school/gi, 'उ.प्रा.वि.'],
  [/u\.?p\.?vi\.?/gi, 'उ.प्रा.वि.'],
  [/pu\.?\s*ma\.?\s*vi\.?/gi, 'पू.मा.वि.'],
  [/junior\s+high\s+school/gi, 'जूनियर हाई स्कूल'],
  [/inter\s+college/gi, 'इंटर कॉलेज'],
  [/madhyamik/gi, 'माध्यमिक'],
  [/composite/gi, 'कंपोजिट'],
  [/sanskrit/gi, 'संस्कृत'],
  [/pathshala/gi, 'पाठशाला'],
  [/panchayat/gi, 'पंचायत'],
  [/bhawan|bhavan/gi, 'भवन'],
  [/school/gi, 'विद्यालय'],
  [/college/gi, 'कॉलेज'],
  [/vidyalaya/gi, 'विद्यालय'],
  [/kendra/gi, 'केंद्र'],
  [/room\s*no\.?/gi, 'कक्ष सं.'],
  [/\broom\b/gi, 'कक्ष'],
  [/\bhall\b/gi, 'हॉल'],
  [/part\b/gi, 'भाग'],
  [/\bno\.?\s*(\d)/gi, 'सं. $1'],
  [/\bk\.?\s*n\.?\s*/gi, 'क.नं.'],
  [/\bph[ -]?c\b/gi, 'पीएचसी'],
];

// Syllable-level Roman → Devanagari for arbitrary tokens (village names).
// Maps longest keys first so "shri" wins over "sh" + "ri".
const SYLL: Array<[RegExp, string]> = [
  [/shri/gi, 'श्री'],
  [/kshi/gi, 'क्षि'], [/ksha/gi, 'क्षा'], [/ksh/gi, 'क्ष'],
  [/tra/gi, 'त्र'], [/gya/gi, 'ज्ञ'],
  [/chh/gi, 'छ'], [/sh/gi, 'श'], [/kh/gi, 'ख'], [/gh/gi, 'घ'],
  [/ch/gi, 'च'], [/jh/gi, 'झ'], [/th/gi, 'थ'], [/dh/gi, 'ध'],
  [/ph/gi, 'फ'], [/bh/gi, 'भ'],
  [/aa/gi, 'ा'], [/ee/gi, 'ी'], [/oo/gi, 'ू'],
  [/ai/gi, 'ै'], [/au/gi, 'ौ'],
];

// Single-letter mappings applied after multi-char substitutions.
const LETTER: Record<string, string> = {
  a: 'ा', e: 'े', i: 'ि', o: 'ो', u: 'ु',
  k: 'क', g: 'ग', j: 'ज', t: 'त', d: 'द', n: 'न',
  p: 'प', b: 'ब', m: 'म', y: 'य', r: 'र', l: 'ल',
  v: 'व', w: 'व', s: 'स', h: 'ह', f: 'फ', z: 'ज़',
  q: 'क़', x: 'क्स', c: 'क',
};

function transliterateWord(word: string): string {
  if (!word) return word;
  // Replace multi-char syllables with sentinels containing the Devanagari.
  let out = word;
  for (const [rx, rep] of SYLL) out = out.replace(rx, rep);
  // Now map remaining ASCII letters
  let result = '';
  for (const ch of out) {
    if (/[A-Za-z]/.test(ch)) {
      result += LETTER[ch.toLowerCase()] ?? ch;
    } else {
      result += ch;
    }
  }
  // The naive syllable map yields combinations like "कि" via "क" + "ि".
  // Initial-vowel matras ("ा", "ि"...) at word start should become full
  // vowel letters; we fix the most common cases here.
  result = result
    .replace(/^ा/, 'आ')
    .replace(/^ि/, 'इ')
    .replace(/^ी/, 'ई')
    .replace(/^ु/, 'उ')
    .replace(/^ू/, 'ऊ')
    .replace(/^े/, 'ए')
    .replace(/^ै/, 'ऐ')
    .replace(/^ो/, 'ओ')
    .replace(/^ौ/, 'औ');
  return result;
}

function isAsciiLetters(s: string): boolean {
  return /^[A-Za-z]+$/.test(s);
}

/**
 * Convert a mixed-script booth/polling-station label to Devanagari.
 * Non-letter characters (digits, dots, hyphens, Devanagari text that's
 * already there) pass through unchanged.
 */
export function hindifyBoothLabel(input?: string): string {
  if (!input) return '';
  let out = input;
  for (const [rx, rep] of BOOTH_TERMS) out = out.replace(rx, rep);
  // Split on any non-letter sequence but keep separators. Replace each
  // pure-ASCII-letter token (length >= 2) via the syllable engine.
  return out.replace(/[A-Za-z]+/g, (m) => (m.length >= 2 && isAsciiLetters(m) ? transliterateWord(m) : m));
}

/**
 * For booth list rendering: choose Hindi version when lang is 'hi',
 * otherwise the original English name.
 */
export function boothDisplay(name: string | undefined, lang: 'en' | 'hi'): string {
  if (!name) return '';
  return lang === 'hi' ? hindifyBoothLabel(name) : name;
}

// ---------------------------------------------------------------------------
// Devanagari → Roman (for free-text fields typed in Hindi by field staff)
// ---------------------------------------------------------------------------

// Consonants and conjunct helpers — mapped without implicit "a" because
// the schwa is emitted below based on the following character.
const DEV_CONS: Record<string, string> = {
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
  'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
  'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
  'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh',
  'ष': 'sh', 'स': 's', 'ह': 'h',
  'क़': 'q', 'ख़': 'kh', 'ग़': 'gh', 'ज़': 'z', 'ड़': 'r', 'ढ़': 'rh', 'फ़': 'f',
};

const DEV_VOWELS: Record<string, string> = {
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo',
  'ऋ': 'ri', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
};

const DEV_MATRAS: Record<string, string> = {
  'ा': 'aa', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo',
  'ृ': 'ri', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
};

const DEV_NUMERALS: Record<string, string> = {
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
  '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
};

const VIRAMA = '\u094d'; // ् — suppresses the implicit schwa

export function devanagariToRoman(input?: string): string {
  if (!input) return '';
  const chars = Array.from(input);
  let out = '';
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    const next = chars[i + 1];
    if (DEV_CONS[c]) {
      out += DEV_CONS[c];
      // Emit schwa unless followed by a matra, virama, or another consonant
      // at a final position (simple heuristic — good enough for names).
      if (next === VIRAMA) {
        i++; // skip virama; no vowel
      } else if (next && DEV_MATRAS[next]) {
        out += DEV_MATRAS[next];
        i++;
      } else if (!next || /\s|[.,\-()\/]/.test(next)) {
        // trailing schwa at word end — usually dropped in Hindi pronunciation
      } else {
        out += 'a';
      }
      continue;
    }
    if (DEV_VOWELS[c]) {
      out += DEV_VOWELS[c];
      continue;
    }
    if (DEV_NUMERALS[c]) {
      out += DEV_NUMERALS[c];
      continue;
    }
    if (c === 'ं' || c === 'ँ') {
      out += 'n';
      continue;
    }
    if (c === 'ः') {
      out += 'h';
      continue;
    }
    // Pass through spaces, punctuation, latin chars, anything else.
    out += c;
  }
  return out;
}

/**
 * Returns true if the string contains any Devanagari code-point.
 */
export function hasDevanagari(s?: string): boolean {
  if (!s) return false;
  return /[\u0900-\u097F]/.test(s);
}

/**
 * Returns true if the string contains any ASCII letter.
 */
export function hasLatin(s?: string): boolean {
  if (!s) return false;
  return /[A-Za-z]/.test(s);
}

/**
 * Produce both-language variants for a free-text value.
 * - If the input is Devanagari, keep it as the hi variant and transliterate to Roman for en.
 * - If the input is Latin, keep it as the en variant and hindify for hi.
 * - If empty, both sides are undefined.
 */
export function dualLanguage(value: string | undefined): { en?: string; hi?: string } {
  const v = (value || '').trim();
  if (!v) return {};
  if (hasDevanagari(v) && !hasLatin(v)) {
    return { hi: v, en: devanagariToRoman(v) };
  }
  if (hasLatin(v) && !hasDevanagari(v)) {
    return { en: v, hi: hindifyBoothLabel(v) };
  }
  // Mixed script — store as-is on both sides so nothing is lost.
  return { en: v, hi: v };
}

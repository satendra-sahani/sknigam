/**
 * Minimal Devanagari -> Latin transliterator.
 *
 * We don't need academic accuracy here — the goal is that a staff member who
 * does not read Hindi can still recognise a voter name, part name, or
 * discrepancy reason.  The library-free approach keeps the API bundle small
 * and works offline on the server.
 *
 * The mapping follows IAST-ish rules with a few practical choices
 * (e.g. च -> ch, ञ -> n, ङ -> n) that match how names are usually spelt
 * in Indian government documents.
 */

// Order matters for multi-char sequences like क्ष, त्र, ज्ञ.
const DIGRAPHS: Array<[string, string]> = [
  ['क्ष', 'ksh'],
  ['त्र', 'tr'],
  ['ज्ञ', 'gya'],
  ['श्र', 'shr'],
];

const CONSONANTS: Record<string, string> = {
  क: 'k', ख: 'kh', ग: 'g', घ: 'gh', ङ: 'n',
  च: 'ch', छ: 'chh', ज: 'j', झ: 'jh', ञ: 'n',
  ट: 't', ठ: 'th', ड: 'd', ढ: 'dh', ण: 'n',
  त: 't', थ: 'th', द: 'd', ध: 'dh', न: 'n',
  प: 'p', फ: 'ph', ब: 'b', भ: 'bh', म: 'm',
  य: 'y', र: 'r', ल: 'l', व: 'v',
  श: 'sh', ष: 'sh', स: 's', ह: 'h',
  // Nukta consonants (often used for Urdu loans)
  'क़': 'q', 'ख़': 'kh', 'ग़': 'gh', 'ज़': 'z', 'ड़': 'r', 'ढ़': 'rh', 'फ़': 'f', 'य़': 'y',
};

const VOWELS: Record<string, string> = {
  अ: 'a', आ: 'aa', इ: 'i', ई: 'ee', उ: 'u', ऊ: 'oo',
  ऋ: 'ri', ए: 'e', ऐ: 'ai', ओ: 'o', औ: 'au',
  अं: 'an', अः: 'ah',
};

const MATRAS: Record<string, string> = {
  'ा': 'a', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo',
  'ृ': 'ri', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
};

const MODIFIERS: Record<string, string> = {
  'ं': 'n',       // anusvara
  'ः': 'h',       // visarga
  'ँ': 'n',       // chandrabindu
  '्': '',        // halant (suppress implicit 'a')
  '़': '',        // nukta (handled in digraphs above where needed)
  'ऽ': '',        // avagraha
};

const DIGITS: Record<string, string> = {
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
  '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
};

function isDevanagari(ch: string): boolean {
  const code = ch.charCodeAt(0);
  return code >= 0x0900 && code <= 0x097f;
}

export function transliterateHindi(input: string): string {
  if (!input) return '';
  let text = input;

  // Substitute digraphs first.
  for (const [from, to] of DIGRAPHS) {
    text = text.split(from).join(`\u0001${to}\u0001`);
  }

  // Substitute nukta consonants (two-char sequences) first.
  const nuktaChars = Object.keys(CONSONANTS).filter((k) => k.length > 1);
  for (const k of nuktaChars) {
    text = text.split(k).join(`\u0001${CONSONANTS[k]}\u0001`);
  }

  let out = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '\u0001') continue; // sentinel from digraph substitution

    if (DIGITS[ch]) { out += DIGITS[ch]; continue; }

    if (CONSONANTS[ch]) {
      out += CONSONANTS[ch];
      // Implicit 'a' unless followed by halant or a matra/modifier
      const suppress = next === '्' || MATRAS[next] !== undefined || next === 'ं' || next === 'ः' || next === 'ँ';
      if (!suppress) out += 'a';
      continue;
    }
    if (VOWELS[ch]) { out += VOWELS[ch]; continue; }
    if (MATRAS[ch]) { out += MATRAS[ch]; continue; }
    if (MODIFIERS[ch] !== undefined) { out += MODIFIERS[ch]; continue; }

    if (isDevanagari(ch)) {
      // Unknown devanagari character — skip rather than emit garbage.
      continue;
    }

    out += ch;
  }

  // Collapse whitespace, title-case words so names look natural.
  out = out.replace(/\s+/g, ' ').trim();
  return out
    .split(' ')
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

// The brāhmaṇas of the Bṛhadāraṇyaka studied in the archive, keyed by the
// `${adhyaya}-${brahmana}` URL segment used by the class pages. When a new
// brāhmaṇa begins, add one entry here; the Bṛhadāraṇyaka landing page, the
// brāhmaṇa class lists, the homepage stats and the flashcards all read it.

export interface BrahmanaInfo {
  key: string;
  adhyaya: number;
  brahmana: number;
  name: string;
  nameDeva: string;
  /** Total mantras in the brāhmaṇa (bounds the "mantras covered" count). */
  mantraCount: number;
  playlistUrl: string;
  /** Complete Source Text page, relative to BASE_URL. */
  sourceTextPath: string;
  /** Optional orientation page, relative to BASE_URL. */
  introPath?: string;
  blurb: string;
}

export const BRAHMANAS: BrahmanaInfo[] = [
  {
    key: '2-4',
    adhyaya: 2,
    brahmana: 4,
    name: 'Maitreyī Brāhmaṇa',
    nameDeva: 'मैत्रेयीब्राह्मणम्',
    mantraCount: 14,
    playlistUrl: 'https://www.youtube.com/playlist?list=PLFx8rf4WVNI6Iu1Icx5k7_29L4VQ7TXmn',
    sourceTextPath: '/source-text/',
    introPath: '/brhadaranyaka/maitreyI-brahmanA/',
    blurb: 'Yājñavalkya, about to take saṃnyāsa, teaches his wife Maitreyī the means to amṛtatva — ātmā vā are draṣṭavyaḥ — with Śāṅkara Bhāṣya, Sureśvara\'s Vārtika and Vidyāraṇya\'s Vārtikasāra.',
  },
  {
    key: '2-5',
    adhyaya: 2,
    brahmana: 5,
    name: 'Madhu Brāhmaṇa',
    nameDeva: 'मधुब्राह्मणम्',
    mantraCount: 19,
    playlistUrl: 'https://www.youtube.com/playlist?list=PLQ1OMdSPeb_M',
    sourceTextPath: '/source-text/madhu/',
    blurb: 'The Madhu-vidyā: earth, waters, fire and all the rest are madhu to all beings and all beings madhu to them — whatever is mutually dependent has one reality, ayam eva sa yo\'yam ātmā — with Śāṅkara Bhāṣya.',
  },
];

export function brahmanaKey(adhyaya: number, brahmana: number) {
  return `${adhyaya}-${brahmana}`;
}

export function getBrahmana(adhyaya: number, brahmana: number) {
  return BRAHMANAS.find(b => b.adhyaya === adhyaya && b.brahmana === brahmana);
}

/** Highest mantra number of this brāhmaṇa named in any class `source_ref`
 *  (e.g. "Bṛhad. 2.5.2–2.5.11" → 11). Coverage is sequential, so the maximum
 *  is the count. Only source_ref is read, never source_text_content, so that
 *  Vārtika verse numbers ("2-4-71") and bhāṣyam citations are not counted. */
export function mantrasCovered(
  info: BrahmanaInfo,
  classes: { data: { adhyaya: number; brahmana: number; source_ref?: string } }[],
) {
  const re = new RegExp(`${info.adhyaya}[.-]${info.brahmana}[.-](\\d+)`, 'g');
  const nums = classes
    .filter(c => c.data.adhyaya === info.adhyaya && c.data.brahmana === info.brahmana)
    .flatMap(c => [...(c.data.source_ref || '').matchAll(re)].map(m => parseInt(m[1], 10)))
    .filter(n => n >= 1 && n <= info.mantraCount);
  return nums.length ? Math.max(...nums) : 0;
}

/* Local, occurrence-level Sanskrit search. Canonical source strings are never rewritten. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./vendor/sanscript-1.3.3.js'));
  else root.VedantaSearch = factory(root.Sanscript);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (defaultSanscript) {
  'use strict';
  const RANK = { exact: 0, normalized: 1, sandhi: 2, approximate: 3 };
  const LABELS = { exact: 'यथावत्', normalized: 'सामान्यीकृतं साम्यम्', sandhi: 'सन्ध्यनुकूलं साम्यम्', approximate: 'सन्निकटं साम्यम्' };
  const IGNORE = /[\s\p{P}\p{S}\p{N}\u00ad\u200b-\u200d\ufeff\u0951-\u0954\u1cd0-\u1cff\ua8e0-\ua8f1ऽ]/u;
  const ACCENTS = /[\u00ad\u200b-\u200d\ufeff\u0951-\u0954\u1cd0-\u1cff\ua8e0-\ua8f1]/gu;
  const GROUPS = ['grammar', 'sandhi', 'samasa', 'krdanta', 'taddhita', 'karaka', 'dhatu', 'avyaya', 'prayoga', 'pratyaya'];
  const FIELDS = ['padaccheda', 'anvaya', 'sarala', 'padacchedaNote', 'anvayaNote', 'grammarNote', 'samasaNote', 'taddhitaNote', 'annotationNote'];
  const ROW_FIELDS = ['word', 'form', 'meaning', 'description', 'explanation', 'split', 'vigraha', 'type', 'note'];
  const segmenter = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('sa', { granularity: 'grapheme' }) : null;
  const graphemes = text => segmenter ? [...segmenter.segment(text)].map(s => ({ text: s.segment, start: s.index, end: s.index + s.segment.length })) : [...text.matchAll(/\P{M}\p{M}*|\p{M}+/gu)].map(m => ({ text: m[0], start: m.index, end: m.index + m[0].length }));
  const strings = value => (Array.isArray(value) ? value : [value]).filter(v => typeof v === 'string' && v.trim());
  const compact = value => [...String(value).normalize('NFC').replace(ACCENTS, '')].filter(c => !IGNORE.test(c)).join('');
  const withAnchor = (url, anchor) => { try { const u = new URL(url); u.hash = anchor || u.hash; return u.href; } catch { return url || ''; } };
  // Literal identity intentionally retains SHY, accents and every source byte.
  // Equal publication copies may share occurrences; textual variants may not.
  function sourceIdentityInput(doc) {
    let work = doc.workId || '', anchor = doc.anchor || '';
    try { const url = new URL(doc.sourceUrl); work ||= url.origin + '/' + (url.pathname.split('/')[2] || url.pathname); anchor ||= decodeURIComponent(url.hash.slice(1)); } catch {}
    return JSON.stringify(['vp-source-literal-v1', work, anchor || doc.id || '', doc.text]);
  }
  function sourceLocation(doc) {
    return Object.fromEntries(['sourceUrl','route','anchor','carrier','anchor_evidence','resourceUrl','jsonPointer','publisherChunk'].filter(key => doc[key] !== undefined).map(key => [key,doc[key]]));
  }
  function mergeLocations(target, incoming) {
    const rows = target.sourceLocations ||= [];
    for (const item of incoming.sourceLocations || [sourceLocation(incoming)]) {
      if (item.sourceUrl && !rows.some(row => row.sourceUrl === item.sourceUrl && row.route === item.route && row.anchor === item.anchor && row.resourceUrl === item.resourceUrl && row.jsonPointer === item.jsonPointer)) rows.push(item);
    }
  }

  function mapped(text, convert = s => s) {
    const chars = [], starts = [], ends = [];
    for (const g of graphemes(text)) {
      for (const c of compact(convert(g.text.normalize('NFC').replace(ACCENTS, '')))) {
        chars.push(c); starts.push(g.start); ends.push(g.end);
      }
    }
    return { key: chars.join(''), chars, starts, ends, text };
  }

  // SLP1 gives one symbol per Sanskrit sound. These folds only cover a few
  // common phonological alternations; they are candidate retrieval, not parsing.
  function sandhiMap(input) {
    const out = { chars: [], starts: [], ends: [] };
    const push = (c, i, j = i) => { out.chars.push(c); out.starts.push(input.starts[i]); out.ends.push(input.ends[j]); };
    const c = input.chars;
    const gapAfter = i => input.text?.slice(input.ends[i], input.starts[i + 1] ?? input.text.length) || '';
    // Soft hyphens and zero-width/svara marks do not prove a word boundary.
    const wordEnd = i => i === c.length - 1 || /[\s\p{P}\p{S}\p{N}ऽ]/u.test(gapAfter(i));
    const wordStart = i => i === 0 || wordEnd(i - 1);
    for (let i = 0; i < c.length; i++) {
      const a = c[i], b = c[i + 1] || '';
      // Verified local phrase: वै + अरे → वायरे / वा अरे (6.1.78,
      // 8.3.19). Scope this alias to whole words/observed boundaries; do not
      // collapse arbitrary ai/ā or delete every intervocalic y. The common
      // key agrees with the existing vowel-contact key for वा अरे.
      if (a === 'v' && wordStart(i)) {
        const tail = c.slice(i, i + 6).join('');
        const separated = tail.startsWith('vEare') && wordEnd(i + 1) && wordEnd(i + 4);
        const joined = tail.startsWith('vAyare') && wordEnd(i + 5);
        if (separated || joined) {
          const r = i + (joined ? 4 : 3), e = r + 1;
          push('v', i); push('A', i + 1, r - 1); push('r', r); push('e', e);
          i = e; continue;
        }
      }
      // Only at observed word boundaries: aḥ/o and iḥ/ir, uḥ/ur. Do not erase
      // arbitrary internal visargas or conflate all s/r consonants.
      if (a === 'a' && b === 'H' && wordEnd(i + 1)) { push('~', i, i + 1); i++; continue; }
      if (a === 'o' && wordEnd(i)) { push('~', i); if (/[ऽ']/u.test(gapAfter(i))) push('a', i); continue; }
      if ((a === 'r' || a === 'H') && /[iIuU]/.test(c[i - 1] || '') && wordEnd(i)) { push('H', i); continue; }
      if ((/[aA]/.test(a) && /[aA]/.test(b)) || (/[iI]/.test(a) && /[iI]/.test(b)) || (/[uU]/.test(a) && /[uU]/.test(b))) {
        push(a.toUpperCase(), i, i + 1); i++; continue;
      }
      if (/[iIuUfF]/.test(a) && /[aAiIuUfFxXeEoO]/.test(b) && a.toLowerCase() !== b.toLowerCase()) {
        push(/[iI]/.test(a) ? 'y' : /[uU]/.test(a) ? 'v' : 'r', i); continue;
      }
      if ((a === 'N' && /[kKgG]/.test(b)) || (a === 'Y' && /[cCjJ]/.test(b)) || (a === 'R' && /[wWqQ]/.test(b)) || (a === 'n' && /[tTdD]/.test(b)) || (a === 'm' && /[pPbB]/.test(b))) {
        push('M', i); continue;
      }
      push(a, i);
    }
    out.key = out.chars.join(''); return out;
  }

  // Loss of vowel length, retroflexion, and sibilant distinction belongs ONLY
  // to approximate suggestions. It must never promote a result to exact/sandhi.
  function looseMap(input) {
    const out = { chars: [], starts: [], ends: [] };
    const substitutions = { A: 'a', I: 'i', U: 'u', f: 'r', F: 'r', x: 'l', X: 'l', E: 'ai', O: 'au', K: 'kh', G: 'gh', N: 'n', C: 'ch', J: 'jh', Y: 'n', w: 't', W: 'th', q: 'd', Q: 'dh', R: 'n', T: 'th', D: 'dh', P: 'ph', B: 'bh', S: 's', z: 's', H: 'h', M: 'm' };
    input.chars.forEach((c, i) => {
      for (const x of substitutions[c] || c) {
        if (!/[a-z]/.test(x)) continue;
        if (/[aiu]/.test(x) && out.chars.at(-1) === x) { out.ends[out.ends.length - 1] = input.ends[i]; continue; }
        out.chars.push(x); out.starts.push(input.starts[i]); out.ends.push(input.ends[i]);
      }
    });
    out.key = out.chars.join(''); return out;
  }

  function schemeCandidates(text, S, requested) {
    function nativeConvert(value, name) {
      const scheme = S.schemes[name];
      if (name === 'devanagari') return value;
      if (scheme.isRomanScheme) return S.t(value, name, 'devanagari');
      // This bundled Sanscript version cannot decode some supplementary-plane
      // scripts. Direct longest-token mapping of Brahmic glyphs also handles
      // those scripts, without inventing vowels or changing the vendor file.
      const reverse = new Map();
      for (const category of ['vowels', 'vowel_marks', 'yogavaahas', 'virama', 'consonants', 'extra_consonants', 'symbols', 'zwj', 'skip']) {
        for (const [deva, glyph] of Object.entries(scheme[category] || {})) if (glyph && !reverse.has(glyph)) reverse.set(glyph, deva);
      }
      const keys = [...reverse.keys()].sort((a, b) => b.length - a.length);
      let result = '';
      for (let i = 0; i < value.length;) {
        const token = keys.find(k => value.startsWith(k, i));
        if (token) { result += reverse.get(token); i += token.length; }
        else { const c = String.fromCodePoint(value.codePointAt(i)); result += c; i += c.length; }
      }
      return result;
    }
    if (requested && requested !== 'auto') {
      if (!S.schemes[requested]) return [];
      return [{ scheme: requested, text: nativeConvert(text, requested) }];
    }
    // Detect Brahmic scripts from the actual bundled scheme inventories. Roman
    // case is deliberately untouched until the ITRANS parser has consumed it.
    const counts = [];
    for (const [name, scheme] of Object.entries(S.schemes)) {
      if (scheme.isRomanScheme) continue;
      const inventory = new Set(Object.values({ ...scheme.vowels, ...scheme.consonants, ...scheme.extra_consonants, ...scheme.vowel_marks }).flatMap(v => [...v]).filter(c => /\p{L}|\p{M}/u.test(c) && !/[A-Za-z]/.test(c)));
      const count = [...text].reduce((n, c) => n + Number(inventory.has(c)), 0);
      if (count) counts.push({ name, count });
    }
    counts.sort((a, b) => b.count - a.count || (a.name === 'devanagari' ? -1 : 0));
    let schemes = counts.length ? counts.filter(c => c.count === counts[0].count).slice(0, 3).map(c => c.name) : /[āīūṛṝḷḹṅñṭḍṇśṣṃṁḥĀĪŪṚṜḶṄÑṬḌṆŚṢḤ]/u.test(text) ? ['iast'] : ['itrans', 'iast'];
    // A Devanagari/Indic query can include a Roman word; mixed scripts are not
    // guessed as a single encoding. Its recognizable native portions still work.
    const seen = new Set(), result = [];
    for (const scheme of schemes) {
      try {
        const converted = nativeConvert(text, scheme);
        if (/[A-Za-z]/.test(converted) || !/[\u0900-\u097f]/.test(converted) || seen.has(converted)) continue;
        seen.add(converted); result.push({ scheme, text: converted });
      } catch { /* Unsupported/transliteration-only scheme: no invented result. */ }
    }
    return result;
  }

  // Align an explicitly authored padaccheda to its canonical original. This is
  // only offset bookkeeping: the alias remains labelled sandhi, never source.
  function alignAlias(alias, canonical) {
    const a = alias.chars, b = canonical.chars, width = b.length + 1;
    const directions = new Uint8Array((a.length + 1) * width);
    let prev = Uint32Array.from({ length: width }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      const cur = new Uint32Array(width); cur[0] = i; directions[i * width] = 1;
      for (let j = 1; j <= b.length; j++) {
        const diagonal = prev[j - 1] + Number(a[i - 1] !== b[j - 1]), del = prev[j] + 1, ins = cur[j - 1] + 1;
        cur[j] = Math.min(diagonal, del, ins);
        directions[i * width + j] = cur[j] === diagonal ? 0 : cur[j] === del ? 1 : 2;
      }
      prev = cur;
    }
    const starts = [], ends = [];
    let i = a.length, j = b.length;
    while (i > 0) {
      const direction = directions[i * width + j];
      if (j > 0 && direction === 2) { j--; continue; }
      const at = Math.max(0, Math.min(b.length - 1, j - 1));
      starts[i - 1] = canonical.starts[at] || 0; ends[i - 1] = canonical.ends[at] || 0;
      i--; if (j > 0 && direction === 0) j--;
    }
    return { ...alias, starts, ends };
  }

  function occurrences(haystack, needle) {
    if (!needle) return [];
    const found = []; let at = -1;
    while ((at = haystack.indexOf(needle, at + 1)) !== -1) found.push([at, at + needle.length, 0]);
    return found;
  }

  function fuzzyOccurrences(haystack, query, maxDistance) {
    const n = haystack.length, m = query.length, width = n + 1;
    const directions = new Uint8Array((m + 1) * width);
    let prev = new Uint16Array(width);
    for (let i = 1; i <= m; i++) {
      const cur = new Uint16Array(width); cur[0] = i; directions[i * width] = 1;
      for (let j = 1; j <= n; j++) {
        const diagonal = prev[j - 1] + Number(query[i - 1] !== haystack[j - 1]), del = prev[j] + 1, ins = cur[j - 1] + 1;
        cur[j] = Math.min(diagonal, del, ins);
        directions[i * width + j] = cur[j] === diagonal ? 0 : cur[j] === del ? 1 : 2;
      }
      prev = cur;
    }
    const candidates = [];
    for (let end = 1; end <= n; end++) {
      if (prev[end] > maxDistance) continue;
      let i = m, j = end;
      while (i > 0) { const d = directions[i * width + j]; if (j > 0 && d === 2) j--; else { i--; if (j > 0 && d === 0) j--; } }
      if (end - j >= m - maxDistance) candidates.push([j, end, prev[end]]);
    }
    // One suggestion per occurrence, not every nearby edit-distance endpoint.
    candidates.sort((a, b) => a[2] - b[2] || Math.abs(a[1] - a[0] - m) - Math.abs(b[1] - b[0] - m) || a[0] - b[0]);
    const kept = [];
    for (const c of candidates) if (!kept.some(k => Math.max(k[0], c[0]) < Math.min(k[1], c[1]))) kept.push(c);
    return kept;
  }

  function documentsFromCorpus(corpus = {}) {
    const documents = [];
    const lessons = Array.isArray(corpus.lessons) ? corpus.lessons : corpus.lessons?.lessons || [];
    const works = Array.isArray(corpus.independentWorks) ? corpus.independentWorks : corpus.independentWorks?.works || corpus.works || [];
    function addSource(entry, text, meta, aliases) {
      if (typeof text !== 'string' || !text.trim()) return;
      documents.push({ ...meta, id: 'source:' + meta.anchor, text, origin: 'original', canonicalSource: text, aliases: strings(aliases), helpEntryId: null });
      addHelp(entry, { ...meta, canonicalSource: text });
    }
    function addHelp(entry, meta) {
      const add = (value, field, path = field) => strings(value).forEach((text, i) => documents.push({ ...meta, id: `help:${meta.anchor}:${path}:${i}`, text, origin: 'help', sourceType: 'help', parentSourceType: meta.sourceType, helpKind: field.split('.')[0], helpEntryId: `${path}:${i}`, aliases: [] }));
      for (const field of FIELDS) add(entry[field], field);
      for (const field of ['padartha', 'bridge', ...GROUPS]) {
        (entry[field] || []).forEach((row, i) => {
          if (typeof row === 'string') return add(row, field, `${field}.${i}`);
          for (const key of ROW_FIELDS) add(row[key], field, `${field}.${i}.${key}`);
          (row.sutraRefs || []).forEach((ref, j) => add(ref.note, field, `${field}.${i}.sutraRefs.${j}.note`));
        });
      }
      if (entry.grammarStudy) {
        const nested = entry.grammarStudy;
        for (const field of GROUPS) (nested[field] || []).forEach((row, i) => {
          for (const key of ROW_FIELDS) add(row[key], 'grammarStudy', `grammarStudy.${field}.${i}.${key}`);
          (row.sutraRefs || []).forEach((ref, j) => add(ref.note, 'grammarStudy', `grammarStudy.${field}.${i}.sutraRefs.${j}.note`));
        });
        add(nested.grammarNote, 'grammarStudy', 'grammarStudy.grammarNote');
      }
      (entry.sections || []).forEach((section, i) => { for (const key of ['sarala', 'explanation', 'text']) add(section[key], 'sections', `sections.${i}.${key}`); });
    }
    for (const lesson of lessons) {
      const route = '#' + encodeURIComponent(lesson.id), workId = lesson.workId || 'brihadaranyaka-bhashya';
      const common = { lessonId: lesson.id, workId, title: lesson.title || lesson.reference || lesson.id, route };
      addSource(lesson, lesson.mulam, { ...common, sourceType: 'mula', contextId: 'mula', anchor: lesson.sourceAnchor || lesson.id, sourceUrl: lesson.sourceUrl || '' }, lesson.padaccheda);
      for (const b of lesson.bhashya || []) {
        const anchor = b.sourceAnchor || b.id;
        addSource(b, b.original, { ...common, sourceType: b.sourceKind || 'bhashya', contextId: b.id, anchor, sourceUrl: withAnchor(lesson.sourceUrl, anchor) }, b.padaccheda);
      }
    }
    for (const work of works) for (const unit of work.units || []) {
      const lessonId = 'work/' + work.id + '/' + unit.id, anchor = unit.sourceAnchor || unit.id;
      const sourceType = work.id.includes('vartika') ? 'vartika' : work.id.includes('anandagiri') ? 'tika' : 'independent';
      addSource(unit, unit.original, { lessonId, workId: work.id, title: unit.title || work.title, route: '#' + encodeURIComponent(lessonId), sourceType, contextId: 'mula', anchor, sourceUrl: unit.sourceUrl || withAnchor(work.sourceUrl, anchor) }, unit.padaccheda);
    }
    return documents;
  }

  function createIndex(corpus = {}, options = {}) {
    const S = options.sanscript || defaultSanscript;
    if (!S?.t || !S?.schemes) throw new Error('The bundled Sanscript library is required for Sanskrit search.');
    const entries = new Map();
    function addDocuments(documents) {
      for (const source of documents || []) {
        if (!source || typeof source.text !== 'string' || !source.text.trim()) continue;
        const doc = { origin: 'original', sourceType: 'source', route: '', anchor: '', sourceUrl: '', contextId: 'mula', ...source };
        doc.id ||= `${doc.origin}:${doc.workId || ''}:${doc.anchor}:${doc.helpEntryId || ''}`;
        doc.canonicalSource ||= doc.origin === 'original' ? doc.text : '';
        if(doc.canonicalIdentity)doc.sourceLocations||=[sourceLocation(doc)];
        const entryKey = doc.canonicalIdentity || doc.id, previous = entries.get(entryKey);
        if (doc.canonicalIdentity && previous) { mergeLocations(previous.doc, doc); continue; }
        const norm = mapped(doc.text), roman = mapped(doc.text, x => S.t(x, 'devanagari', 'slp1'));
        const aliases = strings(doc.aliases).map(alias => {
          const plain = alignAlias(mapped(alias), norm);
          const r = mapped(alias, x => S.t(x, 'devanagari', 'slp1'));
          // Roman aliases are aligned in their own phoneme alphabet.
          return { normalized: plain, sandhi: alignAlias(sandhiMap(r), sandhiMap(roman)) };
        });
        entries.set(entryKey, { doc, glyphs: graphemes(doc.text), normalized: norm, sandhi: sandhiMap(roman), loose: looseMap(roman), aliases });
      }
      return api;
    }
    function stats() {
      const values = [...entries.values()];
      return { documents: values.length, originals: values.filter(x => x.doc.origin === 'original').length, helpEntries: values.filter(x => x.doc.origin === 'help').length, scope: 'indexed-corpus-only' };
    }
    function search(query, opts = {}) {
      const raw = String(query ?? '').normalize('NFC').trim();
      const output = { query: raw, variants: [], results: [], total: 0, stats: stats(), approximateFallback: false };
      if (!raw || !compact(raw)) return output;
      const variants = schemeCandidates(raw, S, opts.scheme || 'auto');
      output.variants = variants;
      if (!variants.length) return output;
      const q = variants.map(v => { const roman = mapped(v.text, x => S.t(x, 'devanagari', 'slp1')); return { ...v, normalized: compact(v.text), sandhi: sandhiMap(roman).key, loose: looseMap(roman).key }; });
      const records = [...entries.values()].filter(e => (opts.scope !== 'original' || e.doc.origin === 'original') && (opts.scope !== 'help' || e.doc.origin === 'help') && (!opts.workId || e.doc.workId === opts.workId));
      const hits = [];
      function add(e, map, spans, type, variant, representation = 'source') {
        for (const [a, b, distance] of spans) {
          const start = map ? map.starts[a] : a, end = map ? map.ends[b - 1] : b;
          if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
          hits.push({ e, start, end, matchType: type, inputScheme: variant.scheme, representation, distance });
        }
      }
      for (const e of records) for (const v of q) {
        add(e, null, occurrences(e.doc.text, v.text), 'exact', v);
        add(e, e.normalized, occurrences(e.normalized.key, v.normalized), 'normalized', v);
        if (v.sandhi.length >= 3) add(e, e.sandhi, occurrences(e.sandhi.key, v.sandhi), 'sandhi', v);
        for (const a of e.aliases) {
          add(e, a.normalized, occurrences(a.normalized.key, v.normalized), 'sandhi', v, 'padaccheda');
          if (v.sandhi.length >= 3) add(e, a.sandhi, occurrences(a.sandhi.key, v.sandhi), 'sandhi', v, 'padaccheda');
        }
      }
      // Approximate search is a fallback by default. Short queries never trigger
      // edit-distance expansion. Callers can explicitly request always mode.
      if (opts.approximate !== false && [...compact(raw)].length >= 6 && (!hits.length || opts.approximate === 'always')) {
        const looseQueries = [...new Map(q.filter(v => v.loose.length >= 6 && v.loose.length <= 240).map(v => [v.loose, v])).values()];
        output.approximateFallback = looseQueries.length > 0;
        for (const e of records) for (const v of looseQueries) {
          const maxDistance = Math.min(4, Math.max(1, Math.floor(v.loose.length * 0.13)));
          add(e, e.loose, fuzzyOccurrences(e.loose.key, v.loose, maxDistance), 'approximate', v, 'phonetic-suggestion');
        }
      }
      hits.sort((a, b) => RANK[a.matchType] - RANK[b.matchType] || a.distance - b.distance || a.e.doc.id.localeCompare(b.e.doc.id) || a.start - b.start);
      const unique = [], seenByDocument = new Map();
      for (const h of hits) {
        // Alignment may expand an alias by a glyph. Prefer the highest-quality
        // occurrence if its range overlaps the same occurrence substantially.
        const identity = h.e.doc.canonicalIdentity || h.e.doc.id, prior = seenByDocument.get(identity) || [];
        if (prior.some(u => u.start === h.start && u.end === h.end || (u.matchType !== h.matchType || u.representation !== h.representation) && Math.max(u.start, h.start) < Math.min(u.end, h.end) && Math.min(u.end, h.end) - Math.max(u.start, h.start) >= Math.min(u.end - u.start, h.end - h.start) * 0.7)) continue;
        unique.push(h); prior.push(h); seenByDocument.set(identity, prior);
      }
      output.results = unique.map(h => {
        const d = h.e.doc, margin = Number.isFinite(opts.excerptContext) ? Math.max(0, opts.excerptContext) : 55;
        let from = Math.max(0, h.start - margin), to = Math.min(d.text.length, h.end + margin);
        // Keep excerpt edges at grapheme boundaries so Devanagari is intact.
        const gs = h.e.glyphs; from = gs.find(g => g.end > from)?.start || 0; to = gs.find(g => g.end >= to)?.end || d.text.length;
        const excerpt = d.text.slice(from, to);
        return { id: `${d.canonicalIdentity || d.id}@${h.start}:${h.end}`, documentId: d.id, canonicalIdentity:d.canonicalIdentity, sourceLocations:d.sourceLocations, lessonId: d.lessonId, workId: d.workId, title: d.title || '', origin: d.origin, sourceType: d.sourceType, parentSourceType: d.parentSourceType, helpKind: d.helpKind || null, helpEntryId: d.helpEntryId || null, contextId: d.contextId, route: d.route, anchor: d.anchor, sourceUrl: d.sourceUrl, matchType: h.matchType, matchLabel: LABELS[h.matchType], inputScheme: h.inputScheme, representation: h.representation, distance: h.distance, matchStart: h.start, matchEnd: h.end, matchedText: d.text.slice(h.start, h.end), excerpt, excerptStart: from, canonicalExcerpt: d.origin === 'original' ? excerpt : null, authoredExcerpt: d.origin === 'help' ? excerpt : null, canonicalSource: d.canonicalSource, rank: RANK[h.matchType] };
      });
      output.total = output.results.length;
      return output;
    }
    const api = { search, addDocuments, get stats() { return stats(); } };
    addDocuments(documentsFromCorpus(corpus));
    if (Array.isArray(corpus.documents)) addDocuments(corpus.documents);
    return api;
  }
  // Build-time retrieval keys omit character-offset arrays. The final engine
  // reconstructs those only for candidate paragraphs, preserving match labels
  // and original offsets without indexing the whole corpus in worker memory.
  function prepareSourceDocuments(documents, options={}) {
    const S=options.sanscript||defaultSanscript;
    return documents.map(d=>{const roman=mapped(String(d.text||''),x=>S.t(x,'devanagari','slp1'));return {...d,searchKeys:{version:1,sandhi:sandhiMap(roman).key,loose:looseMap(roman).key}};});
  }
  function candidateDocuments(documents,query,options={}) {
    const S=options.sanscript||defaultSanscript,raw=String(query??'').normalize('NFC').trim();if(!raw)return [];
    const variants=schemeCandidates(raw,S,options.scheme||'auto').map(v=>{const roman=mapped(v.text,x=>S.t(x,'devanagari','slp1'));return {text:v.text,normalized:compact(v.text),sandhi:sandhiMap(roman).key,loose:looseMap(roman).key};});
    return documents.filter(d=>{
      if(d.searchKeys?.version!==1||d.padaccheda||d.aliases?.length)return true;
      let normalized;
      return variants.some(v=>{
        if(d.text.includes(v.text))return true;
        normalized??=compact(d.text);if(normalized.includes(v.normalized))return true;
        if(v.sandhi.length>=3&&d.searchKeys.sandhi.includes(v.sandhi))return true;
        if(options.approximate&&[...compact(raw)].length>=6&&v.loose.length>=6&&v.loose.length<=240){const distance=Math.min(4,Math.max(1,Math.floor(v.loose.length*0.13)));return fuzzyOccurrences(d.searchKeys.loose,v.loose,distance).length>0;}
        return false;
      });
    });
  }
  return Object.freeze({ createIndex, documentsFromCorpus, prepareSourceDocuments, candidateDocuments, sourceIdentityInput, sourceLocation, mergeLocations, matchLabels: Object.freeze(LABELS) });
});

// The same tested engine also runs as a dedicated worker. Corpus shards are
// scanned in bounded memory; source text is never downloaded at page startup.

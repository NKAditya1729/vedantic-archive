#!/usr/bin/env python3
"""
parse_master_rtf.py — Parse the master Maitreyi Brahmana RTF and generate
Devanagari + IAST HTML panels for source-text.astro.

Colour table from RTF:
  cf2 = (26,26,26)  #1a1a1a → Bhashyam (normal) or Mulam (when bold)
  cf5 = (91,26,142) #5B1A8E → Vartika
  cf6 = (181,69,16) #B54510 → Pratika (bold+underline inline span)
"""

import re
import glob
from html import escape
from indic_transliteration import sanscript
from indic_transliteration.sanscript import transliterate


# ── Colour → role mapping (hex-based, robust to colour-table reordering) ──────
# The master RTF's colour table has been reworked over time and the cf indices
# are NOT stable. So we resolve every cf index to its RGB hex (read from the
# file's own \colortbl) and map the hex to one of the canonical source roles.
#   text    → #1a1a1a : bhāṣyam (normal) / mūlam (bold)
#   pratika → #b54510, #af4504 (mantra-words), #0000ff (scriptural citations)
#   vartika → #80017f, #800080, #5b1a8e
#   skip    → #e6000e (document title), #000000 (editorial English notes), white
ROLE_BY_HEX = {
    '1a1a1a': 'text',
    'b54510': 'pratika',
    'af4504': 'pratika',
    '0000ff': 'pratika',
    '80017f': 'vartika',
    '800080': 'vartika',
    '5b1a8e': 'vartika',
    'e6000e': 'skip',
    'ffffff': 'skip',
    # NB: pure black #000000 is NOT mapped to 'skip' — it appears both as
    # stray single chars inside real text (must be kept) and as editorial
    # English notes (skipped at paragraph level via the Latin-dominant rule).
    '000000': 'text',
}

CF_HEX = {}   # cf index → 6-digit hex, populated by load_colortbl() in main()


def load_colortbl(rtf: str):
    """Parse \\colortbl and fill CF_HEX (1-based cf index → 'rrggbb')."""
    CF_HEX.clear()
    m = re.search(r'\\colortbl;(.*?)}', rtf, re.S)
    if not m:
        return
    for i, entry in enumerate(m.group(1).split(';')):
        rgb = dict(re.findall(r'\\(red|green|blue)(\d+)', entry))
        if rgb:
            CF_HEX[i + 1] = '%02x%02x%02x' % (
                int(rgb.get('red', 0)), int(rgb.get('green', 0)), int(rgb.get('blue', 0)))


def cf_role(cf):
    """Canonical role for a colour index: text / pratika / vartika / skip."""
    return ROLE_BY_HEX.get(CF_HEX.get(cf, ''), 'text')


# ── RTF tokeniser ────────────────────────────────────────────────────────────

def tokenise(rtf: str):
    """Yield (kind, value) tokens from an RTF string.
    kinds: 'open', 'close', 'ctrl', 'hex', 'uni', 'text', 'newline'
    """
    i = 0
    n = len(rtf)
    while i < n:
        c = rtf[i]
        if c == '{':
            yield ('open', None)
            i += 1
        elif c == '}':
            yield ('close', None)
            i += 1
        elif c == '\\':
            if i + 1 >= n:
                i += 1
                continue
            nc = rtf[i + 1]
            if nc == "'":                          # \'XX hex escape
                hex_str = rtf[i+2:i+4]
                yield ('hex', hex_str)
                i += 4
            elif nc == '\n':                       # line continuation
                i += 2
            elif nc == '\\' or nc == '{' or nc == '}':
                yield ('text', nc)
                i += 2
            elif nc == '-':                        # optional hyphen
                i += 2
            elif nc == '*':                        # \* destination
                yield ('ctrl', ('*', None))
                i += 2
            elif nc.isalpha():
                m = re.match(r'\\([a-zA-Z]+)(-?\d+)?[ ]?', rtf[i:])
                if m:
                    word = m.group(1)
                    param = int(m.group(2)) if m.group(2) else None
                    yield ('ctrl', (word, param))
                    i += len(m.group(0))
                else:
                    i += 2
            else:
                i += 2
        elif c in '\r\n':
            yield ('newline', None)
            i += 1
        else:
            # Collect run of plain text
            j = i
            while j < n and rtf[j] not in '\\\r\n{}':
                j += 1
            yield ('text', rtf[i:j])
            i = j


# ── State machine ─────────────────────────────────────────────────────────────

def extract_runs(rtf: str):
    """
    Walk tokens, track formatting state, yield (char, cf, bold, ul) runs.
    Also yields ('PARA',) at each \\pard boundary.
    """
    state = {'cf': 2, 'bold': False, 'ul': False, 'skip': False, 'uc': 1}
    stack = []
    skip_depth = 0   # for \* destinations we want to ignore

    for kind, val in tokenise(rtf):
        if kind == 'open':
            stack.append(dict(state))
        elif kind == 'close':
            if stack:
                state = stack.pop()
        elif kind == 'newline':
            pass
        elif kind == 'ctrl':
            word, param = val
            if word == '*':
                state['skip'] = True
            elif word == 'pard':
                if not state['skip']:
                    yield ('PARA',)
                state['bold'] = False
                state['ul'] = False
            elif word == 'cf':
                state['cf'] = param if param is not None else 0
            elif word == 'b':
                state['bold'] = (param != 0) if param is not None else True
            elif word == 'b0':
                state['bold'] = False
            elif word == 'ul':
                state['ul'] = True
            elif word == 'ulnone':
                state['ul'] = False
            elif word == 'uc':
                state['uc'] = param if param is not None else 1
            elif word == 'u':
                if not state['skip']:
                    code = param if param is not None else 0
                    if code < 0:
                        code += 65536
                    yield (chr(code), state['cf'], state['bold'], state['ul'])
        elif kind == 'hex':
            if not state['skip']:
                try:
                    ch = bytes.fromhex(val).decode('cp1252')
                    yield (ch, state['cf'], state['bold'], state['ul'])
                except Exception:
                    pass
        elif kind == 'text':
            if not state['skip']:
                for ch in val:
                    yield (ch, state['cf'], state['bold'], state['ul'])


# ── Paragraph builder ─────────────────────────────────────────────────────────

def build_paragraphs(rtf: str):
    """
    Group runs into paragraphs. Each paragraph is a list of (text, cf, bold, ul) spans
    where consecutive runs with identical (cf, bold, ul) are merged.
    Returns list of paragraphs (each paragraph = list of spans).
    """
    paragraphs = []
    current = []

    for item in extract_runs(rtf):
        if item[0] == 'PARA':
            if current:
                # Merge consecutive spans with same formatting
                merged = []
                for span in current:
                    text, cf, bold, ul = span
                    if merged and merged[-1][1] == cf and merged[-1][2] == bold and merged[-1][3] == ul:
                        merged[-1] = (merged[-1][0] + text, cf, bold, ul)
                    else:
                        merged.append(list(span))
                paragraphs.append(merged)
            current = []
        else:
            ch, cf, bold, ul = item
            current.append((ch, cf, bold, ul))

    if current:
        merged = []
        for span in current:
            text, cf, bold, ul = span
            if merged and merged[-1][1] == cf and merged[-1][2] == bold and merged[-1][3] == ul:
                merged[-1] = (merged[-1][0] + text, cf, bold, ul)
            else:
                merged.append(list(span))
        paragraphs.append(merged)

    return paragraphs


# ── HTML generation ───────────────────────────────────────────────────────────

PRATIKA_STYLE = 'font-weight:700;color:#B54510;text-decoration:underline;'


def spans_to_html(spans, script='devanagari') -> str:
    """Convert a list of spans to inner HTML for a paragraph."""
    parts = []
    for span in spans:
        text, cf, bold, ul = span
        # U+2028 LINE SEPARATOR → verse line break; handle before stripping
        has_line_sep = ' ' in text
        text = text.replace(' ', '\n')
        text = text.replace('\xa0', ' ').strip()
        if not text and not has_line_sep:
            continue

        # Transliterate if IAST mode
        if script == 'iast':
            text = dev_to_iast(text)

        # Convert internal newlines (from line separator) to <br>
        segments = text.split('\n')
        segments = [escape(s.strip()) for s in segments if s.strip()]
        text = '<br>'.join(segments) if len(segments) > 1 else (escape(text) if segments else '')

        if not text:
            continue

        role = cf_role(cf)
        if role == 'skip':
            continue
        if role == 'pratika':
            parts.append(f'<span style="{PRATIKA_STYLE}">{text}</span>')
        else:
            parts.append(text)

    return ' '.join(parts).strip()


_VERSE_REF_RE = re.compile(r'^\s*(\d+-\d+-\d+)\s*$')
_LATIN_ONLY_RE = re.compile(r'^[A-Za-z0-9\s\-_\(\)\[\].,;:\'\"]+$')


def classify_para(spans) -> str:
    """Return 'mulam', 'bhashyam', 'vartika', 'ref', 'skip', or 'empty'."""
    text_spans = [(t, cf, b, ul) for (t, cf, b, ul) in spans if t.strip()]
    if not text_spans:
        return 'empty'

    full_text = ''.join(t for (t, *_) in text_spans).strip()

    # Skip Latin-only label paragraphs (e.g. "Verses from vartika")
    if _LATIN_ONLY_RE.match(full_text) and not re.search(r'\d-\d-\d', full_text):
        return 'skip'

    # Section reference markers like "2-4-2", "2-4-5"
    if _VERSE_REF_RE.match(full_text):
        return 'ref'

    # Editorial English annotations (e.g. "What does ātmā mean?") are
    # Latin-dominant even when they embed a Devanagari term — skip them.
    if len(re.findall(r'[A-Za-z]', full_text)) > len(re.findall(r'[ऀ-ॿ]', full_text)):
        return 'skip'

    # Consider only Devanagari-bearing spans whose colour is not 'skip'
    sig = [(t, cf, b, ul) for (t, cf, b, ul) in text_spans
           if re.search(r'[ऀ-ॿ]', t) and cf_role(cf) != 'skip']
    if not sig:
        return 'skip'

    # Section-divider headings (e.g. "२.४. सम्बन्ध भष्यम्") are fully underlined
    # Devanagari with no daṇḍa — real mūla/bhāṣya text-runs are not underlined.
    if all(ul for (t, cf, b, ul) in sig) and not re.search(r'[।॥]', full_text):
        return 'skip'

    roles = [cf_role(cf) for (t, cf, b, ul) in sig]
    if 'vartika' in roles:
        return 'vartika'
    if 'pratika' in roles:
        return 'bhashyam'   # commentary containing glossed mantra-words
    # No pratika spans: a bold mantra block is mūlam, else plain bhāṣyam
    if any(b for (t, cf, b, ul) in sig):
        return 'mulam'
    return 'bhashyam'


def ref_to_display(raw: str, script: str) -> str:
    """Convert "2-4-2" to a formatted reference label."""
    parts = raw.strip().split('-')
    if script == 'iast':
        return f'Bṛhad. {".".join(parts)}'
    # Devanagari digits
    dev_digits = {'0': '०', '1': '१', '2': '२', '3': '३', '4': '४',
                  '5': '५', '6': '६', '7': '७', '8': '८', '9': '९'}
    def to_dev(s):
        return ''.join(dev_digits.get(c, c) for c in s)
    return f'बृहद् {" । ".join(to_dev(p) for p in parts)}'


# A verse number sits between two dandas: devanagari/latin digits, optionally
# prefixed "BV" and containing dots/dashes/spaces, e.g. ।। ४७ ।। , ।। BV 2.4.1 ।।
# , ।। 2-4-७१ ।।
_VERSE_NUM_PAT = re.compile(r'(।।\s*(?:BV\s*)?[०-९\d][०-९\d.\- ]*\s*।।)')


def split_cf7_verses(text: str) -> list:
    """
    A cf7 paragraph packs many Vārtika śloka-s into one block.
    Each śloka is: pūrvārdha ।। <LINE_SEP> uttarārdha ।। N ।।
    Some śloka-s are single-line (ekārdha) with no LINE_SEP before them.
    Returns a list of strings, each = "pūrvārdha\nuttarārdha ।। N ।।"
    or just "single-line ।। N ।।" for ekārdha verses.
    """
    LINE_SEP = chr(8232)
    segs = [s.strip() for s in text.split(LINE_SEP) if s.strip()]
    if not segs:
        return []

    verses = []
    purva = segs[0]

    def drain_verse_nums(fragment, accumulated_purva):
        """Extract all complete verses from fragment, return leftover purva."""
        remaining = fragment
        while True:
            m = _VERSE_NUM_PAT.search(remaining)
            if not m:
                break
            verse_content = remaining[:m.end()].strip()
            if accumulated_purva:
                verses.append(accumulated_purva + '\n' + verse_content)
                accumulated_purva = ''
            else:
                verses.append(verse_content)
            remaining = remaining[m.end():].strip()
        return remaining, accumulated_purva

    for seg in segs[1:]:
        remaining, purva = drain_verse_nums(seg, purva)
        if remaining:
            purva = (purva + '\n' + remaining).strip() if purva else remaining

    # Handle any leftover purva
    if purva.strip():
        remaining, _ = drain_verse_nums(purva, '')
        if remaining:
            verses.append(remaining)

    return verses


def build_html(paragraphs, script='devanagari') -> str:
    lines = ['<div class="source-text-structured">']

    prev_kind = None

    for spans in paragraphs:
        kind = classify_para(spans)
        if kind in ('empty', 'skip'):
            continue

        if kind == 'ref':
            raw = ''.join(t for (t, *_) in spans).strip()
            label = ref_to_display(raw, script)
            lines.append(f'  <p class="source-ref-line">{escape(label)}</p>')
            prev_kind = kind
            continue

        # Vārtika paragraphs may pack many verses into one block — split them.
        # (split_cf7_verses handles single-verse blocks correctly too.)
        if kind == 'vartika':
            raw_text = ''.join(s[0] for s in spans)
            verse_strs = split_cf7_verses(raw_text)
            if not verse_strs:
                continue

            if prev_kind != 'vartika':
                lines.append('  <p class="src-label vartika-label">॥ वार्तिकम् ॥</p>' if script == 'devanagari'
                              else '  <p class="src-label vartika-label">॥ Vārtikam ॥</p>')

            for verse in verse_strs:
                halves = [h.strip() for h in verse.split('\n') if h.strip()]
                if script == 'iast':
                    halves = [dev_to_iast(h) for h in halves]
                halves_html = '<br>'.join(escape(h) for h in halves)
                lines.append(f'  <p class="src-vartika">{halves_html}</p>')

            prev_kind = 'vartika'
            continue

        inner = spans_to_html(spans, script=script)
        if not inner.strip():
            continue

        # Add section label when entering a new section type
        if kind == 'mulam' and prev_kind != 'mulam':
            lines.append('  <p class="src-label mulam-label">॥ मूलम् ॥</p>' if script == 'devanagari'
                          else '  <p class="src-label mulam-label">॥ Mūlam ॥</p>')
        elif kind == 'vartika' and prev_kind != 'vartika':
            lines.append('  <p class="src-label vartika-label">॥ वार्तिकम् ॥</p>' if script == 'devanagari'
                          else '  <p class="src-label vartika-label">॥ Vārtikam ॥</p>')
        elif kind == 'bhashyam' and prev_kind is None:
            lines.append('  <p class="src-label bhashyam-label">॥ भाष्यम् ॥</p>' if script == 'devanagari'
                          else '  <p class="src-label bhashyam-label">॥ Bhāṣyam ॥</p>')

        if kind == 'mulam':
            lines.append(f'  <p class="src-mulam">{inner}</p>')
        elif kind == 'vartika':
            lines.append(f'  <p class="src-vartika">{inner}</p>')
        else:
            lines.append(f'  <p class="src-bhashyam">{inner}</p>')

        prev_kind = kind

    lines.append('</div>')
    return '\n'.join(lines)


# ── IAST transliteration ──────────────────────────────────────────────────────

# Characters that should pass through unchanged (Latin punctuation, digits, etc.)
_DEV_RE = re.compile(r'[ऀ-ॿ᳐-᳿꣠-ꣿ]+')


def dev_to_iast(text: str) -> str:
    """Transliterate only Devanagari substrings; leave Latin text unchanged."""
    def _xlate(m):
        try:
            return transliterate(m.group(0), sanscript.DEVANAGARI, sanscript.IAST)
        except Exception:
            return m.group(0)
    return _DEV_RE.sub(_xlate, text)


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    rtf_path = glob.glob('scripts/*.rtf')[0]
    print(f"Reading: {rtf_path}")

    with open(rtf_path, 'rb') as f:
        raw = f.read().decode('latin-1')

    # Resolve colour indices from this file's own colour table
    load_colortbl(raw)
    print("Colour table:", {cf: CF_HEX[cf] + '→' + cf_role(cf) for cf in sorted(CF_HEX)})

    # Find body (skip header, colour table, font table)
    body_start = raw.find('\\pard')
    rtf_body = raw[body_start:]

    paragraphs = build_paragraphs(rtf_body)
    print(f"Extracted {len(paragraphs)} paragraphs")

    # Show paragraph classification
    for i, p in enumerate(paragraphs):
        kind = classify_para(p)
        sample = ''.join(t for (t, *_) in p)[:40].replace('\n', ' ')
        print(f"  [{i:2d}] {kind:10s}  {sample!r}")

    # Generate HTML
    dev_html = build_html(paragraphs, script='devanagari')
    iast_html = build_html(paragraphs, script='iast')

    # Write to files for inspection
    with open('scripts/dev_panel.html', 'w', encoding='utf-8') as f:
        f.write(dev_html)
    with open('scripts/iast_panel.html', 'w', encoding='utf-8') as f:
        f.write(iast_html)

    print(f"\nWrote scripts/dev_panel.html ({dev_html.count('<p ')} paragraphs)")
    print(f"Wrote scripts/iast_panel.html ({iast_html.count('<p ')} paragraphs)")


if __name__ == '__main__':
    main()

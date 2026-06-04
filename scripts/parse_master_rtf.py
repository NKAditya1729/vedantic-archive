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

        if cf == 6 or ul:   # Pratika
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

    cfs = [cf for (_, cf, _, _) in text_spans]
    bolds = [b for (_, _, b, _) in text_spans]

    if 5 in cfs:
        return 'vartika'
    if 6 in cfs:
        return 'bhashyam'   # bhashyam with inline pratika spans
    if any(bolds):
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

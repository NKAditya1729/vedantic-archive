#!/usr/bin/env python3
"""
build_system_a.py — rebuild the Complete Source Text page (System A) by pasting
the master RTF VERBATIM (see CLAUDE.md §5A). Run from the repo root after Aditya
updates the master RTF:
    python3 scripts/build_system_a.py            # Maitreyī Brāhmaṇa (2.4) -> src/pages/source-text.astro
    python3 scripts/build_system_a.py madhu      # Madhu Brāhmaṇa (2.5)    -> src/pages/source-text/madhu.astro

Method: `textutil -convert html` on the master RTF preserves the EXACT colours,
bold (<b>), links (<a>), and verse line structure (each pāda its own <p>, a blank
<p><br></p> spacer between verses). We flatten its <style> classes to inline
styles, turn full-width <p> highlights into inline text-hugging spans (and strip
the highlight from blank spacers), then write both panels into source-text.astro.
Dev panel = as-is; IAST panel = transliterate Devanagari only. Remember to bump
`const coveredThrough = N` afterwards.
"""
import re, subprocess, os, sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAITREYI_MASTER = "/Users/aditya_nistala/Downloads/Brhad_Upa_Class_Notes/Class Coverage Notes/मैत्रेयी ब्राह्मणाम् - भाष्यम् ‍+ वार्तिक Notes.rtf"
MASTERS = {
    'maitreyi': dict(rtf=MAITREYI_MASTER, page='src/pages/source-text.astro', heading_fixes={}),
    'madhu': dict(
        rtf=MAITREYI_MASTER.replace('मैत्रेयी', 'मधु'),
        page='src/pages/source-text/madhu.astro',
        # Rendering correction Aditya approved on 2026-09-26 (the RTF itself is unchanged):
        # the Madhu saṃbandha-bhāṣya heading was carried over from the Maitreyī master.
        heading_fixes={'२.४. सम्बन्ध भष्यम्': '२.५. सम्बन्धभाष्यम्'},
    ),
}
CONF = MASTERS[sys.argv[1] if len(sys.argv) > 1 else 'maitreyi']
MASTER = CONF['rtf']

html = subprocess.run(['textutil', '-convert', 'html', '-stdout', MASTER],
                      capture_output=True, text=True).stdout

# 1. parse <style> -> class -> inline style string
styles = {}
for m in re.finditer(r'(p\.p\d+|span\.s\d+)\s*\{([^}]*)\}', html):
    sel = m.group(1).split('.')[1]
    props = {}
    for pm in re.finditer(r'([a-z-]+)\s*:\s*([^;]+)', m.group(2)):
        props[pm.group(1).strip()] = pm.group(2).strip()
    out = []
    if props.get('margin') is not None:
        out.append('margin:' + props['margin'])
    if props.get('color'):
        out.append('color:' + props['color'])
    # textutil emits the highlight as `#hex` then a washed-out rgba(...,0.25); keep the real hex
    bgs = re.findall(r'background-color:\s*(#[0-9a-fA-F]{6}|rgba\([^)]*\))', m.group(2))
    bg = next((v for v in bgs if 'ffffff' not in v.lower()), '')
    if bg:
        out.append('background-color:' + bg)
    if props.get('font'):
        fz = re.search(r'(\d+(?:\.\d+)?)px', props['font'])
        if fz:
            out.append('font-size:' + fz.group(1) + 'px')
    if props.get('font-size'):
        out.append('font-size:' + props['font-size'])
    if props.get('text-decoration'):
        out.append('text-decoration:' + re.sub(r'\s+', ' ', props['text-decoration']).strip())
    styles[sel] = '; '.join(out)

# 2. body inner -> replace class refs with inline styles
body = html[html.find('<body>') + 6: html.find('</body>')]
body = re.sub(r'<p class="(p\d+)">', lambda m: f'<p style="{styles.get(m.group(1), "")}">', body)
body = re.sub(r'<span class="(s\d+)">', lambda m: f'<span style="{styles.get(m.group(1), "")}">', body)
body = body.replace('<a ', '<a style="color:inherit" ')  # let the inner citation span colour show

# 3. highlights: full-width <p> background -> inline text-hugging span; strip from blank spacers
def fix_highlights(b):
    def repl(m):
        style, content = m.group(1), m.group(2)
        bg = re.search(r'background-color:\s*([^;"]+)', style)
        if not bg:
            return m.group(0)
        style2 = re.sub(r'\s*background-color:\s*[^;"]+;?', '', style).strip().rstrip(';').strip()
        if content.strip() in ('', '<br>'):           # blank spacer -> no highlight
            return f'<p style="{style2}">{content}</p>'
        span = (f'<span style="background-color:{bg.group(1).strip()}; '
                f'-webkit-box-decoration-break:clone; box-decoration-break:clone">{content}</span>')
        return f'<p style="{style2}">{span}</p>'
    return re.sub(r'<p style="([^"]*background-color:[^"]*)">((?:(?!</p>).)*?)</p>', repl, b)

body = fix_highlights(body)

# 3b. approved heading corrections: replace the whole heading paragraph's inner runs
def fix_headings(b):
    def repl(m):
        text = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', m.group(2))).strip()
        if text in CONF['heading_fixes']:
            return f'{m.group(1)}<span style="text-decoration:underline"><b>{CONF["heading_fixes"][text]}</b></span></p>'
        return m.group(0)
    out, n = re.subn(r'(<p style="[^"]*">)((?:(?!</p>).)*?)</p>', repl, b)
    return out

before = body
body = fix_headings(body)
for old in CONF['heading_fixes']:
    assert body != before, f'heading fix not applied: {old}'

dev_body = body.strip()
iast_body = subprocess.run(['python3', f'{REPO}/scripts/transliterate_dev_to_iast.py'],
                           input=dev_body, capture_output=True, text=True).stdout.strip()

# 4. write both panels into source-text.astro
p = f'{REPO}/{CONF["page"]}'
s = open(p).read()
def replace_const(s, name, content):
    start = s.index(f'const {name} = `')
    end = s.index('`;', start + len(f'const {name} = `'))
    return s[:start] + f'const {name} = `<div class="source-raw">\n{content}\n</div>`' + s[end + 1:]
s = replace_const(s, 'iastSource', iast_body)
s = replace_const(s, 'devanagariSource', dev_body)
open(p, 'w').write(s)
print(f'System A rebuilt: {dev_body.count("<p ")} paragraphs/panel, {dev_body.count("<b>")} bold runs. '
      f'Remember to set `const coveredThrough`.')

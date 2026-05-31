# Vedāntic Study Archive — Claude Code Agent

## Project Overview
Astro static site hosted on GitHub Pages.
Repo: NKAditya1729/vedantic-archive
Live: https://nkaditya1729.github.io/vedantic-archive/
Local: ~/Documents/vedantic-archive

## Weekly Update Command
When asked to do "weekly update for Class N" or "add Class N", execute
ALL tasks in the WEEKLY UPDATE PROCEDURE below in order.
Class number N is always a plain integer (12, 13, 14...).

---

## Source Files Location
All source files are at:
~/Downloads/Brhad_Upa_Class_Notes/

### File Paths by Type (replace N with class number)
| Content | Path |
|---------|------|
| Class notes Dev (docx) | `Docs Files/Devanagari/Brhad_Upa_N_Dev.docx` |
| Class notes IAST (docx) | `Docs Files/IAST/Brhad_Upa_N_IAST.docx` |
| Class source text Dev (RTF) | `Class Coverage Notes/Devanagari/Brhad_Upa_Class_N_Dev.rtf` |
| Master source text (RTF) | `Class Coverage Notes/मैत्रेयी ब्राह्मणाम् - भाष्यम् ‍+ वार्तिक Notes.rtf` |
| Audio (m4a) | `MP3 Files/Brhad_Upa_Class_N_(PLAYLIST_ITEM).m4a` |

### YouTube Playlist
https://www.youtube.com/playlist?list=PLFx8rf4WVNI6Iu1Icx5k7_29L4VQ7TXmn

### Internet Archive Account
Email: nistala.aditya@gmail.com
Identifier pattern: vedantic-archive-brhad-2-4-class-NN (zero-padded)

---

## WEEKLY UPDATE PROCEDURE

### ABSOLUTE RULES
- NEVER use `git add .` — always stage files by exact path
- NEVER modify class-01 through class-10 files unless explicitly asked
- NEVER modify any file not listed in the permitted files for the task
- Permitted files for weekly update:
  1. src/content/classes/brhadaranyaka/2-4/class-NN.dev.md (NEW)
  2. src/content/classes/brhadaranyaka/2-4/class-NN.iast.md (NEW)
  3. src/content/glossary/assembled_glossary.json
  4. src/pages/source-text.astro
  5. src/pages/flashcards.astro

### COLOUR CODING (apply to all source text HTML)
- Mūlam: `<p class="src-mulam">` — black bold (#1a1a1a, font-weight:700)
- Bhāṣyam: `<p class="src-bhashyam">` — black normal (#1a1a1a)
- Pratīka: `<span style="font-weight:700;color:#B54510;text-decoration:underline;">`
- Vārtika: `<p class="src-vartika">` — violet (#5B1A8E)
- Mokṣadharma/Mahābhārata citations inside Bhāṣyam = Bhāṣyam style, NEVER Mūlam
- IAST tab: zero Devanagari (except ॥ label decorator)
- Devanagari tab: zero IAST

### STEP 1 — Get video ID and date from YouTube playlist
```bash
yt-dlp --flat-playlist \
  --print "%(playlist_index)s %(id)s %(upload_date)s %(title)s" \
  "https://www.youtube.com/playlist?list=PLFx8rf4WVNI6Iu1Icx5k7_29L4VQ7TXmn" \
  | grep -i "class N\|149\|150\|151"
```
Extract: VIDEO_ID, DATE (YYYYMMDD → YYYY-MM-DD)
Known IDs: Class 10=LQRCZfNYD8E, Class 11=mASMI_VG32E, Class 12=xEYvuxJdtt8

### STEP 2 — Find audio m4a file
```bash
ls ~/Downloads/Brhad_Upa_Class_Notes/MP3\ Files/ | grep -i "_N_\|_N("
```
Find the file matching Class N. Note exact filename.

### STEP 3 — Convert m4a to mp3
```bash
ffmpeg -y \
  -i "~/Downloads/Brhad_Upa_Class_Notes/MP3 Files/[M4A_FILENAME]" \
  -codec:a libmp3lame -qscale:a 2 \
  "~/Downloads/Brhad_Upa_Class_Notes/MP3 Files/Brhad_2-4_Class_NN.mp3"
```
NN = zero-padded class number (12 → 12, 9 → 09)

### STEP 4 — Upload to Internet Archive
```bash
ia upload vedantic-archive-brhad-2-4-class-NN \
  "~/Downloads/Brhad_Upa_Class_Notes/MP3 Files/Brhad_2-4_Class_NN.mp3" \
  --metadata="mediatype:audio" \
  --metadata="title:Bṛhadāraṇyaka Upaniṣad 2.4 — Class N (Swami Shankarananda Saraswati)" \
  --metadata="creator:Swami Shankarananda Saraswati" \
  --metadata="subject:Vedanta" \
  --metadata="subject:Advaita Vedanta" \
  --metadata="subject:Brihadaranyaka Upanishad"
```
Audio URL after upload:
`https://archive.org/download/vedantic-archive-brhad-2-4-class-NN/Brhad_2-4_Class_NN.mp3`

### STEP 5 — Extract class notes with bold from docx
Install if needed: `pip3 install python-docx --break-system-packages`
```python
from docx import Document
import os, re

def extract_with_bold(path):
    doc = Document(os.path.expanduser(path))
    lines = []
    for para in doc.paragraphs:
        line = ''
        for run in para.runs:
            if not run.text:
                continue
            if run.bold:
                line += f'**{run.text}**'
            else:
                line += run.text
        lines.append(line)
    return '\n\n'.join(l for l in lines if l.strip())

dev = extract_with_bold('~/Downloads/Brhad_Upa_Class_Notes/Docs Files/Devanagari/Brhad_Upa_N_Dev.docx')
iast = extract_with_bold('~/Downloads/Brhad_Upa_Class_Notes/Docs Files/IAST/Brhad_Upa_N_IAST.docx')
```
If docx bold is only on punctuation (not terms), apply algorithmic bolding:
bold every Sanskrit/Devanagari word in Dev body, transfer equivalents to IAST body.

### STEP 6 — Parse class source text RTF (System B)
File: `Class Coverage Notes/Devanagari/Brhad_Upa_Class_N_Dev.rtf`
Parse RTF colour table → identify Mūlam/Bhāṣyam/Pratīka/Vārtika segments.
Build HTML using colour coding rules above.
Generate IAST version by transliterating all Devanagari.
This goes into `source_text_content` frontmatter.

### STEP 7 — Generate coverage notes
Read IAST class notes. Write 4-6 semicolon-separated phrases
using Swamiji's own vocabulary describing what was taught.
Max 180 characters total.

### STEP 8 — Create class-NN.dev.md and class-NN.iast.md
Frontmatter template:
```yaml
---
series: brhadaranyaka
series_title: Bṛhadāraṇyaka Upaniṣad
adhyaya: 2
brahmana: 4
brahmana_name: Maitreyī Brāhmaṇa
class_number: N
date: "YYYY-MM-DD"
coverage: "phrase 1; phrase 2; phrase 3; phrase 4"
audio_url: "https://archive.org/download/vedantic-archive-brhad-2-4-class-NN/Brhad_2-4_Class_NN.mp3"
video_url: "https://www.youtube.com/watch?v=VIDEO_ID"
materials_url: ""
script: devanagari   # or iast for the iast file
source_text_content: |
  [HTML from Step 6]
source_ref: "बृहद् २.४.X / Bṛhad. 2.4.X"
related_verses: ""
---

[Class notes body from Step 5]
```

### STEP 9 — Update Complete Source Text page (System A)
Read master RTF: `मैत्रेयी ब्राह्मणाम् - भाष्यम् ‍+ वार्तिक Notes.rtf`
Parse its colour coding → generate Devanagari HTML and IAST HTML.
In src/pages/source-text.astro replace:
- Inner content of `id="source-devanagari"` panel with Devanagari HTML
- Inner content of `id="source-iast"` panel with IAST HTML
- Update "covered through Class X" note to current class

### STEP 10 — Add flashcard entries
Read assembled_glossary.json. Check existing iast values.
Read class notes, identify terms Swamiji explicitly explained.
Add new class object (classNumber: N, 5-15 terms) to end of array.
Each term needs: deva, iast, definition, context, source, source_iast,
breakdown_deva, breakdown_iast, phrasal, search_deva, search_iast.

### STEP 11 — Build and push
```bash
cd ~/Documents/vedantic-archive
npm run build 2>&1 | tail -15
# Must pass before committing

git add src/content/classes/brhadaranyaka/2-4/class-NN.dev.md
git add src/content/classes/brhadaranyaka/2-4/class-NN.iast.md
git add src/content/glossary/assembled_glossary.json
git add src/pages/source-text.astro
git add src/pages/flashcards.astro

git status --short
# Verify ONLY these 5 files are staged. Unstage anything else.

git commit -m "Add Class N — [first coverage phrase]; update source text, flashcards"
git push
# If rejected: git pull --rebase, then git push
# For rebase conflicts in non-permitted files: git checkout --theirs [file]
```

### STEP 12 — Verify live pages
After ~3 minutes check:
- https://nkaditya1729.github.io/vedantic-archive/brhadaranyaka/2-4/class-NN/
- https://nkaditya1729.github.io/vedantic-archive/source-text/
- https://nkaditya1729.github.io/vedantic-archive/flashcards/
- https://nkaditya1729.github.io/vedantic-archive/brhadaranyaka/

---

## Known Class Information
| Class | Recording | Video ID | Date |
|-------|-----------|----------|------|
| 10 | 148 | LQRCZfNYD8E | 2026-05-21 |
| 11 | 149 | mASMI_VG32E | 2026-05-25 |
| 12 | 150 | xEYvuxJdtt8 | 2026-05-28 |

## Architecture Summary
- SYSTEM A: Complete Source Text page ← master RTF (updated weekly by Aditya)
- SYSTEM B: Class-specific source text ← individual class RTF per class
- Class notes body ← docx files (preserves bold formatting)
- Audio ← Internet Archive (not GitHub)
- Flashcards ← assembled_glossary.json (JSON array, one object per class)

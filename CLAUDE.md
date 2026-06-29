# CLAUDE.md — Weekly Class Update Agent
### Repo: NKAditya1729/vedantic-archive · Local: **~/Documents/vedantic-archive**
### Site: https://nkaditya1729.github.io/vedantic-archive/

You are the standing agent that publishes a new class to the Vedāntic Study
Archive. Aditya prepares files **in Devanagari only** in his local source
folders; you pick them up and do everything needed to put the class live,
**including generating every IAST version yourself**.

Invoked with: **`Weekly update for Class N`** (N = human class number, e.g. 21).

> ⚠️ **Work in `~/Documents/vedantic-archive`** — it is the canonical clone (synced
> to origin/main). A second stale clone may exist at `/Users/aditya_nistala/vedantic-archive`;
> do NOT use it. `cd ~/Documents/vedantic-archive` first.

---

## STATUS (keep this current)

- **Series:** Bṛhadāraṇyaka Upaniṣad 2.4 (Maitreyī Brāhmaṇa), with Śāṅkara Bhāṣya,
  Sureśvara's Vārtika, and Vidyāraṇya's **Vārtikasāra**.
- **Classes published: 1 – 20.** Next is Class 21.
- **Mantras covered: 6** (through Bṛhad. 2.4.6). The homepage "Mantras covered"
  stat = max mantra number in any class `source_ref` (`src/pages/index.astro`).
- Source text currently runs: Mūlam 2.4.1–2.4.6 + Bhāṣyam + Vārtika (to v218) +
  Vārtikasāra (to v90). `const coveredThrough = 20` in source-text.astro.
- Recent classes (15–20) were all Vārtikasāra-heavy; Class 20 began the 2.4.6 bhāṣyam.

---

## 0. GOLDEN RULES — violating any is a failed run

1. **Source text & body are sacrosanct — paste, do NOT reinterpret.** Not one
   word added/removed/reordered/"cleaned up". For the Complete Source Text you
   take the master RTF **exactly as textutil renders it** (colours, bold, verse
   line breaks, spacing) — never re-decide a colour or re-format a verse. The
   moment you feel like "improving" structure or colour, STOP — that is the bug.
2. **Transliteration is mechanical only.** Always route Devanagari → IAST through
   `scripts/transliterate_dev_to_iast.py`. Never type IAST by hand. Roman/English
   stays Roman in BOTH tabs; only Devanagari converts in the IAST tab.
3. **Never `git add .`** Stage every file by exact path.
4. **Verify before publish.** `npm run build` must exit 0 and you must spot-check
   the output before any commit.
5. **Checkpoint before git ops.** `git status`; if anything unexpected is dirty,
   stop and report.
6. **Devanagari tab = zero IAST; IAST tab = zero Devanagari** (the only Devanagari
   left in IAST is the `॥` verse/label decorator that the transliterate script
   keeps — do NOT also convert it to `||` on System A; that is a "modification").
7. **When a source detail is genuinely ambiguous, flag it and stop. Never invent.**

---

## 1. SOURCE FOLDERS (Aditya's Mac — read-only inputs)

```
MAIN = /Users/aditya_nistala/Downloads/Brhad_Upa_Class_Notes

# Master / Complete Source Text (System A) — Devanagari, colour-coded RTF:
COMPLETE_SRC = $MAIN/Class Coverage Notes/मैत्रेयी ब्राह्मणाम् - भाष्यम् ‍+ वार्तिक Notes.rtf

# Per-class Source Text (System B) — Devanagari, colour-coded RTF:
CLASS_SRC    = $MAIN/Class Coverage Notes/Devanagari/Brhad_Upa_Class_{N}_Dev.rtf

# Class lecture notes (Devanagari + English) — RTF:
CLASS_NOTES  = $MAIN/RTF Files/Devanagari/Brhad_Upa_{N}_Dev.rtf   (NOTE: no "Class" in name)

# Audio (Aditya converts m4a→mp3 and places it here):
AUDIO_MP3    = $MAIN/Audio Files/MP3 Files/Brhad_2-4_Class_{N}.mp3
AUDIO_M4A    = $MAIN/Audio Files/M4A Files/   (raw m4a, if conversion needed)

# Flashcards — Devanagari terms, one per line:
FLASHCARDS   = $MAIN/Flashcards/Brhad_Upa_Class_{N}.rtf

YT_PLAYLIST  = https://www.youtube.com/playlist?list=PLFx8rf4WVNI6Iu1Icx5k7_29L4VQ7TXmn
```
> Filename digits: source files use `N` (no leading zero); the repo uses zero-padded `NN`.

---

## 2. REPO TARGETS (what you write)

```
src/content/classes/brhadaranyaka/2-4/class-{NN}.dev.md   # Devanagari class page
src/content/classes/brhadaranyaka/2-4/class-{NN}.iast.md  # IAST class page (you generate)
src/pages/source-text.astro                               # System A — both panels (you replace)
src/content/glossary/assembled_glossary.json              # flashcards data (you append)
src/styles/components.css                                 # ONLY when a class adds a new colour/style
```
Helper scripts (already in repo — use, don't recreate):
`scripts/transliterate_dev_to_iast.py` (Dev→IAST), `scripts/build_system_a.py`
(the verbatim System-A paste, see §5A).

---

## 3. DERIVE IDENTIFIERS (do first, print, stop if any look wrong)

- `NN = printf "%02d" N`
- **Recording / playlist number `REC = N + 138`.** Known: 10→148 … 15→153, 16→154,
  17→155, 18→156, 19→157, 20→158.
- **Internet Archive id:** `vedantic-archive-brhad-2-4-class-{NN}`
- **Audio URL:** `https://archive.org/download/vedantic-archive-brhad-2-4-class-{NN}/Brhad_2-4_Class_{NN}.mp3`
- **YouTube id + date:** flat-playlist `upload_date` is often `NA`, so fetch per-video:
  pick the playlist row with `playlist_index == REC` to get the id, then
  ```
  yt-dlp --no-warnings --print "%(upload_date)s" "https://www.youtube.com/watch?v={id}"
  ```
  **`date` = that YouTube upload_date** (`YYYY-MM-DD`) — NOT the lecture date embedded
  in the title. `video_url = https://www.youtube.com/watch?v={id}`.

---

## 4. FIRST-RUN SETUP (idempotent)
```
pip3 install indic-transliteration       # transliteration engine
# macOS `textutil` and `ffmpeg`, `ia` (internetarchive), `yt-dlp` are already installed.
```

---

## 5. PIPELINE — execute in order, printing a one-line confirmation per step

### Step A — Complete Source Text page (System A) = VERBATIM master paste
**This is a faithful paste, not a reinterpretation.** The master RTF has no `\par`,
mixed Mac/Win encoding, hyperlinks, and inline citations — `textutil -convert html`
handles all of that and preserves the EXACT colours, bold, verse line structure
(each pāda its own `<p>`, blank `<p><br></p>` spacers between verses).
Run **`python3 scripts/build_system_a.py`**, which:
1. `textutil -convert html` on the master RTF.
2. Flattens its `<style>` classes (`p.pN`/`span.sN`) to INLINE styles on each element —
   keeps **margin, color, background-color, font-size, text-decoration**, and the `<b>`
   bold + `<a>` links. Drops font-family. (This is why mantra bold, ṭīkā small font,
   and exact colours all survive untouched.)
3. **Highlights** (`background-color`): textutil makes them full-width `<p>` backgrounds
   and even tints the blank spacer below. Convert each to an inline span hugging ONLY
   the verse text (`box-decoration-break:clone`), and STRIP the highlight from blank
   spacer paragraphs.
4. Dev panel = the HTML as-is; **IAST panel = pipe the whole thing through
   `transliterate_dev_to_iast.py`** (only Devanagari converts; Roman/tags/URLs/`॥` stay).
5. Replaces both `const iastSource = \`…\`` and `const devanagariSource = \`…\`` template
   literals in source-text.astro (content wrapped in `<div class="source-raw">`).
Then **bump `const coveredThrough = N`**. The page is **light-mode only** (see §6).
> If Aditya re-saves the master (new bold, highlights, colours, verses), just re-run
> the script — it's a one-command refresh.

### Step B — Per-class Source Text (System B → frontmatter)
From `CLASS_SRC` build the colour-coded `source_text_content` HTML for the class page,
using the **CSS classes** in §6 (e.g. `<p class="src-vartika-sara">pada1 ॥<br>pada2 ॥ N ॥</p>`).
Devanagari → `class-{NN}.dev.md`; transliterate → `class-{NN}.iast.md` (convert verse
`॥`/`।।` → `||` on verse `<p>` lines for the IAST class page; keep section labels' `॥`).
Verse highlights here use inline `<span class="hl-blue|hl-yellow|hl-cyan">…</span>`.
(System B uses CSS classes; System A uses inline styles from the verbatim paste — different on purpose.)

### Step C — Audio → Internet Archive
mp3 is at `AUDIO_MP3` (convert from m4a with `ffmpeg -i in.m4a -codec:a libmp3lame -qscale:a 2 out.mp3` only if missing).
`cd` into the folder and pass the **bare filename** (a `cd` to a space-containing path in a
backgrounded shell can silently fail → `ia` errors "not a valid file"). Run with
`nohup ia upload vedantic-archive-brhad-2-4-class-{NN} Brhad_2-4_Class_{NN}.mp3 --metadata=… &`
and CONFIRM a progress bar appears within ~25s; if 0% / no connection after minutes it is
hung → `pkill -f "ia upload"` and retry. URL 404/503s until ingest finishes (large files
can take a while); it then resolves 200. Content push does NOT depend on the audio (URL is
deterministic) — safe to push first and let the upload finish.
(IA config `~/.config/internetarchive/ia.ini`, acct nistala.aditya@gmail.com. Metadata:
mediatype:audio, title "Bṛhadāraṇyaka Upaniṣad 2.4 — Class N (Swami Shankarananda Saraswati)",
creator, subjects Vedanta / Advaita Vedanta / Brihadaranyaka Upanishad.)

### Step D — Class notes body → Devanagari .md
1. `textutil -convert txt` on `CLASS_NOTES` (plain text recovers the paragraph structure
   the RTF's cocoa runs hold; the RTF often has almost no `\par`).
2. **Algorithmic bold**: in every paragraph that MIXES English + Devanagari, wrap each
   Devanagari run in `**…**`; leave paragraphs with NO Latin (the opening maṅgala, standalone
   verses, the closing śānti) plain. Merge the leading/trailing pure-Devanagari runs into a
   single invocation / closing paragraph.
3. Replace the first paragraph (invocation) and last paragraph (closing pūrṇam) with the
   **verbatim blocks from the PREVIOUS class's `class-(N-1).dev.md`** (identical every class).
4. Write frontmatter (§7) → `class-{NN}.dev.md`.

### Step E — Class notes body → IAST .md
Pipe the finished Dev body through `transliterate_dev_to_iast.py`; swap invocation/closing
for the verbatim IAST blocks from `class-(N-1).iast.md`. Write the `coverage` line (Dev on
.dev.md, its transliteration on .iast.md — a short descriptive paragraph in Swamiji's
vocabulary; this is the only judgement allowed, and it's metadata). Write `class-{NN}.iast.md`.

### Step F — Flashcards → assembled_glossary.json
Terms (Devanagari, one per line) come from `FLASHCARDS`. For each, author
definition/context/breakdown_deva/phrasal/source; derive iast/breakdown_iast/source_iast
via the script; build `search_iast` by NFKD-folding diacritics to plain ASCII. Append a
`classNumber: N` object (§8) by **surgical insert before the final `]`** (file is 2-space
indent, no trailing newline) — never rewrite existing entries.

### Step G — Build, verify, commit, push
1. `npm run build` — must exit 0; check Dev page has zero IAST, IAST page has zero stray
   Devanagari (only `॥`), colours render, "Mantras covered" correct.
2. Stage by exact path: the two class `.md`, `source-text.astro`, `assembled_glossary.json`,
   **and `src/styles/components.css` if a new colour/style was added.**
3. `git commit` (end body with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`), `git push`.
4. Report live URLs. Audio URL 404s briefly then resolves.

---

## 6. COLOUR SCHEME (current — derived from Aditya's RTFs)

| Element | Colour | Rendering |
|---|---|---|
| **Mūlam (Upaniṣad mantra)** | black `#000000`/`#1a1a1a` | **BOLD** (`<b>` in master; `src-mulam` in System B) |
| Bhāṣyam (Śaṅkara) | `#1a1a1a` | normal — `src-bhashyam` |
| Bhāṣyam **question** | red `#e60006` | `src-bhashyam-q` |
| Bhāṣyam **answer** | green `#16a53f` | `src-bhashyam-a` |
| Pratīka (mantra words in bhāṣyam) | orange `#b54510`/`#af4504` | bold + underline — `src-pratika` |
| Vārtika (Sureśvara) | violet `#80017f`/`#7f0080`/`#5b1a8e` | `src-vartika` |
| Vārtika **ṭīkā** | gray `#808080`/`#4c4c4c` | small — `src-vartika-tika` |
| **Vārtikasāra (Vidyāraṇya)** | **green `#0c5a53`** (old `#0d6002` maps to it) | `src-vartika-sara` |
| Vārtikasāra **ṭīkā** | light blue `#48b3ff` | small — `src-vartika-sara-tika` |
| Blue note / scriptural citation | `#0000ff` | `src-note-blue` |
| Verse highlights | yellow `#f9ff29`/`#efff92`/`#f6ff99`, cyan `#c4fff8`, blue `#118dff` | **inline span hugging the verse text only** (`hl-yellow`/`hl-cyan`/`hl-blue`; never a full-width `<p>` background) |

- **System A** (Complete Source Text page) renders these via **inline styles from the
  verbatim textutil paste** — exact RTF hex, do not reinterpret.
- **System B** (per-class `source_text_content`) renders via the **CSS classes** above
  (defined in `src/styles/components.css`, each with a `[data-theme="dark"] … !important` override).
- **Highlights must hug the text** (inline span), never fill the line, and must not tint the
  blank spacer lines between verses.

### Forced light mode (Complete Source Text page only)
Dark mode made the coloured text unreadable, so **source-text.astro passes `forceLight={true}`
to BaseLayout**. BaseLayout (prop `forceLight`) then omits the dark-theme `<head>` script,
removes any `data-theme`, sets `<html class="force-light">`, and `html.force-light .theme-toggle
{display:none}` hides the toggle. **Every OTHER page keeps the normal light/dark toggle** (class
pages' source-text float already forces a white background in dark mode).

---

## 7. CLASS FILE FRONTMATTER
```yaml
---
series: brhadaranyaka
series_title: Bṛhadāraṇyaka Upaniṣad
adhyaya: 2
brahmana: 4
brahmana_name: Maitreyī Brāhmaṇa
class_number: {N}
date: "{YYYY-MM-DD = YouTube upload_date}"
coverage: "Dev descriptive paragraph (transliterated on the .iast.md)"
audio_url: "https://archive.org/download/vedantic-archive-brhad-2-4-class-{NN}/Brhad_2-4_Class_{NN}.mp3"
video_url: "https://www.youtube.com/watch?v={VIDEO_ID}"
materials_url: ""
script: devanagari            # iast on the .iast.md file
source_text_content: |
  <div class="source-text-structured"> … colour-CLASS HTML (System B) … </div>
source_ref: "बृहद् २.४.X"      # "Bṛhad. 2.4.X" on the .iast.md (a range like 2.4.5–2.4.6 is fine)
related_verses: ""
---
[class notes body — Dev on .dev.md, mechanically transliterated IAST on .iast.md]
```

---

## 8. FLASHCARD JSON OBJECT
```json
{ "classNumber": {N}, "sectionTitle": "what the class focused on",
  "terms": [ {
    "deva": "…", "iast": "…",
    "definition": "1–2 sentences", "context": "Swamiji's explanation, 2–3 sentences",
    "source": "Vārtikasāra (VS NN): \"<u>verse</u> ॥\"  | or  Vārtika (BV NN) | Bhāṣyam (Bṛhad. 2.4.X)",
    "source_iast": "(transliterated)",
    "breakdown_deva": "word-by-word + gloss", "breakdown_iast": "(transliterated)",
    "phrasal": "short evocative phrase",
    "search_deva": "Devanagari + breakdown + definition (concat)",
    "search_iast": "IAST concat with diacritics folded to plain ASCII" } ] }
```

---

## 9. NAMING REFERENCE
| Thing | Pattern |
|---|---|
| Class notes RTF | `RTF Files/Devanagari/Brhad_Upa_{N}_Dev.rtf` |
| Per-class source RTF | `Class Coverage Notes/Devanagari/Brhad_Upa_Class_{N}_Dev.rtf` |
| Master source RTF | `Class Coverage Notes/मैत्रेयी ब्राह्मणाम् - भाष्यम् ‍+ वार्तिक Notes.rtf` |
| Flashcards RTF | `Flashcards/Brhad_Upa_Class_{N}.rtf` |
| mp3 | `Audio Files/MP3 Files/Brhad_2-4_Class_{N}.mp3` |
| Repo class file | `class-{NN}.dev.md` / `class-{NN}.iast.md` |
| IA identifier | `vedantic-archive-brhad-2-4-class-{NN}` |
| Recording number | `N + 138` |

---

## 10. KEY DECISIONS (made over Classes 15–20 — keep honouring these)
- **System A = verbatim textutil paste**, never a colour-reinterpretation (the parser
  approach caused colour-mixing and split verses). Verses keep the master's exact format
  (pāda-per-line + blank spacer). `scripts/build_system_a.py` implements this.
- **Vārtikasāra green is `#0c5a53`** site-wide (old `#0d6002` unified to it).
- **`date` = YouTube upload_date**, not the title's lecture date.
- **Highlights hug the verse text** (inline spans), never full-width; not on spacer lines.
- **Source-text page is light-mode only** (`forceLight`); all other pages keep dark mode.
- **Mūlam mantras are bold** (`<b>` preserved verbatim from the master).
- **IAST = mechanical script output only** — keep `॥`, don't add extra danda conversions on System A.
- The **master RTF holds the authoritative colours/bold/highlights**; if a desired highlight is
  missing from System A it's because it lives only in a per-class file — Aditya must add it to the master.

---

## 11. WHEN TO STOP AND ASK
- `REC = N+138` disagrees with the audio filename.
- A System A run looks structurally wrong (bhāṣyam fragmented, colours mixed) — re-check the paste.
- The class-notes RTF has a garbled/corrupt stretch.
- `npm run build` fails, or the working tree has unexpected uncommitted changes.
- Any IAST output has stray Devanagari (beyond `॥`), or any Dev output has IAST.

Report the exact file/line and the candidate readings, then wait.

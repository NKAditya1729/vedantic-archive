# CLAUDE.md — Weekly Class Update Agent
### Repo: NKAditya1729/vedantic-archive · Local: ~/Documents/vedantic-archive
### Site: https://nkaditya1729.github.io/vedantic-archive/

You are the standing agent that publishes a new class to the Vedāntic Study
Archive. Aditya prepares files **in Devanagari only** in his local source
folders; you pick them up and do everything needed to put the class live,
**including generating every IAST version yourself**.

You are invoked with a single command:

> **Weekly update for Class N**

where `N` is the human class number (e.g. 13). Everything below is keyed off `N`.

---

## 0. GOLDEN RULES — violating any of these is a failed run

1. **Class-note body text is sacrosanct.** Not one word may be added, removed,
   reordered, paraphrased, "cleaned up", or re-spelled. You only (a) copy it and
   (b) mechanically transliterate Devanagari runs to IAST. If you ever feel the
   urge to "fix" the text, STOP — that is the signal you are doing it wrong.
2. **Transliteration is mechanical, never freehand.** Always route Devanagari →
   IAST through `scripts/transliterate_dev_to_iast.py`. Never type IAST by hand
   or "translate from memory." This is the only thing that makes rule 1 true.
3. **Never `git add .`** Stage every file by its exact path. Only the files this
   run intends to change.
4. **Verify before you publish.** `npm run build` must succeed and you must
   sanity-check `localhost:4321` (or the built output) BEFORE any commit.
5. **Checkpoint before destructive or git operations.** `git status` +
   `git stash`-free working tree confirmation; if anything unexpected is dirty,
   stop and report instead of committing.
6. **Devanagari tab = zero IAST. IAST tab = zero Devanagari** (the only allowed
   exception is the `॥` decorator label, IF the existing files keep it — see §6).
7. **When a source detail is genuinely ambiguous, flag it and stop. Never invent.**
   Surface the exact file/line and ask Aditya. A blocked run is recoverable; a
   silently-wrong commit is not.

---

## 1. SOURCE FOLDERS (Aditya's Mac — read-only inputs)

```
MAIN      = /Users/aditya_nistala/Downloads/Brhad_Upa_Class_Notes

# Complete source text (System A) — master file, Devanagari, colour-coded RTF:
COMPLETE_SRC = $MAIN/Class Coverage Notes/
               → file:  मैत्रेयी ब्राह्मणाम् - भाष्यम् + वार्तिक Notes.rtf

# Per-class source text (System B) — Devanagari, colour-coded RTF:
CLASS_SRC    = $MAIN/Class Coverage Notes/Devanagari/
               → file:  Brhad_Upa_Class_{N}_Dev.rtf

# Class notes (the lecture notes) — Devanagari + English, bold Sanskrit, RTF:
CLASS_NOTES  = $MAIN/RTF Files/Devanagari/
               → file:  Brhad_Upa_{N}_Dev.rtf      (NOTE: no "Class" in name)

# Audio:
AUDIO_M4A    = $MAIN/Audio Files/M4A Files/
AUDIO_MP3    = $MAIN/Audio Files/MP3 Files/
               → file:  a Class {N} mp3 (see §3 for name patterns)

# Flashcards — Devanagari only:
FLASHCARDS   = $MAIN/Flashcards/
               → file:  Brhad_Upa_Class_{N}.rtf (or .md)

YT_PLAYLIST  = https://www.youtube.com/playlist?list=PLFx8rf4WVNI6Iu1Icx5k7_29L4VQ7TXmn
```

> File-name digit note: source files use `N` (no leading zero). The repo uses
> zero-padded `NN` (01–14). Convert explicitly; never assume.

---

## 2. REPO TARGETS (what you write)

```
src/content/classes/brhadaranyaka/2-4/
    class-{NN}.dev.md          # Devanagari class page
    class-{NN}.iast.md         # IAST class page (you generate)
src/pages/source-text.astro    # System A — both Dev + IAST panels (you update)
src/content/glossary/assembled_glossary.json   # flashcards data (you append)
```

The series listing page (`/brhadaranyaka/`) reads the `coverage` frontmatter —
you do not edit it directly.

---

## 3. DERIVE THE IDENTIFIERS (do this first, print them, stop if any look wrong)

Given `N`:

- **Zero-padded:** `NN = printf "%02d" N`
- **Recording / playlist number:** `REC = N + 138`
  - Self-check against the known table — abort if it disagrees:
    `1→139, 10→148, 11→149, 12→150, 13→151, 14→152`.
  - **Cross-check** against the audio filename: many files embed the recording
    number, e.g. `Brhad_Upa_Class_11_149.m4a`, `Brhad_2-4_Class_14_152.mp3`.
    If the embedded number ≠ `N + 138`, STOP and ask.
- **Internet Archive identifier:** `vedantic-archive-brhad-2-4-class-{NN}`
- **Audio URL:**
  `https://archive.org/download/vedantic-archive-brhad-2-4-class-{NN}/Brhad_2-4_Class_{NN}.mp3`

### YouTube video ID for Class N
```
yt-dlp --flat-playlist \
  --print "%(playlist_index)s %(id)s %(upload_date)s %(title)s" \
  "$YT_PLAYLIST"
```
Pick the row whose `playlist_index == REC`. Capture `id` (→ `video_url =
https://www.youtube.com/watch?v={id}`) and `upload_date` (→ class `date`,
formatted `YYYY-MM-DD`).
- If `playlist_index` has drifted (deletions), fall back to the title that names
  the recording number `REC`. If neither resolves cleanly, STOP and report the
  candidate rows.

---

## 4. FIRST-RUN SETUP (idempotent — do once, skip if present)

```
pip3 install indic-transliteration          # transliteration engine
# macOS `textutil` is built in — used for faithful RTF→HTML (preserves bold,
# colour, underline). No install needed.
```
Ensure `scripts/transliterate_dev_to_iast.py` exists in the repo (the helper
shipped alongside this CLAUDE.md). If missing, create it before proceeding.

---

## 5. PIPELINE — execute in this order

> After each step, print a one-line confirmation of what changed. Do not batch
> silently; this is a verify-as-you-go pipeline.

### Step A — Complete Source Text page (System A)
1. Convert the master RTF to HTML faithfully:
   `textutil -convert html "<COMPLETE_SRC master file>" -stdout`
2. Map each styled run to the **fixed** colour classes in §6 to build the
   **Devanagari** panel HTML.
3. Generate the **IAST** panel by running the *Devanagari panel HTML* through
   `scripts/transliterate_dev_to_iast.py` (tags and class names are ASCII, so
   only the Sanskrit text inside elements is converted).
4. Replace BOTH panels in `src/pages/source-text.astro`. Do not touch unrelated
   markup.

### Step B — Per-class Source Text (System B → frontmatter)
1. `textutil -convert html "$CLASS_SRC/Brhad_Upa_Class_{N}_Dev.rtf" -stdout`
2. Build the colour-coded Devanagari HTML → goes into `source_text_content` of
   **class-{NN}.dev.md**.
3. Transliterate that HTML to IAST (§3 helper) → `source_text_content` of
   **class-{NN}.iast.md**.

### Step C — Audio → Internet Archive
1. Locate the Class `N` audio in `AUDIO_MP3`. If only an `.m4a` exists, convert:
   `ffmpeg -i "<input.m4a>" -codec:a libmp3lame -qscale:a 2 "Brhad_2-4_Class_{NN}.mp3"`
2. Upload (idempotent — IA refuses duplicate identifiers):
   `ia upload vedantic-archive-brhad-2-4-class-{NN} "Brhad_2-4_Class_{NN}.mp3"`
   (IA config: `~/.config/internetarchive/ia.ini`, acct nistala.aditya@gmail.com)
3. Confirm the Audio URL (§3) resolves before using it in frontmatter.

### Step D — Class notes → Devanagari .md
1. `textutil -convert html "$CLASS_NOTES/Brhad_Upa_{N}_Dev.rtf" -stdout`
2. Convert to the project's markdown convention: **bold** Sanskrit stays
   `**...**`; English stays plain; paragraph breaks preserved.
3. Embed the canonical **opening invocation** and **closing prayer** HTML blocks
   by copying them VERBATIM from `class-12.dev.md` (do not hand-write them).
   Cut the body at the closing prayer; omit any Q&A.
4. Write the full frontmatter (§7) → **class-{NN}.dev.md**.

### Step E — Class notes → IAST .md  ← the new responsibility
1. Take the finished `class-{NN}.dev.md` body.
2. Pipe it through `scripts/transliterate_dev_to_iast.py`. Because the script
   only touches Devanagari runs, English, markdown `**`, and HTML survive
   unchanged — Sanskrit terms come out as **bold IAST**.
3. Swap the invocation/closing blocks for the verbatim IAST versions from
   `class-12.iast.md`.
4. Generate the `coverage` line (4–6 `;`-separated phrases, **IAST**) from the
   IAST body — this is the only place light judgement is allowed, and it is
   metadata, not body text.
5. Write **class-{NN}.iast.md** with matching frontmatter (`script: iast`).

### Step F — Flashcards → assembled_glossary.json
1. Read the Devanagari flashcards file for Class `N` from `FLASHCARDS`.
2. For each term build the JSON object per §8. Transliterate `deva→iast`,
   `breakdown_deva→breakdown_iast`, `search_deva→search_iast` via the helper.
   For `search_iast`, strip diacritics (ā→a, ī→i, ū→u, ṛ→r, ṃ→m, ṣ/ś→s, ṇ→n,
   ṭ/ḍ→t/d, etc.) so plain-roman search works.
3. Append a new class object (`classNumber: N`) to the array. Do not rewrite
   existing entries.

### Step G — Build, verify, commit
1. `npm run build` — must exit 0.
2. Spot-check: Dev page has zero IAST, IAST page has zero stray Devanagari,
   colour coding intact, audio + video embeds resolve, flashcards render.
3. Stage by **exact path** only:
   ```
   git add src/content/classes/brhadaranyaka/2-4/class-{NN}.dev.md
   git add src/content/classes/brhadaranyaka/2-4/class-{NN}.iast.md
   git add src/pages/source-text.astro
   git add src/content/glossary/assembled_glossary.json
   ```
4. `git commit -m "Add Class {N} (Bṛhad. 2.4) — notes, source text, audio, flashcards"`
5. `git push`
6. Report the live URLs to verify after Pages rebuilds.

---

## 6. COLOUR CODING — FIXED AND IMMUTABLE

| Text type | CSS class | Hex | Weight / decoration |
|---|---|---|---|
| Mūlam (Upaniṣad mantra) | `src-mulam` | `#1a1a1a` | bold (700) |
| Bhāṣyam (Śaṅkara) | `src-bhashyam` | `#1a1a1a` | normal (400) |
| Pratīka (mantra words in bhāṣyam) | `src-pratika` | `#B54510` | **bold (700) + underline** |
| Vārtika (Sureśvara) | `src-vartika` | `#5B1A8E` | normal (400) |

**Pratīka MUST be bold AND underlined** — the underline has been silently
dropped before; enforce both explicitly.

**Smṛti citation rule:** Mokṣadharma / Mahābhārata lines quoted *inside* the
bhāṣyam are `src-bhashyam`, **never** `src-mulam`. Map by the RTF colour, not by
the line looking like a verse.

Map `textutil`→HTML inline styles to these classes by (colour hex + bold +
underline). If a run's styling matches none of the four, STOP and report it.

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
date: "{YYYY-MM-DD from playlist}"
coverage: "phrase 1; phrase 2; phrase 3; phrase 4"   # IAST
audio_url: "https://archive.org/download/vedantic-archive-brhad-2-4-class-{NN}/Brhad_2-4_Class_{NN}.mp3"
video_url: "https://www.youtube.com/watch?v={VIDEO_ID}"
materials_url: ""
script: devanagari            # iast on the .iast.md file
source_text_content: |
  <div class="source-text-structured">
    ... colour-coded HTML (Dev on .dev.md, IAST on .iast.md) ...
  </div>
source_ref: "बृहद् २.४.X / Bṛhad. 2.4.X"   # use IAST form on .iast.md
related_verses: ""
---
[class notes body — Dev on .dev.md, mechanically transliterated IAST on .iast.md]
```

---

## 8. FLASHCARD JSON OBJECT

```json
{
  "classNumber": {N},
  "sectionTitle": "short title describing class focus",
  "terms": [
    {
      "deva": "वृत्तिस्थानीयम्",
      "iast": "vṛttisthānīyam",
      "definition": "1–2 sentence concise definition",
      "context": "Swamiji's explanation from class notes, 2–3 sentences",
      "source": "Class {N} — Maitreyī Brāhmaṇa 2.4",
      "source_iast": "Class {N} — Maitreyī Brāhmaṇa 2.4",
      "breakdown_deva": "word-by-word in Devanagari",
      "breakdown_iast": "word-by-word in IAST",
      "phrasal": "short evocative phrase",
      "search_deva": "Devanagari without punctuation",
      "search_iast": "IAST without diacritics"
    }
  ]
}
```

---

## 9. NAMING REFERENCE (recap, because the names differ per folder)

| Thing | Pattern |
|---|---|
| Class notes RTF | `RTF Files/Devanagari/Brhad_Upa_{N}_Dev.rtf` |
| Per-class source RTF | `Class Coverage Notes/Devanagari/Brhad_Upa_Class_{N}_Dev.rtf` |
| Master source RTF | `Class Coverage Notes/मैत्रेयी ब्राह्मणाम् - भाष्यम् + वार्तिक Notes.rtf` |
| Repo class file | `class-{NN}.dev.md` / `class-{NN}.iast.md` |
| IA identifier | `vedantic-archive-brhad-2-4-class-{NN}` |
| Recording number | `N + 138` |

---

## 10. WHEN TO STOP AND ASK (do not improvise past these)
- Recording number from `N+138` disagrees with the audio filename.
- A source-text run's colour matches none of the four classes.
- The class-notes RTF contains a stretch that looks garbled/corrupted.
- `npm run build` fails.
- The working tree has unexpected uncommitted changes.
- Any IAST output contains stray Devanagari, or any Dev output contains IAST.

Report the exact file, the line, and the two candidate readings. Then wait.

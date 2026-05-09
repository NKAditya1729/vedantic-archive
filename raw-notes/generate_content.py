#!/usr/bin/env python3
"""
Generate final content files for the Vedantic Study Archive.
Creates 10 files: 5 .dev.md + 5 .iast.md in the Astro content directory.
"""

import sys
import re
from pathlib import Path

# Import the transliteration module
sys.path.insert(0, str(Path(__file__).parent))
from dev_to_iast import convert_markdown_dev_to_iast

# Class metadata
CLASSES = [
    {
        'number': 1,
        'date': '2026-04-20',
        'video_url': 'https://www.youtube.com/watch?v=4VXBsHjhoqI&list=PLFx8rf4WVNI6Iu1Icx5k7_29L4VQ7TXmn',
        'coverage': "Bhāṣyakāra's introductory sambandha-bhāṣya for the Maitreyī Brāhmaṇa; review of vidyā-sūtra (ātmetyevopāsīta, 1.4.7) and avidyā-sūtra (anyo'sāvanyo'hamasmīti, 1.4.10); summary of chapters 1–3 — sṛṣṭi, nāma-rūpa-karma, neti neti; sarva-viśeṣa-śūnyam brahma established through aśeṣa-bhūta-dharma-pratiṣedha; why the 4th brāhmaṇa — to present saṁnyāsa as aṅga for brahmavidyā; Yājñavalkya seeking Maitreyī's permission to leave.",
        'coverage_dev': "भाष्यकार's introductory सम्बन्धभाष्य for the मैत्रेयीब्राह्मण; review of विद्यासूत्र (आत्मेत्येवोपासीत, 1.4.7) and अविद्यासूत्र (अन्योऽसावन्योऽहमस्मीति, 1.4.10); summary of chapters 1–3 — सृष्टि, नामरूपकर्म, नेति नेति; सर्वविशेषशून्यं ब्रह्म established through अशेषभूतधर्मप्रतिषेध; why the 4th ब्राह्मण — to present संन्यास as अङ्ग for ब्रह्मविद्या; याज्ञवल्क्य seeking मैत्रेयी's permission to leave.",
        'source_ref': 'Bṛhad. 2.4 sambandha-bhāṣya',
        'source_ref_dev': 'बृहद् २.४ सम्बन्धभाष्यम्',
    },
    {
        'number': 2,
        'date': '2026-04-23',
        'video_url': 'https://www.youtube.com/watch?v=FqglbqZ6RKQ&list=PLFx8rf4WVNI6Iu1Icx5k7_29L4VQ7TXmn',
        'coverage': "Continuation of introductory bhāṣyam; recap of vidyā-sūtra and avidyā-sūtra; discussion on saṁnyāsa — is it necessary? Gītā 18th chapter on saṁnyāsa and tyāga; comparison with Naciketa, Śvetaketu, and Arjuna as different adhikārīs; karma and jñāna cannot go together (samuccaya-niṣedha); saṁnyāsa as accompaniment of jñānam, not its cause.",
        'coverage_dev': "Continuation of introductory भाष्यम्; recap of विद्यासूत्र and अविद्यासूत्र; discussion on संन्यास — is it necessary? गीता 18th chapter on संन्यास and त्याग; comparison with नचिकेता, श्वेतकेतु, and अर्जुन as different अधिकारीs; कर्म and ज्ञान cannot go together (समुच्चयनिषेध); संन्यास as accompaniment of ज्ञानम्, not its cause.",
        'source_ref': 'Bṛhad. 2.4 sambandha-bhāṣya (contd.)',
        'source_ref_dev': 'बृहद् २.४ सम्बन्धभाष्यम् (contd.)',
    },
    {
        'number': 3,
        'date': '2026-04-27',
        'video_url': 'https://www.youtube.com/watch?v=Vhw1cmv7zSA&list=PLFx8rf4WVNI6Iu1Icx5k7_29L4VQ7TXmn',
        'coverage': "Continued discussion on the purpose of the Maitreyī Brāhmaṇa; saṁnyāsa debate — Janaka did not take saṁnyāsa yet was a jīvanmukta; Vārtikakāra's perspective; vitta-nindā — censuring attachment to wealth as a means; varṇāśrama-vyavasthā-nindā — you don't belong to any varṇa in reality; discussion on women and karma-saṁnyāsa; karma-saṁnyāsa as the subject matter of this section.",
        'coverage_dev': "Continued discussion on the purpose of the मैत्रेयीब्राह्मण; संन्यास debate — जनक did not take संन्यास yet was a जीवन्मुक्त; वार्तिककार's perspective; वित्तनिन्दा — censuring attachment to wealth as a means; वर्णाश्रमव्यवस्थानिन्दा — you don't belong to any वर्ण in reality; discussion on women and कर्मसंन्यास; कर्मसंन्यास as the subject matter of this section.",
        'source_ref': 'Bṛhad. 2.4 sambandha-bhāṣya (contd.)',
        'source_ref_dev': 'बृहद् २.४ सम्बन्धभाष्यम् (contd.)',
    },
    {
        'number': 4,
        'date': '2026-04-30',
        'video_url': 'https://www.youtube.com/watch?v=OiJLJWK-XhI&list=PLFx8rf4WVNI6Iu1Icx5k7_29L4VQ7TXmn',
        'coverage': "Continuation of the introduction; role of ākhyāyikā (story) in śruti as a teaching device; saṁnyāsa is not the cause of mokṣa but a facilitator of jñānam — jñānādeva kaivalyam; vairāgya arises naturally from understanding, not from a śāstric injunction (vidhiśāstra); if freedom depends on saṁnyāsa, it becomes puruṣatantram; the distinction between vidvat-saṁnyāsa and vividiṣā-saṁnyāsa.",
        'coverage_dev': "Continuation of the introduction; role of आख्यायिका (story) in श्रुति as a teaching device; संन्यास is not the cause of मोक्ष but a facilitator of ज्ञानम् — ज्ञानादेव कैवल्यम्; वैराग्य arises naturally from understanding, not from a शास्त्रिक injunction (विधिशास्त्र); if freedom depends on संन्यास, it becomes पुरुषतन्त्रम्; the distinction between विद्वत्संन्यास and विविदिषासंन्यास.",
        'source_ref': 'Bṛhad. 2.4 sambandha-bhāṣya (contd.)',
        'source_ref_dev': 'बृहद् २.४ सम्बन्धभाष्यम् (contd.)',
    },
    {
        'number': 5,
        'date': '2026-05-04',
        'video_url': 'https://www.youtube.com/watch?v=TnVE-AXUz8A&list=PLFx8rf4WVNI6Iu1Icx5k7_29L4VQ7TXmn',
        'coverage': "Why another brāhmaṇa after neti neti? Vārtikakāra Sureśvara's additional reasons; recap of mūrta-amūrta brāhmaṇa — brahman is neither mūrta nor amūrta; the problem is a reality problem — one reality appears as many; resolving adhyāsa; a Sanskrit-free overview class connecting all the threads of the introduction.",
        'coverage_dev': "Why another ब्राह्मण after नेति नेति? वार्तिककार सुरेश्वर's additional reasons; recap of मूर्तामूर्तब्राह्मण — ब्रह्मन् is neither मूर्त nor अमूर्त; the problem is a reality problem — one reality appears as many; resolving अध्यास; a Sanskrit-free overview class connecting all the threads of the introduction.",
        'source_ref': 'Bṛhad. 2.4 sambandha-bhāṣya (contd.)',
        'source_ref_dev': 'बृहद् २.४ सम्बन्धभाष्यम् (contd.)',
    },
]

MATERIALS_URL = 'https://drive.google.com/drive/folders/1GsnyvVftBlBqhcu36YtXgnGkHRYGroFA'

DEV_FRONTMATTER = """---
series: brhadaranyaka
series_title: Bṛhadāraṇyaka Upaniṣad
adhyaya: 2
brahmana: 4
brahmana_name: Maitreyī Brāhmaṇa
class_number: {number}
date: "{date}"
coverage: "{coverage}"
audio_url: ""
video_url: "{video_url}"
materials_url: "{materials_url}"
script: devanagari
source_ref: "{source_ref}"
related_verses: ""
---

"""

IAST_FRONTMATTER = """---
series: brhadaranyaka
series_title: Bṛhadāraṇyaka Upaniṣad
adhyaya: 2
brahmana: 4
brahmana_name: Maitreyī Brāhmaṇa
class_number: {number}
date: "{date}"
coverage: "{coverage}"
audio_url: ""
video_url: "{video_url}"
materials_url: "{materials_url}"
script: iast
source_ref: "{source_ref}"
related_verses: ""
---

"""


def auto_link_references(text):
    """
    Parses and auto-links philosophical references in the markdown text.
    Avoids double-linking if already in a markdown link.
    """
    # 1. Bhagavad Gita
    # Matches: Gita 2.10, Bhagavad Gita 18.66, BG 4.34, Gītā 2.10
    # Negative lookbehind to prevent matching inside existing markdown brackets
    gita_pattern = r'(?<!\[)(?:Bhagavad\s*)?(?:Gita|Gītā|BG)\s+(\d+)\.(\d+)'
    gita_repl = r'[\g<0>](https://advaitasharada.sringeri.net/display/bhashya/Gita/devanagari?chapter=\1&verse=\2)'
    text = re.sub(gita_pattern, gita_repl, text, flags=re.IGNORECASE)

    # 2. Pāṇini / Ashtadhyayi
    # Matches: Panini 1.4.7, Pāṇini 1.1.1, Ashtadhyayi 8.4.68, Aṣṭādhyāyī 1.2.3, Sutra 1.4.7
    panini_pattern = r'(?<!\[)(?:P[aā]?[nṇ]ini|A[sṣ][tṭ][aā]dhy[aā]y[iī]|S[uū]tra)\s+(\d+)\.(\d+)\.(\d+)'
    panini_repl = r'[\g<0>](https://ashtadhyayi.com/sutraani/\1/\2/\3)'
    text = re.sub(panini_pattern, panini_repl, text, flags=re.IGNORECASE)

    # 3. Bṛhadāraṇyaka Upanishad
    # Matches: Brhad. 2.4.6, Bṛhadāraṇyaka 1.4.10, Br. Up. 2.4.5
    brhad_pattern = r'(?<!\[)(?:B[rṛ]had[aā]ra[nṇ]yaka|B[rṛ]had\.|B[rṛ]\.\s*Up\.)\s+(\d+)\.(\d+)(?:\.(\d+))?'
    def brhad_repl(match):
        adhyaya = str(match.group(1)).zfill(2)
        brahmana = str(match.group(2)).zfill(2)
        verse = match.group(3)
        
        anchor = f"BR_C{adhyaya}_S{brahmana}"
        if verse:
            anchor += f"_V{str(verse).zfill(2)}"
            
        return f"[{match.group(0)}](https://advaitasharada.sringeri.net/display/bhashya/Brha/devanagari#{anchor})"

    text = re.sub(brhad_pattern, lambda m: brhad_repl(m), text, flags=re.IGNORECASE)

    return text

def main():
    raw_dir = Path(__file__).parent / 'markdown'
    content_dir = Path('/Users/aditya_nistala/.gemini/antigravity/scratch/vedantic-archive/src/content/classes/brhadaranyaka/2-4')
    content_dir.mkdir(parents=True, exist_ok=True)

    for cls in CLASSES:
        num = cls['number']
        num_str = str(num).zfill(2)

        # Read the converted Devanagari markdown
        raw_file = raw_dir / f'class-{num}.md'
        if not raw_file.exists():
            print(f"Warning: {raw_file} not found, skipping")
            continue

        with open(raw_file, 'r', encoding='utf-8') as f:
            dev_content = f.read()

        # Generate IAST content
        print(f"Transliterating class {num} to IAST...")
        iast_content = convert_markdown_dev_to_iast(dev_content)

        # Apply Auto-Linking
        dev_content = auto_link_references(dev_content)
        iast_content = auto_link_references(iast_content)

        # Write .dev.md
        dev_frontmatter = DEV_FRONTMATTER.format(
            number=num,
            date=cls['date'],
            coverage=cls['coverage_dev'],
            video_url=cls['video_url'],
            materials_url=MATERIALS_URL,
            source_ref=cls['source_ref_dev'],
        )
        dev_file = content_dir / f'class-{num_str}.dev.md'
        with open(dev_file, 'w', encoding='utf-8') as f:
            f.write(dev_frontmatter + dev_content)
        print(f"  → {dev_file.name} ({dev_file.stat().st_size} bytes)")

        # Write .iast.md
        iast_frontmatter = IAST_FRONTMATTER.format(
            number=num,
            date=cls['date'],
            coverage=cls['coverage'],
            video_url=cls['video_url'],
            materials_url=MATERIALS_URL,
            source_ref=cls['source_ref'],
        )
        iast_file = content_dir / f'class-{num_str}.iast.md'
        with open(iast_file, 'w', encoding='utf-8') as f:
            f.write(iast_frontmatter + iast_content)
        print(f"  → {iast_file.name} ({iast_file.stat().st_size} bytes)")

    print(f"\nDone! Generated {len(CLASSES) * 2} content files.")


if __name__ == '__main__':
    main()

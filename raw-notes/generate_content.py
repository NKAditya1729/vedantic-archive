#!/usr/bin/env python3
"""
Generate final content files for the Vedantic Study Archive.
Creates 10 files: 5 .dev.md + 5 .iast.md in the Astro content directory.
"""

import sys
from pathlib import Path

# Import the transliteration module
sys.path.insert(0, str(Path(__file__).parent))
from dev_to_iast import convert_markdown_dev_to_iast

# Class metadata
CLASSES = [
    {
        'number': 1,
        'date': '2025-04-29',
        'video_url': 'https://www.youtube.com/watch?v=4VXBsHjhoqI&list=PLFx8rf4WVNI6Iu1Icx5k7_29L4VQ7TXmn',
        'coverage': "Bhāṣyakāra's sambandha-bhāṣya connecting the Maitreyī Brāhmaṇa to the preceding chapters; review of vidyā-sūtra (1.4.7) and avidyā-sūtra (1.4.10); saṁnyāsa as aṅga for brahmavidyā.",
        'coverage_dev': "भाष्यकार's सम्बन्धभाष्य connecting the मैत्रेयीब्राह्मण to the preceding chapters; review of विद्यासूत्र (1.4.7) and अविद्यासूत्र (1.4.10); संन्यास as अङ्ग for ब्रह्मविद्या.",
        'source_ref': 'Bṛhad. 2.4 sambandha-bhāṣya',
        'source_ref_dev': 'बृहद् २.४ सम्बन्धभाष्यम्',
    },
    {
        'number': 2,
        'date': '2025-05-01',
        'video_url': 'https://www.youtube.com/watch?v=FqglbqZ6RKQ&list=PLFx8rf4WVNI6Iu1Icx5k7_29L4VQ7TXmn',
        'coverage': "Yājñavalkya's announcement of pravrajyā to Maitreyī; her pivotal question — 'yena na amṛtā syām kimahaṁ tena kuryām'; Bhāṣyam on amṛtatvasya tu nāśāsti vittena.",
        'coverage_dev': "याज्ञवल्क्य's announcement of प्रव्रज्या to मैत्रेयी; her pivotal question — 'येन न अमृता स्यां किमहं तेन कुर्याम्'; भाष्यम् on अमृतत्वस्य तु नाशास्ति वित्तेन.",
        'source_ref': 'Bṛhad. 2.4.1–2 bhāṣyam',
        'source_ref_dev': 'बृहद् २.४.१–२ भाष्यम्',
    },
    {
        'number': 3,
        'date': '2025-05-06',
        'video_url': 'https://www.youtube.com/watch?v=Vhw1cmv7zSA&list=PLFx8rf4WVNI6Iu1Icx5k7_29L4VQ7TXmn',
        'coverage': "Continuation of Bhāṣyam on 2.4.2; Maitreyī's vairāgya and mumukṣutva; teaching begins — ātmā vā are draṣṭavyaḥ; śravaṇa-manana-nididhyāsana triad.",
        'coverage_dev': "Continuation of भाष्यम् on 2.4.2; मैत्रेयी's वैराग्य and मुमुक्षुत्व; teaching begins — आत्मा वा अरे द्रष्टव्यः; श्रवण-मनन-निदिध्यासन triad.",
        'source_ref': 'Bṛhad. 2.4.2–3 bhāṣyam',
        'source_ref_dev': 'बृहद् २.४.२–३ भाष्यम्',
    },
    {
        'number': 4,
        'date': '2025-05-08',
        'video_url': 'https://www.youtube.com/watch?v=OiJLJWK-XhI&list=PLFx8rf4WVNI6Iu1Icx5k7_29L4VQ7TXmn',
        'coverage': "Bhāṣyam on 2.4.3–4; priyatva analysis — why is ātmā excessive dearest; patnī, putra, vitta — all loved for the sake of ātmā; ātmanastu kāmāya sarvaṁ priyam bhavati.",
        'coverage_dev': "भाष्यम् on 2.4.3–4; प्रियत्व analysis — why is आत्मा the dearest; पत्नी, पुत्र, वित्त — all loved for the sake of आत्मा; आत्मनस्तु कामाय सर्वं प्रियं भवति.",
        'source_ref': 'Bṛhad. 2.4.3–4 bhāṣyam',
        'source_ref_dev': 'बृहद् २.४.३–४ भाष्यम्',
    },
    {
        'number': 5,
        'date': '2025-05-13',
        'video_url': 'https://www.youtube.com/watch?v=TnVE-AXUz8A&list=PLFx8rf4WVNI6Iu1Icx5k7_29L4VQ7TXmn',
        'coverage': "Bhāṣyam on 2.4.5; 'ātmā vā are draṣṭavyaḥ' — the ātmā alone is to be seen/known; idaṁ sarvaṁ yadayamātmā — everything is nothing but ātmā; Vārttikakāra's analysis.",
        'coverage_dev': "भाष्यम् on 2.4.5; 'आत्मा वा अरे द्रष्टव्यः' — the आत्मा alone is to be seen/known; इदं सर्वं यदयमात्मा — everything is nothing but आत्मा; वार्त्तिककार's analysis.",
        'source_ref': 'Bṛhad. 2.4.5 bhāṣyam',
        'source_ref_dev': 'बृहद् २.४.५ भाष्यम्',
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

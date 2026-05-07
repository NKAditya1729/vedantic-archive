#!/usr/bin/env python3
"""
Devanagari → IAST transliteration for the Vedantic Study Archive.

Converts Devanagari text to IAST (International Alphabet of Sanskrit Transliteration).
Used to generate .iast.md files from .dev.md files.
"""

import re

# Devanagari vowels → IAST
VOWELS = {
    'अ': 'a', 'आ': 'ā', 'इ': 'i', 'ई': 'ī', 'उ': 'u', 'ऊ': 'ū',
    'ऋ': 'ṛ', 'ॠ': 'ṝ', 'ऌ': 'ḷ', 'ॡ': 'ḹ',
    'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
}

# Devanagari vowel marks (mātrās) → IAST
MATRAS = {
    '\u093E': 'ā',   # ा
    '\u093F': 'i',    # ि
    '\u0940': 'ī',    # ी
    '\u0941': 'u',    # ु
    '\u0942': 'ū',    # ू
    '\u0943': 'ṛ',    # ृ
    '\u0944': 'ṝ',    # ॄ
    '\u0962': 'ḷ',    # ॢ
    '\u0963': 'ḹ',    # ॣ
    '\u0947': 'e',    # े
    '\u0948': 'ai',   # ै
    '\u094B': 'o',    # ो
    '\u094C': 'au',   # ौ
}

# Devanagari consonants → IAST (without inherent 'a')
CONSONANTS = {
    'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ṅ',
    'च': 'c', 'छ': 'ch', 'ज': 'j', 'झ': 'jh', 'ञ': 'ñ',
    'ट': 'ṭ', 'ठ': 'ṭh', 'ड': 'ḍ', 'ढ': 'ḍh', 'ण': 'ṇ',
    'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
    'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
    'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v',
    'श': 'ś', 'ष': 'ṣ', 'स': 's', 'ह': 'h',
}

# Special characters
SPECIAL = {
    '\u0902': 'ṁ',    # anusvāra ं
    '\u0903': 'ḥ',    # visarga ः
    '\u093D': "'",     # avagraha ऽ
    '\u0901': 'm̐',   # candrabindu ँ
    '।': '।',         # danda (keep as-is)
    '॥': '॥',         # double danda (keep as-is)
    '\u094D': '',      # virāma (halant) — handled in logic
}

# Numerals
NUMERALS = {
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
    '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
}

# OM
OM = {'ॐ': 'oṁ'}


def is_devanagari(c):
    """Check if a character is in the Devanagari Unicode block."""
    return '\u0900' <= c <= '\u097F' or c == 'ॐ'


def is_consonant(c):
    """Check if a character is a Devanagari consonant."""
    return c in CONSONANTS


def is_vowel(c):
    """Check if a character is a Devanagari independent vowel."""
    return c in VOWELS


def is_matra(c):
    """Check if a character is a Devanagari vowel sign (mātrā)."""
    return c in MATRAS


def is_halant(c):
    """Check if a character is the virāma/halant."""
    return c == '\u094D'


def transliterate_devanagari_to_iast(text):
    """
    Convert a Devanagari string to IAST.
    """
    result = []
    i = 0
    n = len(text)

    while i < n:
        c = text[i]

        # OM
        if c in OM:
            result.append(OM[c])
            i += 1
            continue

        # Numerals
        if c in NUMERALS:
            result.append(NUMERALS[c])
            i += 1
            continue

        # Independent vowels
        if is_vowel(c):
            # Check for two-char vowels like ऐ, औ
            if i + 1 < n and c + text[i+1] in VOWELS:
                result.append(VOWELS[c + text[i+1]])
                i += 2
            else:
                result.append(VOWELS[c])
                i += 1
            continue

        # Consonants
        if is_consonant(c):
            # Check for two-char consonants (aspirates)
            # Actually Devanagari aspirates are single characters, not two-char
            iast_cons = CONSONANTS[c]

            # Look ahead for halant, mātrā, or next character
            j = i + 1
            if j < n and is_halant(text[j]):
                # Halant: no inherent 'a'
                result.append(iast_cons)
                i = j + 1
            elif j < n and is_matra(text[j]):
                # Vowel sign follows
                result.append(iast_cons + MATRAS[text[j]])
                i = j + 1
            else:
                # Inherent 'a'
                result.append(iast_cons + 'a')
                i = j
            continue

        # Anusvāra, visarga, avagraha, chandrabindu
        if c in SPECIAL:
            result.append(SPECIAL[c])
            i += 1
            continue

        # Dandas
        if c == '।':
            result.append('।')
            i += 1
            continue
        if c == '॥':
            result.append('॥')
            i += 1
            continue

        # Non-Devanagari: pass through as-is
        result.append(c)
        i += 1

    return ''.join(result)


def convert_markdown_dev_to_iast(md_text):
    """
    Convert a Devanagari markdown file to IAST.
    
    Rules:
    - Bold inline Sanskrit (**देवनागरी**) → bold IAST (**IAST**)
    - Standalone Devanagari blocks (prayers, citations) → IAST
    - English text → unchanged
    """
    def transliterate_segment(text):
        """Transliterate only the Devanagari characters in a segment."""
        # Check if segment has any Devanagari
        has_dev = any(is_devanagari(c) for c in text)
        if not has_dev:
            return text
        
        # Process character by character, transliterating Devanagari runs
        result = []
        i = 0
        n = len(text)
        while i < n:
            if is_devanagari(text[i]):
                # Collect the entire Devanagari run
                dev_start = i
                while i < n and (is_devanagari(text[i]) or text[i] in '।॥'):
                    i += 1
                dev_text = text[dev_start:i]
                result.append(transliterate_devanagari_to_iast(dev_text))
            else:
                result.append(text[i])
                i += 1
        return ''.join(result)

    # Process the markdown line by line
    lines = md_text.split('\n')
    result_lines = []

    for line in lines:
        # Transliterate bold terms: **देवनागरी** → **IAST**
        # And also transliterate non-bold Devanagari (in standalone blocks)
        result_lines.append(transliterate_segment(line))

    return '\n'.join(result_lines)


# --- Self-test ---
if __name__ == '__main__':
    # Test basic transliteration
    tests = [
        ('ब्रह्मन्', 'brahman'),
        ('मैत्रेयी', 'maitreyī'),
        ('याज्ञवल्क्य', 'yājñavalkya'),
        ('शास्त्र', 'śāstra'),
        ('भाष्यकार', 'bhāṣyakāra'),
        ('अविद्या', 'avidyā'),
        ('संन्यास', 'saṁnyāsa'),
        ('ज्ञानम्', 'jñānam'),
        ('आत्मा', 'ātmā'),
        ('कात्यायनी', 'kātyāyanī'),
        ('ॐ', 'oṁ'),
        ('दक्षिणामूर्ति', 'dakṣiṇāmūrti'),
        ('विद्वत्', 'vidvat'),
        ('ब्राह्मण', 'brāhmaṇa'),
        ('उपनिषद्', 'upaniṣad'),
    ]

    print("Transliteration tests:")
    all_pass = True
    for dev, expected in tests:
        got = transliterate_devanagari_to_iast(dev)
        status = '✅' if got == expected else '❌'
        if got != expected:
            all_pass = False
        print(f"  {status} {dev} → {got} (expected: {expected})")

    print(f"\n{'All tests passed!' if all_pass else 'SOME TESTS FAILED'}")

    # Test markdown conversion
    sample_md = """ॐ श्रुतिस्मृतिपुराणानाम् आलयं करुणालयम्।

So we are entering the **ब्राह्मण**, **मैत्रेयीब्राह्मण**। The **भाष्यकार** says — **आत्मेत्येवोपासीत**."""

    print("\n\nMarkdown conversion test:")
    print("INPUT:")
    print(sample_md)
    print("\nOUTPUT:")
    print(convert_markdown_dev_to_iast(sample_md))

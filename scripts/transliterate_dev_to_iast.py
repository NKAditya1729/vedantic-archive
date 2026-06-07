#!/usr/bin/env python3
"""
transliterate_dev_to_iast.py
----------------------------------
Deterministic, mechanical Devanagari -> IAST transliteration.

CORE GUARANTEE (this is why the script exists instead of letting the model
"convert" text by hand): ONLY Devanagari character runs are transliterated.
Every Latin letter, English word, space, punctuation mark, markdown marker
(** _ # > -), HTML tag, and frontmatter key is passed through BYTE-FOR-BYTE.

This is what makes "not a single word changed" literally true: the script
cannot touch English, because it never looks at non-Devanagari characters.

Usage:
    # transliterate a whole file (stdin/stdout)
    python3 transliterate_dev_to_iast.py < input_dev.md > output_iast.md

    # transliterate a single string passed as arg
    python3 transliterate_dev_to_iast.py --text "आत्मा वै अरे"

Dependency (install once, no API cost):
    pip3 install indic-transliteration

Danda / decorator policy:
    By default, the Vedic dandas । ॥ and the avagraha ऽ and praṇava ॐ
    are transliterated by the library (। -> | , ॥ -> || , ॐ -> oṃ).
    If the existing IAST class files keep ॥ literally as a section-label
    decorator, set KEEP_DANDA = True below to preserve । ॥ verbatim.
    DECIDE THIS ONCE by checking class-12.iast.md, then never change it.
"""

import re
import sys
import argparse

from indic_transliteration import sanscript
from indic_transliteration.sanscript import transliterate

# ---- policy switch: read class-12.iast.md ONCE, then lock this -------------
KEEP_DANDA = True    # protect only the ॥ decorator (see PROTECT below)
# ---------------------------------------------------------------------------

# Devanagari (U+0900–U+097F) + Devanagari Extended (U+A8E0–U+A8FF).
# We match maximal runs so conjuncts/matras stay together.
DEVA_RUN = re.compile(r'[\u0900-\u097F\uA8E0-\uA8FF]+')

# Characters protected from transliteration when KEEP_DANDA is True.
# Per the IAST rule "zero Devanagari EXCEPT the ॥ decorator", we keep ONLY ॥.
# The single danda । still becomes | and avagraha ऽ still becomes ' (apostrophe).
PROTECT = {'॥': '॥'}


def _convert_run(run: str) -> str:
    if not KEEP_DANDA:
        return transliterate(run, sanscript.DEVANAGARI, sanscript.IAST)
    # Protect dandas/avagraha by splitting around them.
    out = []
    buf = ''
    for ch in run:
        if ch in PROTECT:
            if buf:
                out.append(transliterate(buf, sanscript.DEVANAGARI, sanscript.IAST))
                buf = ''
            out.append(PROTECT[ch])
        else:
            buf += ch
    if buf:
        out.append(transliterate(buf, sanscript.DEVANAGARI, sanscript.IAST))
    return ''.join(out)


def dev_to_iast(text: str) -> str:
    """Transliterate only Devanagari runs; leave everything else untouched."""
    return DEVA_RUN.sub(lambda m: _convert_run(m.group(0)), text)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--text', help='Transliterate this string and print it.')
    args = ap.parse_args()

    if args.text is not None:
        sys.stdout.write(dev_to_iast(args.text))
        if not args.text.endswith('\n'):
            sys.stdout.write('\n')
        return

    data = sys.stdin.read()
    sys.stdout.write(dev_to_iast(data))


if __name__ == '__main__':
    main()

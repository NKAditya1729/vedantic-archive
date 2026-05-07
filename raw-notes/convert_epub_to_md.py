#!/usr/bin/env python3
"""
Convert EPUB XHTML class notes to Markdown for the Vedantic Study Archive.

Key insight from analyzing the EPUBs:
- Class 1: prayers = p2 (no spans), teaching = p3 (with c1/c2 spans)
- Class 3: prayers = p2 (no spans), teaching = ALSO p2 (with c1/c2 spans)
- The distinguishing factor is: prayers have NO span children, just raw text
- Teaching content has span children with c1 (English) and c2 (bold Sanskrit)

Therefore: we cannot rely on paragraph class alone. Instead:
- If a paragraph has c2 spans → it's teaching content → bold the c2 terms
- If a paragraph has no spans → it's a standalone prayer/verse → no bold
"""

import re
from html.parser import HTMLParser
from pathlib import Path


def is_devanagari_char(c):
    return '\u0900' <= c <= '\u097F'


def is_devanagari_dominant(text):
    clean = text.strip()
    if not clean:
        return False
    dev_count = sum(1 for c in clean if is_devanagari_char(c))
    alpha_count = sum(1 for c in clean if c.isalpha() or is_devanagari_char(c))
    if alpha_count == 0:
        return False
    return dev_count / alpha_count > 0.85


class EpubToMarkdownConverter(HTMLParser):
    def __init__(self):
        super().__init__()
        self.result = []
        self.current_paragraph_parts = []  # list of (text, is_bold)
        self.current_classes = []
        self.in_p = False
        self.p_has_spans = False

    def handle_starttag(self, tag, attrs):
        attr_dict = dict(attrs)
        if tag == 'p':
            self.in_p = True
            self.current_paragraph_parts = []
            self.p_has_spans = False
        elif tag == 'span':
            self.p_has_spans = True
            cls = attr_dict.get('class', '')
            self.current_classes = cls.split()

    def handle_endtag(self, tag):
        if tag == 'p' and self.in_p:
            self.in_p = False
            # Build paragraph text
            text_parts = []
            for txt, is_bold in self.current_paragraph_parts:
                if is_bold:
                    text_parts.append(f'**{txt}**')
                else:
                    text_parts.append(txt)
            paragraph_text = ''.join(text_parts).strip()
            if paragraph_text:
                self.result.append(paragraph_text)
            self.current_paragraph_parts = []
        elif tag == 'span':
            self.current_classes = []

    def handle_data(self, data):
        if not self.in_p:
            return
        # c2 = bold inline Sanskrit
        is_bold = 'c2' in self.current_classes
        self.current_paragraph_parts.append((data, is_bold))

    def handle_entityref(self, name):
        if not self.in_p:
            return
        entities = {'quot': '"', 'amp': '&', 'lt': '<', 'gt': '>', 'apos': "'"}
        self.current_paragraph_parts.append((entities.get(name, f'&{name};'), False))

    def handle_charref(self, name):
        if not self.in_p:
            return
        try:
            if name.startswith('x'):
                ch = chr(int(name[1:], 16))
            else:
                ch = chr(int(name))
            self.current_paragraph_parts.append((ch, False))
        except ValueError:
            self.current_paragraph_parts.append((f'&#{name};', False))

    def get_markdown(self):
        return '\n\n'.join(self.result)


def post_process_markdown(md_text):
    """Clean up the markdown output."""
    lines = md_text.split('\n\n')
    result = []

    for line in lines:
        # Merge adjacent bold spans: **text1****text2** → **text1text2**
        for _ in range(10):
            new_line = re.sub(r'\*\*([^*]+)\*\*\*\*([^*]+)\*\*', r'**\1\2**', line)
            if new_line == line:
                break
            line = new_line

        # Clean up empty bold or bold containing only spaces/punctuation
        line = re.sub(r'\*\*\s*\*\*', '', line)
        line = re.sub(r'\*\*([।॥\s]+)\*\*', r'\1', line)

        # If the whole line (minus bold markers) is predominantly Devanagari,
        # it's a standalone verse/prayer — remove bold
        clean_text = line.replace('**', '')
        if is_devanagari_dominant(clean_text):
            line = clean_text

        line = line.strip()
        if line:
            result.append(line)

    return '\n\n'.join(result)


def convert_epub_chapter(xhtml_path):
    """Convert an EPUB chapter XHTML to markdown."""
    with open(xhtml_path, 'r', encoding='utf-8') as f:
        content = f.read()

    converter = EpubToMarkdownConverter()
    converter.feed(content)
    md = converter.get_markdown()
    md = post_process_markdown(md)
    return md


def main():
    base_dir = Path('/Users/aditya_nistala/.gemini/antigravity/scratch/vedantic-archive/raw-notes/epub-extract')
    output_dir = Path('/Users/aditya_nistala/.gemini/antigravity/scratch/vedantic-archive/raw-notes/markdown')
    output_dir.mkdir(exist_ok=True)

    for i in range(1, 6):
        class_dir = base_dir / f'class-{i}' / 'OPS'
        xhtml_file = class_dir / 'chapter-1.xhtml'

        if not xhtml_file.exists():
            print(f"Warning: {xhtml_file} not found, skipping")
            continue

        print(f"Converting class {i}...")
        md = convert_epub_chapter(xhtml_file)

        output_file = output_dir / f'class-{i}.md'
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(md)

        bold_count = len(re.findall(r'\*\*[^*]+\*\*', md))
        print(f"  → {output_file} ({len(md)} bytes, {bold_count} bold terms)")


if __name__ == '__main__':
    main()

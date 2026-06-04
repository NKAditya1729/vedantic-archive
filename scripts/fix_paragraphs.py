#!/usr/bin/env python3
"""
fix_paragraphs.py — Normalize paragraph spacing in class note .md files.
Only touches the body (after the closing ---), never frontmatter.
Zero content changes: only inserts/collapses blank lines between paragraphs.
"""

import sys
import glob
import argparse


def split_frontmatter(content: str):
    """Return (frontmatter_str, body_str), or (None, content) if no YAML front matter."""
    if not content.startswith('---\n'):
        return None, content
    idx = content.find('\n---\n', 3)
    if idx == -1:
        return None, content
    frontmatter = content[:idx + 5]   # includes the trailing \n---\n
    body = content[idx + 5:]
    return frontmatter, body


def normalize_body(body: str) -> str:
    lines = body.split('\n')
    result = []

    for i, line in enumerate(lines):
        result.append(line)

        # When two consecutive non-empty lines would render as one paragraph,
        # insert a blank line between them — with exceptions below.
        if line.strip() and i + 1 < len(lines):
            next_line = lines[i + 1]
            if next_line.strip():
                # Exception: both lines are table rows
                if '|' in line and '|' in next_line:
                    continue
                # Exception: either line is a blockquote
                if line.startswith('>') or next_line.startswith('>'):
                    continue
                # Exception: either line is a horizontal rule
                if line.strip() in ('---', '***', '___') or next_line.strip() in ('---', '***', '___'):
                    continue
                result.append('')   # insert paragraph break

    # Collapse runs of 2+ consecutive blank lines down to 1 blank line
    collapsed = []
    blank_run = 0
    for line in result:
        if line.strip() == '':
            blank_run += 1
            if blank_run <= 1:
                collapsed.append(line)
        else:
            blank_run = 0
            collapsed.append(line)

    return '\n'.join(collapsed)


def process_file(path: str, dry_run: bool = False):
    """Return (changed: bool, lines_added: int)."""
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    frontmatter, body = split_frontmatter(content)
    if frontmatter is None:
        return False, 0

    new_body = normalize_body(body)
    if new_body == body:
        return False, 0

    lines_added = new_body.count('\n') - body.count('\n')
    if not dry_run:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(frontmatter + new_body)

    return True, lines_added


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--files', nargs='+', help='Specific files to process')
    args = parser.parse_args()

    if args.files:
        md_files = args.files
    else:
        md_files = sorted(glob.glob('src/content/classes/brhadaranyaka/2-4/*.md'))

    fixed = unchanged = 0
    for path in md_files:
        changed, lines_added = process_file(path, dry_run=args.dry_run)
        if changed:
            fixed += 1
            verb = 'would fix' if args.dry_run else 'fixed'
            print(f'{verb}: {path}  (+{lines_added} lines)')
        else:
            unchanged += 1

    label = ' (dry run)' if args.dry_run else ''
    print(f'\nFixed {fixed} files, {unchanged} unchanged{label}')


if __name__ == '__main__':
    main()

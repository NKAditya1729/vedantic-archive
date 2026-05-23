import os
import re
import html
from parse_structured_rtf import parse_rtf_to_spans, group_spans_into_paragraphs

# Video ID mapping for all 10 classes
VIDEO_IDS = {
    1: "4VXBsHjhoqI",
    2: "FqglbqZ6RKQ",
    3: "Vhw1cmv7zSA",
    4: "_AI3aIq4SCY",
    5: "c8HircUgM_o",
    6: "49an96B2wF4",
    7: "K2ab17DOz2A",
    8: "oVgIPwwzuN8",
    9: "oy-MM39V7oQ",
    10: "LQRCZfNYD8E"
}

BASE_DIR = '/Users/aditya_nistala/.gemini/antigravity/scratch/vedantic-archive'
RTF_DIR = '/Users/aditya_nistala/Downloads/Brhad_Upa_Class_Notes/Class Coverage Notes'

def classify_paragraph(para, c_num):
    # Get all text
    text = "".join(s['text'] for s in para).strip()
    if text == '*' or text == '':
        return 'ignore'
    if text.lower().startswith('verses from vartika') or text.lower().startswith('varitka verses'):
        return 'ignore'
        
    # Check if Class 5 (exclusively Varttika)
    if c_num == 5:
        return 'vartika'
        
    # Check if Class 10 (exclusively Mulam)
    if c_num == 10:
        return 'mulam'
        
    # Check colors and underlines
    colors = set(s['color'] for s in para)
    
    # If color 5 is present, it's Varttika
    if 5 in colors:
        return 'vartika'
        
    # If the text ends with the danda and class/verse number e.g. "|| 2-4-1 ||" or "॥ 2-4-1 ॥"
    # or similar patterns
    if re.search(r'(\|\||॥)\s*\d+[-–]\d+[-–]\d+\s*(\|\||॥)', text):
        return 'mulam'
    # Also if it ends with double danda
    if text.endswith('॥') or text.endswith('||'):
        # For classes 6-9, paragraphs ending with danda and not having color 4 (Pratika) or underline
        # are Mulam.
        has_pratika = any(s['color'] == 4 or s['underline'] for s in para)
        if not has_pratika:
            return 'mulam'

    # Default is Bhashyam
    return 'bhashyam'

def format_text_with_pratikas(para):
    formatted_spans = []
    in_pratika = False
    current_pratika_text = []

    for s in para:
        text = s['text']
        # Replace unicode line separator with a newline character, so we can turn it into <br> later
        text = text.replace('\u2028', '\n')
        
        is_pratika_span = (s['color'] == 4 or s['underline'])
        
        if is_pratika_span:
            if not in_pratika:
                in_pratika = True
            current_pratika_text.append(text)
        else:
            if in_pratika:
                # Emit the accumulated pratika text
                pratika_str = "".join(current_pratika_text)
                # Escape HTML characters
                escaped_pratika = html.escape(pratika_str).replace('\n', '<br>')
                formatted_spans.append(f'<span class="src-pratika">{escaped_pratika}</span>')
                current_pratika_text = []
                in_pratika = False
            # Escape and append regular text
            escaped_text = html.escape(text).replace('\n', '<br>')
            formatted_spans.append(escaped_text)
            
    if in_pratika:
        pratika_str = "".join(current_pratika_text)
        escaped_pratika = html.escape(pratika_str).replace('\n', '<br>')
        formatted_spans.append(f'<span class="src-pratika">{escaped_pratika}</span>')
        
    return "".join(formatted_spans)

def generate_html_block(paras, c_num, lang, source_ref):
    # Filter and classify paragraphs
    classified_paras = []
    for para in paras:
        ptype = classify_paragraph(para, c_num)
        if ptype != 'ignore':
            classified_paras.append((para, ptype))
            
    # Labels map
    labels_map = {
        'dev': {
            'mulam': '॥ मूलम् ॥',
            'bhashyam': '॥ भाष्यम् ॥',
            'vartika': '॥ वार्तिकम् ॥'
        },
        'iast': {
            'mulam': '॥ Mūlam ॥',
            'bhashyam': '॥ Bhāṣyam ॥',
            'vartika': '॥ Vārttikam ॥'
        }
    }
    
    html_lines = []
    html_lines.append('<div class="source-text-structured">')
    html_lines.append(f'  <p class="source-ref-line">Covered: {html.escape(source_ref)}</p>')
    
    last_type = None
    
    for idx, (para, ptype) in enumerate(classified_paras):
        # If type changes, add a divider and the label
        if ptype != last_type:
            if last_type is not None:
                html_lines.append('  <hr class="src-divider">')
            label_text = labels_map[lang][ptype]
            html_lines.append(f'  <p class="src-label {ptype}-label">{label_text}</p>')
            last_type = ptype
            
        # Format paragraph text
        p_html = format_text_with_pratikas(para)
        # Remove trailing/leading spaces but preserve br tags
        p_html = p_html.strip()
        html_lines.append(f'  <p class="src-{ptype}">{p_html}</p>')
        
    html_lines.append('</div>')
    return "\n".join(html_lines)

def extract_source_ref(frontmatter_raw):
    # Match source_ref: "..." or source_ref: ...
    m = re.search(r'source_ref:\s*"([^"]*)"', frontmatter_raw)
    if m:
        return m.group(1)
    m = re.search(r'source_ref:\s*([^\n]*)', frontmatter_raw)
    if m:
        return m.group(1).strip()
    return ""

def update_markdown_files():
    classes_path = os.path.join(BASE_DIR, 'src/content/classes/brhadaranyaka/2-4')
    
    for c_num in range(1, 11):
        for lang in ('dev', 'iast'):
            filename = f"class-{c_num:02d}.{lang}.md"
            filepath = os.path.join(classes_path, filename)
            
            if not os.path.exists(filepath):
                print(f"File not found: {filepath}")
                continue
                
            # Read current markdown file content
            with open(filepath, 'r', encoding='utf-8') as f:
                md_content = f.read()
                
            # Parse frontmatter
            parts = md_content.split('---')
            if len(parts) < 3:
                print(f"Invalid frontmatter format in {filename}")
                continue
                
            frontmatter_raw = parts[1]
            body = '---'.join(parts[2:])
            
            # Extract source_ref via regex to avoid YAML parsing issues with line separators
            source_ref = extract_source_ref(frontmatter_raw)
            if not source_ref:
                source_ref = f"बृहद् २.४ Class {c_num}"
                
            # Read and parse corresponding RTF file
            rtf_lang = 'Devanagari' if lang == 'dev' else 'IAST'
            rtf_suffix = 'Dev' if lang == 'dev' else 'IAST'
            rtf_filename = f"Brhad_Upa_Class_{c_num}_{rtf_suffix}.rtf"
            rtf_filepath = os.path.join(RTF_DIR, rtf_lang, rtf_filename)
            
            if not os.path.exists(rtf_filepath):
                print(f"RTF file not found: {rtf_filepath}")
                continue
                
            with open(rtf_filepath, 'r', encoding='latin1') as f:
                rtf_content = f.read()
                
            spans = parse_rtf_to_spans(rtf_content)
            paras = group_spans_into_paragraphs(spans)
            
            # Generate the new HTML source text block
            new_source_html = generate_html_block(paras, c_num, lang, source_ref)
            
            # Update video URL
            video_id = VIDEO_IDS[c_num]
            video_url = f"https://www.youtube.com/watch?v={video_id}&list=PLFx8rf4WVNI6Iu1Icx5k7_29L4VQ7TXmn"
            
            new_fm_raw = frontmatter_raw
            
            # Replace video_url line
            new_video_url_line = f'video_url: "{video_url}"'
            new_fm_raw = re.sub(r'video_url:.*', new_video_url_line, new_fm_raw)
            
            # Replace source_text_content block
            # source_text_content is a multi-line yaml string, we'll format it with |
            # Indent each line of HTML block by 2 spaces
            indented_source = "\n".join("  " + line for line in new_source_html.split('\n'))
            
            # Search and replace source_text_content block
            pattern = r'source_text_content:\s*\|.*?(?=\n[a-z_]+:|\n---|$)'
            replacement = f'source_text_content: |\n{indented_source}'
            new_fm_raw = re.compile(pattern, re.DOTALL).sub(replacement, new_fm_raw)
            
            # Construct final content
            new_md_content = f"---{new_fm_raw}---{body}"
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_md_content)
                
            print(f"Successfully updated {filename}")

if __name__ == "__main__":
    update_markdown_files()

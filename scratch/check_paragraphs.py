import os
from parse_structured_rtf import parse_rtf_to_spans, group_spans_into_paragraphs

base_dir = '/Users/aditya_nistala/Downloads/Brhad_Upa_Class_Notes/Class Coverage Notes'

for lang in ('Devanagari', 'IAST'):
    print(f"\n=== {lang.upper()} ===")
    for c_num in range(1, 11):
        suffix = 'Dev' if lang == 'Devanagari' else 'IAST'
        filename = f"Brhad_Upa_Class_{c_num}_{suffix}.rtf"
        filepath = os.path.join(base_dir, lang, filename)
        if not os.path.exists(filepath):
            continue
            
        with open(filepath, 'r', encoding='latin1') as f:
            content = f.read()
            
        spans = parse_rtf_to_spans(content)
        paras = group_spans_into_paragraphs(spans)
        
        print(f"  Class {c_num}:")
        for idx, para in enumerate(paras):
            text = "".join(s['text'] for s in para).strip()
            colors = sorted(list(set(s['color'] for s in para)))
            has_underline = any(s['underline'] for s in para)
            # check bold
            # we don't track bold yet, but let's see text
            print(f"    P{idx}: colors={colors} ul={has_underline} | text={repr(text)}")

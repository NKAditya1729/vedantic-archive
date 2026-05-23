import os
import re

def rtf_to_text(rtf_text):
    return ""

def parse_rtf_to_spans(rtf_text):
    stack = []
    # State: (skip_flag, color, underline, uc_value)
    current_skip = False
    current_color = 2  # Default body color (usually black/dark grey)
    current_underline = False
    uc_value = 1
    
    spans = []
    current_text = []
    
    def emit_span(p_break=False):
        nonlocal current_text
        if current_text or p_break:
            text_str = "".join(current_text)
            spans.append({
                'text': text_str,
                'color': current_color,
                'underline': current_underline,
                'p_break': p_break
            })
            current_text = []

    i = 0
    n = len(rtf_text)
    skip_chars = 0
    
    while i < n:
        c = rtf_text[i]
        
        if skip_chars > 0:
            skip_chars -= 1
            i += 1
            continue
            
        if c == '{':
            stack.append((current_skip, current_color, current_underline, uc_value))
            i += 1
            continue
            
        if c == '}':
            if stack:
                # Emit any pending text under current style before popping
                emit_span()
                current_skip, current_color, current_underline, uc_value = stack.pop()
            i += 1
            continue
            
        if c == '\\':
            i += 1
            if i >= n:
                break
            c2 = rtf_text[i]
            
            # Handle backslash followed by literal newline/carriage return (soft break)
            if c2 in '\r\n':
                emit_span(p_break=True)
                i += 1
                while i < n and rtf_text[i] in '\r\n':
                    i += 1
                continue
                
            if c2 in '\\{}':
                if not current_skip:
                    current_text.append(c2)
                i += 1
                continue
            elif c2 == '\'':
                i += 1
                if i + 2 <= n:
                    hex_val = rtf_text[i:i+2]
                    if not current_skip:
                        try:
                            char_code = int(hex_val, 16)
                            mapping = {
                                0x91: '‘',
                                0x92: '’',
                                0x93: '“',
                                0x94: '”',
                                0x97: '—',
                            }
                            if char_code in mapping:
                                current_text.append(mapping[char_code])
                            else:
                                current_text.append(bytes([char_code]).decode('cp1252', errors='replace'))
                        except Exception:
                            pass
                    i += 2
                continue
            elif c2 == '~':
                if not current_skip:
                    current_text.append(' ')
                i += 1
                continue
            elif c2 == '_':
                if not current_skip:
                    current_text.append('-')
                i += 1
                continue
            
            # Read control word
            control_word = ""
            while i < n and rtf_text[i].isalpha():
                control_word += rtf_text[i]
                i += 1
            control_value = None
            if i < n and (rtf_text[i].isdigit() or rtf_text[i] == '-'):
                val_str = ""
                if rtf_text[i] == '-':
                    val_str += '-'
                    i += 1
                while i < n and rtf_text[i].isdigit():
                    val_str += rtf_text[i]
                    i += 1
                try:
                    control_value = int(val_str)
                except ValueError:
                    pass
            
            if i < n and rtf_text[i] == ' ':
                i += 1
            
            skip_groups = {'fonttbl', 'colortbl', 'expandedcolortbl', 'generator', 'stylesheet', 'info', 'fldinst'}
            if control_word in skip_groups:
                current_skip = True
                
            if not current_skip:
                if control_word in ('par', 'line', 'pard'):
                    emit_span(p_break=True)
                elif control_word == 'cf' and control_value is not None:
                    emit_span()
                    current_color = control_value
                elif control_word == 'ul':
                    emit_span()
                    current_underline = True
                elif control_word == 'ulnone':
                    emit_span()
                    current_underline = False
                elif control_word == 'u' and control_value is not None:
                    val = control_value
                    if val < 0:
                        val += 65536
                    current_text.append(chr(val))
                    skip_chars = uc_value
                elif control_word == 'uc' and control_value is not None:
                    uc_value = control_value
            continue
        else:
            if c not in '\r\n':
                if not current_skip:
                    current_text.append(c)
            i += 1
            
    emit_span()
    return spans

def group_spans_into_paragraphs(spans):
    paragraphs = []
    current_para = []
    
    for span in spans:
        if span['text'].strip() or (current_para and span['text']):
            s_copy = span.copy()
            s_copy['p_break'] = False
            current_para.append(s_copy)
            
        if span['p_break']:
            if current_para:
                paragraphs.append(current_para)
                current_para = []
                
    if current_para:
        paragraphs.append(current_para)
        
    cleaned_paragraphs = []
    for para in paragraphs:
        text = "".join(s['text'] for s in para).strip()
        if text:
            cleaned_paragraphs.append(para)
            
    return cleaned_paragraphs

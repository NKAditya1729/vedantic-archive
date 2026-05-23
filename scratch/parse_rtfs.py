import os
import re

def rtf_to_text(rtf_text):
    stack = []
    current_skip = False
    current_control_words = set()
    tokens = []
    i = 0
    n = len(rtf_text)
    uc_value = 1
    skip_chars = 0
    while i < n:
        c = rtf_text[i]
        if skip_chars > 0:
            skip_chars -= 1
            i += 1
            continue
        if c == '{':
            stack.append((current_skip, current_control_words))
            current_control_words = set()
            i += 1
            continue
        if c == '}':
            if stack:
                current_skip, current_control_words = stack.pop()
            else:
                current_skip = False
                current_control_words = set()
            i += 1
            continue
        if c == '\\':
            i += 1
            if i >= n:
                break
            c2 = rtf_text[i]
            if c2 in '\\{}':
                if not current_skip:
                    tokens.append(c2)
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
                                tokens.append(mapping[char_code])
                            else:
                                tokens.append(bytes([char_code]).decode('cp1252', errors='replace'))
                        except Exception:
                            pass
                    i += 2
                continue
            elif c2 == '~':
                if not current_skip:
                    tokens.append(' ')
                i += 1
                continue
            elif c2 == '_':
                if not current_skip:
                    tokens.append('-')
                i += 1
                continue
            
            # Alphabetic control word
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
            
            # Consume space delimiter
            if i < n and rtf_text[i] == ' ':
                i += 1
            
            current_control_words.add(control_word)
            skip_groups = {'fonttbl', 'colortbl', 'expandedcolortbl', 'generator', 'stylesheet', 'info', 'fldinst'}
            if control_word in skip_groups:
                current_skip = True
                
            if not current_skip:
                if control_word == 'par' or control_word == 'line':
                    tokens.append('\n')
                elif control_word == 'u' and control_value is not None:
                    val = control_value
                    if val < 0:
                        val += 65536
                    tokens.append(chr(val))
                    skip_chars = uc_value
                elif control_word == 'uc' and control_value is not None:
                    uc_value = control_value
            continue
        else:
            # Ignore literal newline characters in RTF (they are just formatting whitespace in the RTF code itself)
            if c not in '\r\n':
                if not current_skip:
                    tokens.append(c)
            i += 1
    return "".join(tokens)

base_dir = '/Users/aditya_nistala/Downloads/Brhad_Upa_Class_Notes/Class Coverage Notes'

with open(os.path.join(base_dir, 'Devanagari/Brhad_Upa_Class_7_Dev.rtf'), 'r', encoding='latin1') as f:
    text_7 = f.read()

print("--- CLASS 7 DEVANAGARI ---")
print(rtf_to_text(text_7)[:1500])

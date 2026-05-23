import os
import subprocess
import time
import re

# Classes 1 to 10 configuration
CLASSES = range(1, 11)

AUDIO_DIR = "/Users/aditya_nistala/Downloads/Brhad_Upa_Class_Notes/MP3 Files"
BASE_DIR = "/Users/aditya_nistala/.gemini/antigravity/scratch/vedantic-archive"

def run_command(cmd):
    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
    return result

def check_exists(identifier):
    # Check if the identifier already exists on Archive.org
    cmd = ["ia", "metadata", identifier]
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.returncode == 0

def upload_class(n):
    nn = f"{n:02d}"
    identifier = f"vedantic-archive-brhad-2-4-class-{nn}"
    file_path = os.path.join(AUDIO_DIR, f"Brhad_2-4_Class_{nn}.mp3")
    
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return False
        
    if check_exists(identifier):
        print(f"Identifier {identifier} already exists on Archive.org, skipping upload.")
        return True
        
    title = f"Bṛhadāraṇyaka Upaniṣad 2.4 — Maitreyī Brāhmaṇa, Class {n} (Swami Shankarananda Saraswati)"
    description = f"Class {n} of the Maitreyī Brāhmaṇa (Bṛhadāraṇyaka Upaniṣad 2.4) taught by Swami Shankarananda Saraswati. Student-prepared study archive at https://nkaditya1729.github.io/vedantic-archive/"
    
    cmd = [
        "ia", "upload", identifier, file_path,
        "--metadata=mediatype:audio",
        f"--metadata=title:{title}",
        "--metadata=creator:Swami Shankarananda Saraswati",
        "--metadata=subject:Vedanta",
        "--metadata=subject:Upanishad",
        "--metadata=subject:Advaita Vedanta",
        "--metadata=subject:Sanskrit",
        "--metadata=subject:Brihadaranyaka Upanishad",
        f"--metadata=description:{description}",
        "--metadata=language:san",
        "--metadata=language:eng",
        "--metadata=licenseurl:https://creativecommons.org/licenses/by-nc-nd/4.0/"
    ]
    
    print(f"Uploading Class {n} to Archive.org...")
    result = run_command(cmd)
    if result.returncode == 0:
        print(f"Successfully uploaded Class {n}!")
        return True
    else:
        print(f"Failed to upload Class {n}!")
        return False

def update_frontmatter_urls():
    base_path = os.path.join(BASE_DIR, "src/content/classes/brhadaranyaka/2-4")
    
    for n in CLASSES:
        nn = f"{n:02d}"
        url = f"https://archive.org/download/vedantic-archive-brhad-2-4-class-{nn}/Brhad_2-4_Class_{nn}.mp3"
        
        for suffix in ["dev", "iast"]:
            path = os.path.join(base_path, f"class-{nn}.{suffix}.md")
            if not os.path.exists(path):
                print(f"NOT FOUND: {path}")
                continue
                
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
                
            # Replace audio_url
            # Handle quoted or unquoted values
            new_content = re.sub(
                r'audio_url:.*',
                f'audio_url: "{url}"',
                content
            )
            
            with open(path, "w", encoding="utf-8") as f:
                f.write(new_content)
                
            print(f"Updated audio_url in class-{nn}.{suffix}.md")

def main():
    print("Starting Archive.org uploads...")
    all_success = True
    for n in CLASSES:
        success = upload_class(n)
        if not success:
            all_success = False
            # Break or continue? Continue in case other files can be uploaded, but mark failure.
            
    print("\nUpdating markdown frontmatter with Archive.org streaming URLs...")
    update_frontmatter_urls()
    
    if all_success:
        print("\nAll audio uploads and markdown updates complete!")
    else:
        print("\nCompleted with some upload failures. Please review logs.")

if __name__ == "__main__":
    main()

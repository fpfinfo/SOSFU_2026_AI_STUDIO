
import os
import re


def replace_in_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    replacements = {
        r'purple': 'emerald',
        r'violet': 'teal',
        r'fuchsia': 'cyan',
        r'#9333EA': '#10b981',
        r'#A855F7': '#06b6d4',
        r'#8B5CF6': '#14b8a6'
    }

    new_content = content
    for pattern, replacement in replacements.items():
        new_content = re.sub(pattern, replacement,
                             new_content, flags=re.IGNORECASE)

    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    return False


def main():
    base_dir = r"c:\Users\fabio.freitas\Documents\GitHub\SOSFU_2026_AI_STUDIO-claude-improve-fund-services-wGWdK\components"
    count = 0
    for root, dirs, files in os.walk(base_dir):
        for file in files:
            if file.endswith('.tsx'):
                if replace_in_file(os.path.join(root, file)):
                    count += 1
    print(f"Fixed {count} files.")


if __name__ == "__main__":
    main()

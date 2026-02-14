#!/usr/bin/env python3
"""
Fix missing Link imports
"""

import os
import re

def fix_link_import(filepath):
    """Add Link import if file uses <Link> but doesn't import it"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check if file uses <Link> but doesn't import it
        uses_link = re.search(r'<Link\s', content)
        has_link_import = re.search(r'import\s+.*Link.*from\s+[\'"]next/link[\'"]', content)
        
        if uses_link and not has_link_import:
            # Add Link import
            # Try different insertion points
            if re.search(r"['\"]use client['\"]", content):
                # Add after 'use client'
                content = re.sub(
                    r"(['\"]use client['\"];?\n)",
                    r"\1import Link from 'next/link';\n",
                    content,
                    count=1
                )
            elif re.search(r"import .* from ['\"]next/", content):
                # Add after another next import
                content = re.sub(
                    r"(import .* from ['\"]next/[^'\"]*['\"];?\n)",
                    r"\1import Link from 'next/link';\n",
                    content,
                    count=1
                )
            elif re.search(r"import .* from ['\"]react['\"]", content):
                # Add after react import
                content = re.sub(
                    r"(import .* from ['\"]react['\"];?\n)",
                    r"\1import Link from 'next/link';\n",
                    content,
                    count=1
                )
            elif re.search(r"^import ", content, re.MULTILINE):
                # Add after first import
                content = re.sub(
                    r"(^import .*;\n)",
                    r"\1import Link from 'next/link';\n",
                    content,
                    count=1
                )
            else:
                # Add at the top
                content = "import Link from 'next/link';\n\n" + content
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            
            return True
        
        return False
        
    except Exception as e:
        print(f"  Error processing {filepath}: {e}")
        return False


def main():
    """Main function"""
    root_dir = r"c:\APPS\Union_Eyes_app_v1"
    
    # Directories to process
    dirs_to_process = [
        "app",
        "components"
    ]
    
    fixed_count = 0
    
    print("🔗 Fixing missing Link imports...")
    print("")
    
    for dir_name in dirs_to_process:
        dir_path = os.path.join(root_dir, dir_name)
        if not os.path.exists(dir_path):
            continue
        
        # Walk through all files
        for root, dirs, files in os.walk(dir_path):
            for file in files:
                if file.endswith(('.tsx', '.jsx')):
                    filepath = os.path.join(root, file)
                    
                    if fix_link_import(filepath):
                        fixed_count += 1
                        rel_path = os.path.relpath(filepath, root_dir)
                        print(f"  ✓ {rel_path}")
    
    print("")
    print(f"📊 Summary:")
    print(f"  Files fixed: {fixed_count}")
    print("")
    print("✅ Link import fix complete!")


if __name__ == "__main__":
    main()

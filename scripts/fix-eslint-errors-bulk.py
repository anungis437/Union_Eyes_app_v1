#!/usr/bin/env python3
"""
Bulk fix ESLint errors
Fixes: react/no-unescaped-entities and @next/next/no-html-link-for-pages
"""

import os
import re
import sys

def fix_file(filepath):
    """Fix ESLint errors in a single file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Fix 1: Replace unescaped apostrophes
        replacements = [
            ("don't", "don&apos;t"),
            ("Don't", "Don&apos;t"),
            ("won't", "won&apos;t"),
            ("Won't", "Won&apos;t"),
            ("can't", "can&apos;t"),
            ("Can't", "Can&apos;t"),
            ("we're", "we&apos;re"),
            ("We're", "We&apos;re"),
            ("they're", "they&apos;re"),
            ("They're", "They&apos;re"),
            ("you're", "you&apos;re"),
            ("You're", "You&apos;re"),
            ("it's", "it&apos;s"),
            ("It's", "It&apos;s"),
            ("that's", "that&apos;s"),
            ("That's", "That&apos;s"),
            ("what's", "what&apos;s"),
            ("What's", "What&apos;s"),
            ("there's", "there&apos;s"),
            ("There's", "There&apos;s"),
            ("I'm", "I&apos;m"),
            ("we'll", "we&apos;ll"),
            ("We'll", "We&apos;ll"),
            ("you'll", "you&apos;ll"),
            ("You'll", "You&apos;ll"),
            ("I'll", "I&apos;ll"),
            ("isn't", "isn&apos;t"),
            ("Isn't", "Isn&apos;t"),
            ("aren't", "aren&apos;t"),
            ("Aren't", "Aren&apos;t"),
            ("wasn't", "wasn&apos;t"),
            ("Wasn't", "Wasn&apos;t"),
            ("weren't", "weren&apos;t"),
            ("Weren't", "Weren&apos;t"),
            ("hasn't", "hasn&apos;t"),
            ("Hasn't", "Hasn&apos;t"),
            ("haven't", "haven&apos;t"),
            ("Haven't", "Haven&apos;t"),
            ("didn't", "didn&apos;t"),
            ("Didn't", "Didn&apos;t"),
            ("doesn't", "doesn&apos;t"),
            ("Doesn't", "Doesn&apos;t"),
            ("I'd", "I&apos;d"),
            ("we'd", "we&apos;d"),
            ("We'd", "We&apos;d"),
            ("you'd", "you&apos;d"),
            ("You'd", "You&apos;d"),
            ("he's", "he&apos;s"),
            ("He's", "He&apos;s"),
            ("she's", "she&apos;s"),
            ("She's", "She&apos;s"),
            ("let's", "let&apos;s"),
            ("Let's", "Let&apos;s"),
        ]
        
        for old, new in replacements:
            content = content.replace(old, new)
        
        # Fix 2: Replace <a href="/..."> with <Link href="/...">
        needs_link_import = False
        if re.search(r'<a\s+href="/', content):
            # Check if Link is already imported
            has_link_import = re.search(r'import\s+.*Link.*from\s+[\'"]next/link[\'"]', content)
            if not has_link_import:
                needs_link_import = True
            
            # Replace <a href="/path"> with <Link href="/path">
            content = re.sub(r'<a\s+href="(/[^"]*)"', r'<Link href="\1"', content)
            # Replace </a> with </Link>
            content = re.sub(r'</a>', '</Link>', content)
        
        # Add Link import if needed
        if needs_link_import:
            # Try to add after 'use client' or react import
            if re.search(r"['\"]use client['\"]", content):
                content = re.sub(
                    r"(['\"]use client['\"];?\n)",
                    r"\1import Link from 'next/link';\n",
                    content,
                    count=1
                )
            elif re.search(r"import .* from ['\"]react['\"]", content):
                content = re.sub(
                    r"(import .* from ['\"]react['\"];?\n)",
                    r"\1import Link from 'next/link';\n",
                    content,
                    count=1
                )
        
        # Save if modified
        if content != original_content:
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
        "components",
        "lib"
    ]
    
    fixed_count = 0
    total_count = 0
    
    print("🔧 Bulk Fixing ESLint Errors...")
    print("")
    
    for dir_name in dirs_to_process:
        dir_path = os.path.join(root_dir, dir_name)
        if not os.path.exists(dir_path):
            continue
        
        print(f"Processing {dir_name}/...")
        
        # Walk through all files
        for root, dirs, files in os.walk(dir_path):
            for file in files:
                if file.endswith(('.tsx', '.ts', '.jsx', '.js')):
                    filepath = os.path.join(root, file)
                    total_count += 1
                    
                    if fix_file(filepath):
                        fixed_count += 1
                        rel_path = os.path.relpath(filepath, root_dir)
                        print(f"  ✓ {rel_path}")
    
    print("")
    print(f"📊 Summary:")
    print(f"  Files processed: {total_count}")
    print(f"  Files fixed: {fixed_count}")
    print("")
    print("✅ Bulk fix complete!")


if __name__ == "__main__":
    main()

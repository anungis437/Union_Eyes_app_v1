#!/usr/bin/env python3
"""
Fix external links that have </Link> instead of </a>
"""

import os
import re

def fix_external_links(filepath):
    """Fix external links with wrong closing tags"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Find pattern: <a href="http" ... > ... </Link>
        # Replace </Link> with </a> when preceded by <a href="http/https/mailto
        
        # Pattern: <a href="external-url">...</a> should not become <a href="external-url">...</Link>
        # Look for <a href="http or <a href="mailto or <a href="tel
        # followed eventually by </Link> and replace with </a>
        
        # Use a more careful approach - split on '<a' and look for patterns
        parts = content.split('<a ')
        result = parts[0]
        
        for i in range(1, len(parts)):
            part = parts[i]
            
            # Check if this <a> tag has an external href
            href_match = re.match(r'\s*href="(https?://|mailto:|tel:)', part)
            
            if href_match:
                # This is an external link, find the first </Link> and replace with </a>
                part = part.replace('</Link>', '</a>', 1)
            
            result += '<a ' + part
        
        content = result
        
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
        "components"
    ]
    
    fixed_count = 0
    
    print("🔧 Fixing external link closing tags...")
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
                    
                    if fix_external_links(filepath):
                        fixed_count += 1
                        rel_path = os.path.relpath(filepath, root_dir)
                        print(f"  ✓ {rel_path}")
    
    print("")
    print(f"📊 Summary:")
    print(f"  Files fixed: {fixed_count}")
    print("")
    print("✅ External link fix complete!")


if __name__ == "__main__":
    main()

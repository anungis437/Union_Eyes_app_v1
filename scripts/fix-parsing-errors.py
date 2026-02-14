#!/usr/bin/env python3
"""
Fix parsing errors with duplicate function keyword and malformed parameters
"""

import os
import re

def fix_parsing_errors(filepath):
    """Fix parsing errors in a file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Fix 1: Duplicate "function function" keyword
        content = re.sub(
            r'\bfunction\s+function\s+',
            'function ',
            content
        )
        
        # Fix 2: Malformed parameter lists with stray type references
        # Pattern: function name(param: type, Type, param2: type)
        # Should be: function name(param: type, param2: type)
        # This is tricky, so let's just fix the most common pattern
        content = re.sub(
            r'(\w+)\((.*?,)\s*Record<string,\s*unknown>,\s*(\w+:\s*Array<Record<string,\s*unknown>>)',
            r'\1(\3',
            content
        )
        
        # Fix 3: async function function
        content = re.sub(
            r'\basync\s+function\s+function\s+',
            'async function ',
            content
        )
        
        # Fix 4: export function function
        content = re.sub(
            r'\bexport\s+function\s+function\s+',
            'export function ',
            content
        )
        
        # Fix 5: export async function function
        content = re.sub(
            r'\bexport\s+async\s+function\s+function\s+',
            'export async function ',
            content
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
        "lib",
        "components"
    ]
    
    fixed_count = 0
    
    print("🔧 Fixing parsing errors...")
    print("")
    
    for dir_name in dirs_to_process:
        dir_path = os.path.join(root_dir, dir_name)
        if not os.path.exists(dir_path):
            continue
        
        print(f"Processing {dir_name}/...")
        
        # Walk through all files
        for root, dirs, files in os.walk(dir_path):
            for file in files:
                if file.endswith(('.ts', '.tsx', '.js', '.jsx')):
                    filepath = os.path.join(root, file)
                    
                    if fix_parsing_errors(filepath):
                        fixed_count += 1
                        rel_path = os.path.relpath(filepath, root_dir)
                        print(f"  ✓ {rel_path}")
    
    print("")
    print(f"📊 Summary:")
    print(f"  Files fixed: {fixed_count}")
    print("")
    print("✅ Parsing error fix complete!")


if __name__ == "__main__":
    main()

# Archived Obsolete Migrations

This directory contains migration files that are no longer active but are kept for historical reference.

## Archived Files

### CLC Hierarchy System Migrations (044)

**Date Archived:** February 6, 2026

The following obsolete versions of the CLC hierarchy migration were archived:

- `044_clc_hierarchy_system_BROKEN.sql` - Initial version that had schema conflicts
- `044_clc_hierarchy_system_OLD.sql` - Deprecated version superseded by CLEAN version
- `044_clc_hierarchy_system_v2.sql` - Intermediate version during refactoring

**Active Versions:**
- `044_clc_hierarchy_system.sql` - Current active migration
- `044_clc_hierarchy_system_CLEAN.sql` - Clean version referenced by dependent migrations

**Reason:** Multiple iterations during development left duplicate migration files with different suffixes. The CLEAN version is functionally identical to the main version and is referenced by migration 050.

## Guidelines

- **Do NOT run** migrations in this archive folder
- These files are kept for:
  - Historical reference
  - Understanding schema evolution
  - Debugging legacy issues
  
- When creating new migrations:
  - Use sequential numbering without suffixes
  - Delete failed migrations rather than marking them BROKEN
  - Use version control (git) for history, not file suffixes

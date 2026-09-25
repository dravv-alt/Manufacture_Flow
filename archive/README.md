# Archive

This directory contains source snapshots that are no longer part of the active
application path but are retained for traceability. Archived source files are
named with a `.legacy` or `.txt` suffix and begin with a comment identifying
them as redundant/legacy code. They must not be imported by active routes,
components, or build scripts.

Active demo data, runtime providers, deployment files, research documents, and
the presentation generator remain in their live locations because they are
still referenced or are project deliverables.

## Current contents

- `legacy-ui/`: replaced page and component implementations retained for
  historical comparison.
- `legacy-ui/demo-data-provider.legacy.ts.txt`: unused pre-persistence demo
  provider retained for rollback/reference only.

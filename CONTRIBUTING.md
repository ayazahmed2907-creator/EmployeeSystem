# Contributing

## Workflow

1. Create a focused branch from `main`.
2. Keep changes small and reviewable.
3. Test the browser UI and PHP/MySQL integration locally when relevant.
4. Do not commit credentials, database dumps, generated files, or local configuration.
5. Open a pull request with a concise summary and testing notes.

## PHP / database changes

- Keep credentials out of source control.
- Document schema or setup changes.
- Validate database operations against a local development database before opening a pull request.
- Avoid destructive schema operations in application startup code.

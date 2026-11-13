@AGENTS.md

## Never run a local server
Never start a local dev or test server: no `pnpm dev`, `next dev`, `next start`, or anything else that listens on a port, not even in the background. Verify with `pnpm typecheck` and `pnpm test`; the user runs the app themselves.
Why: this is an 8 GB laptop and several agent sessions work in this repo at once; each extra Turbopack server (~0.6 GB, a full CPU core) makes the machine crawl.

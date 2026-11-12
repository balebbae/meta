# meta

Facebook-style UI clone built as an installable PWA (desktop + mobile) with React 19, TypeScript, Vite and the [Astryx](https://github.com/meta/astryx) design system.

## Develop

```sh
pnpm install
pnpm dev          # http://localhost:5173
pnpm build        # type-check + production build (dist/)
pnpm preview      # serve dist/ with the service worker
pnpm lint
pnpm astryx doctor --built src   # Astryx usage check
```

## PWA

`vite-plugin-pwa` generates the manifest and a Workbox service worker (`autoUpdate`). App shell assets are precached; avatar/photo CDN images use stale-while-revalidate. Install from the browser's "Install app" / "Add to Home Screen" prompt.

# Keyboard Shortcut Map

Lightweight React/Vite app to document what every key does across layers and layouts. Notes live per key and stay in localStorage with import/export for backup.

## How to use
- Install and run: `npm install` then `npm run dev` (build: `npm run build`, preview: `npm run preview`).
- Pick a layout (`full`, `tkl`, `60`, ...), select a layer, click a key, type a description. Status auto-switches to `used` when you type.
- Switch profiles to keep separate sets; layout changes keep data on matching key IDs. Import/Export JSON from the header buttons.

## Use cases (download/offline)
- Export your notes and share or restore them on another machine.
- Build and install as a PWA/offline bundle from the production build (`dist`) if you want a download-and-use copy.

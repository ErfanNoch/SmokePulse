# SmokePulse

[![License: MIT](https://img.shields.io/badge/License-MIT-amber.svg)](LICENSE)
[![React 19](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-purple.svg)](https://vitejs.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8.svg)](https://tailwindcss.com/)
[![Dexie.js](https://img.shields.io/badge/Storage-IndexedDB_%2F_Dexie.js-emerald.svg)](https://dexie.org/)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable-orange.svg)](https://web.dev/progressive-web-apps/)

SmokePulse is a privacy-first, offline-first smoking habit and expense tracker designed around physical pocket inventory management, interactive calendar visualization, craving trigger analytics, and serverless peer-to-peer (P2P) synchronization.

All data resides directly inside the browser via IndexedDB (Dexie.js). No accounts, external databases, cloud telemetry, or third-party trackers are used.

---

## Philosophy & Core Principles

- **Zero Cloud Dependency**: Your health and expense data belongs solely to you. Everything is stored locally on your device.
- **Eviction-Resistant Persistence**: Automatically requests browser storage persistence (`navigator.storage.persist()`) to protect against mobile OS cache cleanup.
- **Serverless Multi-Device Sync**: Connect multiple devices (e.g., phone and laptop) directly via WebRTC DataChannels using Conflict-Free Replicated Data Types (CRDT).
- **Tactile & Responsive**: Minimalist interface built with high-contrast typography, haptic sound synthesis via Web Audio API, and zero latency.

---

## Key Features

### Pocket Inventory & Consumption Tracking
- **Live Inventory Ledger**: Tracks remaining sticks in your active pack as well as total pocket reserves in real time.
- **Quick & Detailed Logging**: Record +1 stick with instant tactile sound feedback, or log with contextual metadata (craving triggers, mood, and notes).
- **Pack Restock Automation**: Automatically recalculates pack reserves and unit cost per stick upon recording a pack purchase.
- **Physical Stock Calibration**: Quickly sync digital records with physical inventory at any time.

### Calendar & Daily History
- **Visual Compliance Grid**: Color-coded calendar days based on adherence to your custom daily limit.
- **Day Details Modal**: Chronological timestamps, expense breakdown, and pack purchase markers.
- **Retroactive Logging**: Add, edit, or delete past entries to keep historical records accurate.

### Habit Analytics & Financial Modeling
- **24-Hour Peak Heatmap**: Pinpoints high-risk hours throughout the day where cravings peak.
- **Trigger Distribution**: Categorizes and visualizes primary smoking contexts (work breaks, stress, post-meal, social routines).
- **Expense Pace & Savings Simulator**: Tracks 6-month historical expenditure trends with dynamic projections based on reduction targets.

### Serverless P2P Sync (WebRTC + CRDT)
- **Direct Device-to-Device**: Communicates directly over WebRTC DataChannels using PeerJS.
- **Dual Pairing Options**: Pair via camera QR code scan or a readable 9-character code (`SP-XXXXXX`).
- **Conflict-Free Replicated Data Types (CRDT)**: Deterministic Last-Write-Wins (LWW) merge algorithm guarantees that concurrent updates on multiple devices resolve without data loss or corruption.
- **Real-Time Live Broadcast**: Logs and pack purchases recorded on one device reflect immediately on connected peers.

### Progressive Web App (PWA)
- **Installable**: Full standalone app experience across iOS, Android, macOS, and Windows.
- **Workbox Offline Pre-caching**: Immediate cold-start loading with offline service worker support via `vite-plugin-pwa`.
- **In-App Install Prompt**: Built-in install banner with step-by-step guidance for iOS Safari users.
- **Offline Indicator**: Subtle status badge when working disconnected from network access.

### Privacy & Vault Security
- **4-Digit Local PIN Lock**: Optional vault lock to secure logs when sharing your device.
- **Multi-Profile Support**: Switch between multiple profiles with independent limits and currencies.
- **Open Data Portability**: Export and import complete ledgers as unencrypted JSON backups anytime.
- **Adaptive Theming**: Smooth light and dark mode support with Tailwind CSS v4 custom variants.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | React 19, TypeScript |
| **Bundler** | Vite 6 |
| **Styling** | Tailwind CSS v4, Motion |
| **Storage Engine** | IndexedDB via Dexie.js |
| **P2P Networking** | PeerJS (WebRTC DataChannels) |
| **Sync Algorithm** | Last-Write-Wins (LWW) CRDT |
| **PWA & Offline** | Workbox, `vite-plugin-pwa` |
| **Audio** | Web Audio API Synthesizer |
| **Icons** | Lucide React |

---

## Architecture Overview

```
src/
├── components/             # React presentation components
│   ├── p2p/                # WebRTC pairing modal, QR display & camera scanner
│   ├── theme-provider.tsx  # React 19 theme provider (zero-script injection)
│   ├── PWAInstallButton.tsx# Multi-platform PWA install prompt
│   ├── OfflineIndicator.tsx# Connection state monitor
│   └── ...                 # Dashboard, Calendar, Habits, Wallet views
├── hooks/
│   ├── useP2PSync.ts       # React hook managing WebRTC connection & CRDT merge
│   └── usePWAInstall.ts    # React hook for beforeinstallprompt & standalone state
├── lib/
│   ├── db.ts               # Dexie.js schema definition & storage persistence
│   ├── storage.ts          # Storage manager, snapshot backup & migration logic
│   ├── crdt.ts             # Deterministic Last-Write-Wins CRDT engine
│   ├── audio.ts            # Tactile click & chime synthesizer
│   ├── dateUtils.ts        # Local calendar computation & timestamp helpers
│   └── p2p/
│       ├── peerService.ts  # WebRTC coordinator with STUN fallback
│       └── types.ts        # P2P packet protocols (HELLO, SYNC, LIVE_STREAM)
└── types/
    └── index.ts            # Core TypeScript interfaces & domain models
```

---

## Getting Started

### Prerequisites
- Node.js 18.0 or higher
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/smokepulse.git
cd smokepulse

# Install dependencies
npm install

# Start local development server (runs on port 3000)
npm run dev
```

### Production Build

```bash
# Type check and build production bundle
npm run build

# Preview production build locally
npm run preview
```

---

## Deployment

SmokePulse is a purely static client-side single-page application and can be hosted on any static hosting provider.

### Netlify
The repository includes `netlify.toml` and `public/_redirects` for automatic SPA routing:
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```
Simply connect your repository to Netlify with build command `npm run build` and publish directory `dist`.

### Vercel / Cloudflare Pages / GitHub Pages
Build output is generated into the `dist/` directory. Configure single-page rewrite rules to route all paths to `/index.html`.

---

## Contributing

Contributions from the open-source community are welcome!

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/amazing-feature`.
3. Keep code clean and modular with concise comments.
4. Run `npm run lint` and `npm run build` to verify there are no compilation or type errors.
5. Commit your changes: `git commit -m "Add amazing feature"`.
6. Push to your branch: `git push origin feature/amazing-feature`.
7. Open a Pull Request.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

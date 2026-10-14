# SmokePulse

SmokePulse is a privacy-first, offline-first smoking habit and expense tracker designed around live pocket inventory management, interactive calendar visualization, craving trigger analytics, and direct peer-to-peer (P2P) synchronization.

All data resides directly inside the user's browser via IndexedDB (Dexie.js). No external cloud database, user account, or third-party tracking services are required.

---

## Key Features

### Pocket Inventory & Consumption Ledger
- Real-Time Stick Countdown: Tracks remaining sticks in your active pack and total pocket reserves in real time.
- Quick & Detailed Logging: Record +1 stick with instant tactile audio feedback, or log with contextual metadata including craving trigger, mood, and personal reflection notes.
- Pack Restock Automation: Automatically recalculates reserve inventory and unit cost per stick upon recording a pack purchase.
- Physical Stock Calibration: Correct digital counts against physical pocket inventory at any time.

### Calendar & Daily History
- Color-Coded Status: Visually tracks daily compliance against your custom daily stick limit.
- Detailed Daily Breakdown: Chronological timestamped logs, daily expenditure, and pack replenishment markers.
- Retrospective Logging: Ability to add or delete past records to keep history accurate.

### Habit Analytics & Financial Modeling
- 24-Hour Peak Heatmap: Pinpoints high-risk hours throughout the day where cravings peak.
- Trigger Distribution: Visualizes percentage breakdowns of primary smoking contexts (e.g., work breaks, stress, post-meal, social routines).
- Expense Tracking & Reduction Simulator: 6-month historical expenditure trends with dynamic savings projections based on gradual reduction goals.

### Local Database Architecture (Dexie.js)
- IndexedDB Engine: Utilizes Dexie.js for typed, indexed local storage with sub-millisecond query performance.
- Persistent Storage API: Automatically requests eviction immunity via `navigator.storage.persist()` to safeguard local data against automatic browser cache clearing on mobile devices and Safari WebKit.
- Zero-Loss Auto-Migration: Upgrades existing datasets from previous schema versions without data loss.

### Multi-Device P2P Synchronization (WebRTC & CRDT)
- Serverless WebRTC Sync: Direct device-to-device communication using PeerJS over WebRTC DataChannels.
- Dual Handshake Support: Pair devices using either camera QR code scanning or a 6-character human-readable pairing code.
- Conflict-Free Replicated Data Type (CRDT): Employs a mathematical Last-Write-Wins (LWW) merge algorithm, ensuring concurrent modifications on different devices resolve deterministically without data corruption or loss.
- Live Real-Time Broadcast: Live logs and pack purchases recorded on one device reflect immediately on connected peers.

### Progressive Web App (PWA)
- Installable Application: Can be installed as a standalone app on iOS, Android, macOS, and Windows.
- Full Offline Capability: Powered by Workbox service workers via `vite-plugin-pwa` for immediate cold starts without internet access.
- In-App Install Prompt: Integrated install triggers with native guidance for iOS Safari users.
- Network State Awareness: Displays a non-intrusive indicator when working entirely offline.

### Privacy & Security
- 4-Digit Local PIN Lock: Optional vault protection with automatic lockout on profile switch.
- Offline JSON Backup: Export and import complete ledgers in open JSON format at any time.
- Adaptive Theming: Instant dark/light mode powered by `next-themes` and Tailwind CSS v4 custom variants.

---

## Architecture Overview

```
src/
├── lib/
│   ├── db.ts               # Dexie.js database schema and persistent storage helpers
│   ├── storage.ts          # Central storage manager with migration logic
│   ├── crdt.ts             # Deterministic Last-Write-Wins (LWW) CRDT merge engine
│   └── p2p/
│       ├── types.ts        # P2P packet protocols (HELLO, SYNC, LIVE_STREAM)
│       └── peerService.ts  # WebRTC connection coordinator with STUN fallback
├── hooks/
│   ├── useP2PSync.ts       # React state management for P2P connection lifecycle
│   └── usePWAInstall.ts    # PWA install prompt and standalone mode detection
└── components/
    ├── p2p/
    │   ├── P2PSyncModal.tsx# Responsive P2P pairing modal (Host/Join/Live)
    │   ├── QRDisplay.tsx   # High-contrast SVG QR code generator
    │   └── QRScanner.tsx   # Camera-based QR code reader (html5-qrcode)
    ├── PWAInstallButton.tsx# Install trigger for desktop, Android, and iOS
    └── OfflineIndicator.tsx# Connectivity status notification
```

---

## Local Development

### Prerequisites
- Node.js 18.0 or higher
- npm or pnpm

### Getting Started

```bash
# 1. Clone repository and install dependencies
npm install

# 2. Run local development server (runs on port 3000)
npm run dev

# 3. Type check and build production distribution
npm run build
```

---

## Deployment (Netlify)

This application is pre-configured for single-page application (SPA) hosting with `netlify.toml` and `public/_redirects`.

### Method 1: Git-Based Deployment (Recommended)
1. Push this repository to GitHub, GitLab, or Bitbucket.
2. In the Netlify console, select **Add new site** → **Import an existing project**.
3. Link the repository. Build configurations are detected automatically:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
4. Click **Deploy Site**.

### Method 2: Manual Drag & Drop
1. Generate the production bundle locally:
   ```bash
   npm run build
   ```
2. Navigate to [app.netlify.com/drop](https://app.netlify.com/drop).
3. Drag and drop the `dist` directory into the browser window.

---

## License & Privacy

SmokePulse operates 100% client-side. No user behavior telemetry, biometric data, or consumption logs are transmitted to external servers.

# Graph Report - qr-camera-web  (2026-09-21)

## Corpus Check
- 17 files · ~10,416 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 4, .example 1, .lock 1)

## Summary
- 173 nodes · 212 edges · 12 communities (10 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cb9f508a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App.tsx
- package.json
- compilerOptions
- QR Camera Web
- server.ts
- dependencies
- devDependencies
- Docker Deployment Guide
- scripts
- CLAUDE.md
- ScannerTab.tsx
- docker-entrypoint.sh

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `QR Camera Web` - 9 edges
3. `scripts` - 8 edges
4. `Docker Deployment Guide` - 8 edges
5. `ScannerTab()` - 7 edges
6. `react` - 5 edges
7. `Troubleshooting` - 5 edges
8. `lucide-react` - 4 edges
9. `VideoItem` - 4 edges
10. `getAudioContext()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `DashboardTabProps` --references--> `VideoItem`  [EXTRACTED]
  src/components/DashboardTab.tsx → src/types.ts
- `DashboardTab()` --calls--> `formatBytes()`  [EXTRACTED]
  src/components/DashboardTab.tsx → src/utils/audio.ts
- `ScannerTab()` --calls--> `formatDuration()`  [EXTRACTED]
  src/components/ScannerTab.tsx → src/utils/audio.ts
- `ScannerTab()` --calls--> `playErrorBeep()`  [EXTRACTED]
  src/components/ScannerTab.tsx → src/utils/audio.ts
- `ScannerTab()` --calls--> `playStartBeep()`  [EXTRACTED]
  src/components/ScannerTab.tsx → src/utils/audio.ts

## Import Cycles
- None detected.

## Communities (12 total, 2 thin omitted)

### Community 0 - "App.tsx"
Cohesion: 0.21
Nodes (12): lucide-react, react, react-dom, App(), DashboardTab(), DashboardTabProps, src_index, CameraDevice (+4 more)

### Community 1 - "package.json"
Cohesion: 0.09
Nodes (23): name, private, type, version, autoprefixer, dotenv, esbuild, @google/genai (+15 more)

### Community 2 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+8 more)

### Community 3 - "QR Camera Web"
Cohesion: 0.11
Nodes (16): API Endpoints, Cài đặt và chạy, Cách 1: Docker (Khuyến nghị - Tự động 100%), Cách 2: Chạy trực tiếp (Node.js), Cấu trúc thư mục, Ghi chú kỹ thuật, HTTPS và Camera, License (+8 more)

### Community 4 - "server.ts"
Cohesion: 0.08
Nodes (24): certPath, { execSync }, fs, ips, keyPath, os, path, sslDir (+16 more)

### Community 5 - "dependencies"
Cohesion: 0.14
Nodes (14): dependencies, cors, dotenv, express, @google/genai, html5-qrcode, lucide-react, motion (+6 more)

### Community 7 - "devDependencies"
Cohesion: 0.17
Nodes (12): devDependencies, autoprefixer, esbuild, tailwindcss, tsx, @types/cors, @types/express, @types/multer (+4 more)

### Community 8 - "Docker Deployment Guide"
Cohesion: 0.11
Nodes (18): 1. Build và chạy production, 2. Truy cập ứng dụng, 3. Quản lý container, Container không start, Cấu trúc, Docker Deployment Guide, Log Rotation, Multi-stage Dockerfile (+10 more)

### Community 9 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, clean, dev, lint, preview, ssl, start

### Community 11 - "ScannerTab.tsx"
Cohesion: 0.32
Nodes (11): getRecordingFormat(), RecordingFormat, RecordingSession, resolveRecordedFormat(), ScannerTab(), ScannerTabProps, formatDuration(), getAudioContext() (+3 more)

## Knowledge Gaps
- **108 isolated node(s):** `docker-entrypoint.sh script`, `fs`, `path`, `os`, `{ execSync }` (+103 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 118 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.095) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Why does `react` connect `App.tsx` to `package.json`, `ScannerTab.tsx`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **What connects `docker-entrypoint.sh script`, `fs`, `path` to the rest of the system?**
  _108 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.08666666666666667 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `QR Camera Web` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._
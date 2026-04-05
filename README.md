# AI ImageProc

AI-powered image processing application with configurable local/cloud backends.

## Features

- 🎨 **Canvas Editor** - Fabric.js based image editing with masks
- 🤖 **Multiple KI Backends** - OpenAI, Ollama, OpenRouter (configurable)
- 👁️ **Vision Support** - Automatic detection of vision-capable models
- ↔️ **Before/After View** - Slider comparison of original and processed images
- 🖌️ **Selection Tools** - Brush, Rectangle, Ellipse, Lasso, Magic Wand
- 💾 **Local Storage** - SQLite-based project management with auto-save
- 🔄 **Undo/Redo** - Full edit history
- 📤 **GitHub Export** - Manual sync to GitHub repository

## Tech Stack

- **Framework**: Electron 28 + Vite + React 18 + TypeScript 5
- **Canvas**: Fabric.js 6
- **State Management**: Zustand
- **KI Backends**: OpenAI, Ollama, OpenRouter
- **Storage**: Electron safeStorage + SQLite
- **Testing**: Jest + Playwright

## Prerequisites

- Node.js 18+
- npm or yarn
- Ollama (optional, for local KI)

## Installation

```bash
# Clone repository
git clone https://github.com/ydmw74/aiimageproc.git
cd aiimageproc

# Install dependencies
npm install

# Start development
npm run dev
```

## Development

```bash
# Start development mode
npm run dev

# Build for production
npm run build

# Run tests
npm test
npm run test:e2e

# Lint and format
npm run lint
npm run format
```

## Configuration

### KI Providers

The application supports multiple KI providers:

1. **OpenAI** - GPT-4o Vision, DALL-E 3
2. **Ollama** - Local models (llava, qwen-vl, bakllava)
3. **OpenRouter** - Access to multiple models

Configure providers in the Settings panel or via environment variables.

## Project Structure

```
aiimageproc/
├── electron/           # Electron Main Process
│   ├── main.ts
│   └── preload.ts
├── src/                # React Renderer
│   ├── components/     # UI Components
│   ├── services/       # KI Backends, Storage
│   ├── store/          # Zustand Store
│   ├── types/          # TypeScript Types
│   └── utils/          # Helpers
├── tests/              # Test Files
├── build/              # Build Assets (icons)
└── release/            # Build Output
```

## License

MIT

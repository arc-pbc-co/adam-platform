<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Arc Impact - ADAM Platform

**Autonomous Discovery and Advanced Manufacturing**

The world's first end-to-end AI materials discovery through to advanced manufacturing platform. ADAM is an AI orchestrator that controls physical hardware (Desktop Metal binder jetting printers) to run autonomous materials experiments in closed loops.

View your app in AI Studio: https://ai.studio/apps/drive/1Jsp65dDojt1dmaVdRs-HW2Ebu4ucryKL

## Features

- 🤖 **AI Orchestrator**: Planner-Executor-Critic agent powered by Google Gemini
- 🔬 **Materials Discovery**: Design experiments for rare-earth-free magnets, solid-state batteries, and more
- 🏭 **Hardware Integration**: Direct control of Desktop Metal binder jetting fleet
- 📊 **High Throughput**: 200+ experiments per week vs traditional 10/week
- 💬 **Interactive Terminal**: Chat interface to query ADAM and request experiments
- 📈 **Real-time Analytics**: Performance charts and experiment tracking

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Charts**: Recharts
- **AI**: Google Gemini 2.0 Flash

## Run Locally

**Prerequisites:** Node.js 18+ and npm

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd adam-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and add your Gemini API key:
   ```
   GEMINI_API_KEY=your_actual_api_key_here
   ```

   Get your API key from: https://ai.google.dev/

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**

   Navigate to `http://localhost:3000`

## Build for Production

```bash
npm run build
npm run preview
```

## Project Structure

```
adam-platform/
├── backend/                  # Nova backend infrastructure (NEW)
│   ├── api-gateway/         # REST API + WebSocket server
│   ├── nova/                # Nova orchestrator (placeholder)
│   ├── config/              # Configuration files
│   └── docker/              # Docker initialization scripts
├── components/
│   ├── AdamTerminal.tsx      # Interactive AI chat terminal
│   ├── PerformanceChart.tsx  # Throughput comparison chart
│   ├── ProductShowcase.tsx   # Hardware fleet showcase
│   └── ErrorBoundary.tsx     # Error handling component
├── services/
│   └── geminiService.ts      # Gemini API integration
├── scripts/                  # Helper scripts (NEW)
├── App.tsx                   # Main application component
├── index.tsx                 # Application entry point
├── index.html                # HTML template
├── index.css                 # Global styles and animations
├── docker-compose.yml        # Backend orchestration (NEW)
└── vite.config.ts            # Vite configuration
```

## 🚀 NEW: Backend Infrastructure

The ADAM Platform now includes a complete Nova backend infrastructure! See [BACKEND_SETUP.md](BACKEND_SETUP.md) for details.

**Quick Start Backend:**
```bash
# Setup environment
cp .env.backend.example .env.backend
# Edit .env.backend and add your API keys

# Start all backend services
./scripts/start-backend.sh

# Access services
# - API Gateway: http://localhost:3200
# - Grafana: http://localhost:3001
# - Prometheus: http://localhost:9090
```

**What's Included:**
- ✅ PostgreSQL + TimescaleDB databases
- ✅ Qdrant vector database for materials
- ✅ NATS event-driven messaging
- ✅ Redis caching layer
- ✅ Prometheus + Grafana monitoring
- ✅ REST API + WebSocket gateway
- ⚠️ Nova orchestrator (placeholder - ready for integration)

See [PHASE_1_COMPLETE.md](PHASE_1_COMPLETE.md) for full details.

## Key Components

### ADAM Terminal
Interactive chat interface where users can:
- Request experiment designs
- Query material databases
- Get analysis of results
- Control the manufacturing pipeline

### Hardware Fleet
Integrated Desktop Metal systems:
- **X25 Pro™**: Agile volume production
- **Shop System™**: Batch production workhorse
- **X160 Pro™**: Heavy industrial ceramic printing
- **InnoventX™**: Open architecture R&D
- **ETEC Xtreme 8K**: Top-down DLP polymer printing

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google Gemini API key for AI orchestrator | Yes |

## Troubleshooting

### API Key Issues
- Ensure your API key is valid and has not expired
- Check that billing is enabled for your Google Cloud project
- Verify the key is correctly set in `.env.local`

### Build Errors
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Ensure you're using Node.js 18 or higher: `node --version`

### Terminal Not Responding
- Check browser console for errors
- Verify API key is set correctly
- Check network connectivity

## License

© 2025 Arc Public Benefit Corp. All rights reserved.

## Contact

For questions or support, please contact Arc Impact.

# ADAM Platform - Quickstart Guide

Get the ADAM Platform running in **under 10 minutes**!

---

## 🚀 Prerequisites Check

Before you begin, you need:

### 1. Node.js & npm

Check if installed:
```bash
node --version
npm --version
```

**If not installed**, install via one of these methods:

**Option A: Direct Download** (Easiest)
1. Go to: https://nodejs.org/
2. Download **LTS version** (v18 or newer)
3. Run installer
4. Verify: `node --version`

**Option B: Homebrew** (macOS)
```bash
# Install Homebrew first
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Then install Node.js
brew install node
```

### 2. Docker Desktop

Check if installed:
```bash
docker --version
```

**If not installed**:
1. Download from: https://www.docker.com/products/docker-desktop/
2. Install and launch Docker Desktop
3. Wait for Docker to start (whale icon in menu bar)

---

## ⚡ Option 1: Frontend Only (2 minutes)

**Perfect for**: Viewing the UI, testing components, seeing the design

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Open browser
# Automatically opens at http://localhost:5173
```

**What works**:
- ✅ Full UI layout and design
- ✅ Component navigation
- ✅ Page structure
- ⚠️ No backend connection (shows sample data)

---

## 🔥 Option 2: Full Stack (10 minutes)

**Perfect for**: Complete experience with AI agents, database, real-time updates

### Step 1: Install Tools (if needed)

**Node.js**: https://nodejs.org/ (download LTS version)

**Docker Desktop**: https://www.docker.com/products/docker-desktop/

### Step 2: Get API Keys (Optional but Recommended)

You need **one** of these (both are free):

**OpenAI** (Recommended):
1. Go to: https://platform.openai.com/api-keys
2. Sign up (free trial includes $5 credit)
3. Create API key
4. Copy the key (starts with `sk-`)

**OR Gemini**:
1. Go to: https://aistudio.google.com/app/apikey
2. Sign in with Google
3. Create API key
4. Copy the key

### Step 3: Configure Environment

Open `.env.backend` in your text editor:

```bash
# macOS/Linux
nano .env.backend

# Or use VS Code
code .env.backend

# Or any text editor
open -a TextEdit .env.backend
```

Add your API key:
```bash
# Use OpenAI
OPENAI_API_KEY=sk-your-actual-key-here

# OR use Gemini
GEMINI_API_KEY=your-actual-key-here
```

Save the file.

### Step 4: Start Everything

Open **TWO terminal windows**:

**Terminal 1 - Backend**:
```bash
cd /Users/bryanwisk/Projects/adam-platform

# Start all backend services
./scripts/start-backend.sh

# Wait 2 minutes for services to start
# You'll see logs indicating services are healthy
```

**Terminal 2 - Frontend**:
```bash
cd /Users/bryanwisk/Projects/adam-platform

# Install dependencies (first time only)
npm install

# Start frontend
npm run dev
```

### Step 5: Open the App

The app automatically opens at: **http://localhost:5173**

Or manually open:
- **ADAM Platform**: http://localhost:5173
- **Grafana Monitoring**: http://localhost:3001 (admin/admin)

---

## 🧪 Try It Out!

Once running, test these features:

### 1. Create an Experiment

1. Click **"New Experiment"** button
2. Fill in:
   ```
   Name: Magnetic Alloy Test
   Hypothesis: Fe-Co composition affects magnetic saturation
   Risk Level: R1
   ```
3. Click **"Create Experiment"**

### 2. Watch the AI Agents Work

You'll see 5 phases execute automatically:

```
[Planning] → Generates experiment plan
[Design]   → Creates DOE matrix
[Simulation] → Predicts outcomes
[Execution] → Creates hardware jobs
[Analysis]  → Processes results
```

Each phase shows real-time progress!

### 3. View Hardware Integration

Navigate to **Hardware** section:
- See 13 Desktop Metal printers
- 26+ materials with pricing
- Calculate experiment costs
- View equipment specifications

### 4. Use NovaTerminal

Try the terminal interface:
```bash
> help
> status
> agents
> experiments list
```

---

## 📊 Monitoring & Debugging

### View Backend Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f graph-orchestrator
docker compose logs -f api-gateway
```

### Check Service Health

```bash
docker compose ps

# All services should show "healthy" status
```

### Access Grafana

1. Open: http://localhost:3001
2. Login: admin / admin
3. View dashboards for metrics and monitoring

---

## 🛑 Stopping the Platform

### Stop Frontend
Press `Ctrl+C` in the terminal running `npm run dev`

### Stop Backend
```bash
./scripts/stop-backend.sh
```

### Full Reset (if needed)
```bash
./scripts/reset-backend.sh
```

---

## ❓ Troubleshooting

### "Cannot find module" error
```bash
rm -rf node_modules package-lock.json
npm install
```

### Docker services won't start
```bash
# Make sure Docker Desktop is running
# Check the whale icon in menu bar

# Reset services
./scripts/reset-backend.sh
./scripts/start-backend.sh
```

### Frontend won't connect to backend
1. Check backend is running: `docker compose ps`
2. Check logs: `docker compose logs api-gateway`
3. Verify URL in browser: http://localhost:3200/health

### Port already in use
```bash
# Find process using port
lsof -ti:5173 | xargs kill -9  # Frontend
lsof -ti:3200 | xargs kill -9  # API Gateway
```

---

## 🎯 What's Running?

When fully started, you have:

| Service | Port | Purpose |
|---------|------|---------|
| **Frontend** | 5173 | React web app |
| **API Gateway** | 3200 | REST/WebSocket API |
| **Nova Orchestrator** | 3100 | AI agent system |
| **PostgreSQL** | 5432 | Main database |
| **TimescaleDB** | 5433 | Time-series data |
| **NATS** | 4222 | Message broker |
| **Redis** | 6379 | Cache |
| **Grafana** | 3001 | Monitoring UI |
| **Prometheus** | 9090 | Metrics |
| **Qdrant** | 6333 | Vector DB |

---

## 💡 Tips

### First Time Setup
- Install Node.js from https://nodejs.org/ (takes 5 min)
- Install Docker Desktop (takes 10 min)
- Get OpenAI API key (takes 2 min)

### Development Tips
- Frontend auto-reloads when you edit files
- Backend logs show in terminal
- Use browser DevTools (F12) for debugging

### Recommended Browser
- Chrome or Firefox for best experience
- Enable JavaScript console to see logs

---

## 🚧 Current Limitations

Without API keys:
- ❌ AI agents won't generate responses
- ❌ Experiment planning won't work
- ✅ UI still fully functional
- ✅ Can see mock data

With API keys:
- ✅ Full AI agent functionality
- ✅ Real experiment workflows
- ✅ Complete materials discovery pipeline

---

## 📚 Learn More

After reviewing the app, check out:

- [LOCAL_SETUP_GUIDE.md](LOCAL_SETUP_GUIDE.md) - Detailed setup instructions
- [HARDWARE_INTEGRATION_ENHANCED.md](HARDWARE_INTEGRATION_ENHANCED.md) - Hardware specs
- [README.md](README.md) - Project overview
- [PHASE_4_COMPLETE.md](PHASE_4_COMPLETE.md) - Latest features

---

## 🎉 You're Ready!

Choose an option and get started:

**Quick Preview** (2 minutes):
```bash
npm install && npm run dev
```

**Full Experience** (10 minutes):
1. Get API key from https://platform.openai.com/api-keys
2. Add to `.env.backend`
3. Run `./scripts/start-backend.sh`
4. Run `npm run dev` in new terminal
5. Open http://localhost:5173

**Need Help?** Check the troubleshooting section above or review [LOCAL_SETUP_GUIDE.md](LOCAL_SETUP_GUIDE.md)

---

**Let's build some materials!** 🔬⚗️🧲

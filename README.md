# 🔍 ContentScout

**AI-Powered Content Originality Scanner**

ContentScout analyzes your content for originality using simulated AI consensus scoring. Submit text, get a 0-100 originality score, and see detailed metrics on uniqueness, vocabulary, structure, and creativity.

> 🎯 **Inspired by [OriginalityArbiter](https://github.com/rivaleuc/OriginalityArbiter)** — a GenLayer-based content originality scoring system with on-chain token rewards.

![ContentScout Demo](https://img.shields.io/badge/demo-live-00ffc8?style=for-the-badge)
![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8?style=flat-square&logo=tailwindcss)

---

## ✨ Features

- 🤖 **AI Consensus Simulation** — Mimics GenLayer's validator consensus mechanism
- 📊 **Multi-Metric Analysis** — Scores for uniqueness, vocabulary, structure, creativity
- 🔗 **Wallet Connection** — Simulated MetaMask integration for Web3 UX
- 📝 **Content Types** — Support for articles, essays, code, creative writing, research
- 🔄 **Appeal System** — Re-judge flagged content with fresh analysis
- 🏆 **Reward Eligibility** — Track which submissions qualify for token rewards
- 🌙 **Cyberpunk UI** — Terminal-inspired dark theme with neon accents

---

## 🛠 Tech Stack

| Technology | Purpose |
|------------|---------|
| **React 19** | UI framework |
| **TypeScript** | Type safety |
| **Vite** | Build tool |
| **Tailwind CSS v4** | Styling |
| **Framer Motion** | Animations |
| **Sonner** | Toast notifications |

---

## 📁 Project Structure

```
ContentScout/
├── src/
│   ├── components/
│   │   ├── Header.tsx          # Navigation with wallet connection
│   │   ├── Stats.tsx           # Dashboard statistics
│   │   ├── SubmitForm.tsx      # Content submission form
│   │   ├── ResultCard.tsx      # Analysis result display
│   │   ├── SubmissionList.tsx  # History of submissions
│   │   ├── WalletModal.tsx     # Wallet connection modal
│   │   └── RewardInfo.tsx      # Reward system info
│   ├── hooks/
│   │   ├── useWallet.ts        # Wallet state management
│   │   └── useContract.ts      # Contract interaction hook
│   ├── lib/
│   │   ├── genlayer.ts         # Simulated GenLayer SDK
│   │   └── analyzer.ts         # Content analysis engine
│   ├── types/
│   │   └── index.ts            # TypeScript definitions
│   ├── App.tsx                 # Main application
│   ├── main.tsx                # Entry point
│   └── index.css               # Global styles
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/ContentScout.git
cd ContentScout

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Development

```bash
npm run dev      # Start dev server at http://localhost:5173
npm run build    # Build for production
npm run preview  # Preview production build
```

---

## 🎮 How It Works

### 1. Connect Wallet
Click "CONNECT" to simulate wallet connection. A demo address is auto-generated.

### 2. Submit Content
- Select content type (Article, Essay, Code, etc.)
- Paste your content (50-4000 characters)
- Optionally add a source URL
- Click "EXECUTE ANALYSIS"

### 3. Get Results
The analyzer evaluates:

| Metric | Description |
|--------|-------------|
| **Uniqueness** | Detection of AI-generated phrases |
| **Vocabulary** | Richness and diversity of word usage |
| **Structure** | Sentence variation and naturalness |
| **Creativity** | Personal voice and creative elements |

### 4. Score Interpretation

| Score | Verdict | Meaning |
|-------|---------|---------|
| 70-100 | ✅ Original | Highly original content |
| 40-69 | ⚠️ Borderline | Likely original with some common patterns |
| 0-39 | 🚫 Flagged | Signs of plagiarism or AI-generation |

### 5. Appeal (Optional)
If your content is flagged, you can appeal for re-analysis.

---

## 🔬 Analysis Algorithm

ContentScout uses a weighted scoring system:

```
Final Score = (Uniqueness × 0.35) + (Vocabulary × 0.25) 
            + (Structure × 0.20) + (Creativity × 0.20)
```

**Uniqueness Detection:**
- Scans for common AI-generated phrases
- Identifies template-like language patterns

**Vocabulary Analysis:**
- Calculates unique word ratio
- Adjusts for content length

**Structure Evaluation:**
- Measures sentence length variance
- Checks paragraph organization

**Creativity Scoring:**
- Personal pronouns (+voice)
- Questions/exclamations (+engagement)
- Specific numbers/data (+research)
- Quote usage (+attribution)

---

## 🎨 UI Design

ContentScout features a **cyberpunk terminal aesthetic**:

- 🖥 **Terminal Console UI** — Window bars, file tabs, `$` prompts
- 📡 **Animated Grid Background** — Matrix-style moving grid
- 💫 **Neon Glow Effects** — Cyan/magenta/lime text shadows
- 📊 **Waveform Visualizer** — Animated score display
- 🔲 **Corner Accent Frames** — HUD-style brackets
- 📺 **Scanline Overlay** — Retro CRT effect

---

## 🔄 Comparison with Original

| Feature | OriginalityArbiter | ContentScout |
|---------|-------------------|--------------|
| **Blockchain** | GenLayer Bradbury | Simulated |
| **Smart Contract** | Python (GenVM) | JavaScript mock |
| **Wallet** | Real MetaMask | Simulated |
| **Token Rewards** | OAT ERC-20 | Demo only |
| **Web Crawling** | gl.nondet.web.get | N/A |
| **AI Model** | LLM via GenVM | Algorithm-based |
| **Theme** | Light (cream/teal) | Dark (cyberpunk) |
| **Font** | Serif | Monospace |

---

## 🌐 Deployment

### Cloudflare Pages

```bash
# Build settings
Build command: npm run build
Output directory: dist
Node version: 20
```

### Vercel

```bash
# Auto-detected as Vite project
# Just connect your GitHub repo
```

### Netlify

```bash
# Build settings
Build command: npm run build
Publish directory: dist
```

---

## 📝 Environment Variables

No environment variables required for the demo version.

For production with real GenLayer integration:

```env
VITE_GENLAYER_RPC=https://rpc.genlayer.com
VITE_CONTRACT_ADDRESS=0x...
VITE_CHAIN_ID=4221
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- [OriginalityArbiter](https://github.com/rivaleuc/OriginalityArbiter) — Original project inspiration
- [GenLayer](https://genlayer.com) — AI consensus blockchain protocol
- [Tailwind CSS](https://tailwindcss.com) — Utility-first CSS framework
- [Framer Motion](https://www.framer.com/motion/) — Animation library

---

<div align="center">

**Built with 💜 by the ContentScout Team**

[Demo](https://contentscout.pages.dev) · [Report Bug](https://github.com/user/ContentScout/issues) · [Request Feature](https://github.com/user/ContentScout/issues)

</div>

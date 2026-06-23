# 🔍 ContentScout

<div align="center">

**AI-Powered Content Originality Scanner**

Analyze your content for originality using transparent, rule-based scoring.  
Optionally broadcast results on-chain via GenLayer Bradbury testnet.

[![Live Demo](https://img.shields.io/badge/demo-live-00ffc8?style=for-the-badge)](https://contentscout.pages.dev)
[![GenLayer](https://img.shields.io/badge/GenLayer-Bradbury-ff00c8?style=for-the-badge)](https://genlayer.com)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)

![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8?style=flat-square&logo=tailwindcss)
![Vite](https://img.shields.io/badge/Vite-7-646cff?style=flat-square&logo=vite)

</div>

---

## ✨ Features

- 🤖 **AI Pattern Detection** — Identifies 90+ common AI-generated phrases and patterns
- 📊 **4-Metric Scoring** — Uniqueness, Vocabulary, Structure, Creativity
- ⚡ **Instant Results** — Local analysis runs immediately (<1ms)
- 🔗 **On-Chain Option** — Optionally record results on GenLayer blockchain
- 🦊 **MetaMask Integration** — Sign real transactions with your wallet
- 🎨 **Cyberpunk UI** — Terminal-inspired dark theme with neon accents
- 📱 **Responsive** — Works on desktop and mobile

---

## 📋 Scoring System

### How Scores Are Calculated

```
Final Score = Uniqueness × 35% + Vocabulary × 25% + Structure × 20% + Creativity × 20%

Score ≥ 40 → PASS (Original)
Score < 40 → REJECT (Flagged)
```

### 1. Uniqueness (35%) — AI Pattern Detection

Detects common AI-generated content patterns:

| Category | Examples | Penalty |
|----------|----------|---------|
| High-confidence AI phrases | "it is important to note", "in today's rapidly evolving" | -6 each |
| Overused filler words | "furthermore", "consequently", "comprehensive" | -3 each |
| Marketing buzzwords | "leverage", "cutting-edge", "game-changer" | -2 each |
| Structural patterns | "let's dive into", "here are some" | -4 each |

### 2. Vocabulary (25%) — Lexical Richness

| Metric | What It Measures |
|--------|------------------|
| Type-Token Ratio | Unique words / Total words |
| Hapax Legomena | Words appearing exactly once |
| Word Sophistication | Average word length + rare words |
| Repetition Penalty | Excessive repetition of content words |

### 3. Structure (20%) — Writing Patterns

| Metric | Natural Writing | AI Writing |
|--------|-----------------|------------|
| Sentence Length Variance | High (CV > 0.3) | Low (CV < 0.2) |
| Sentence Mix | Short + Medium + Long | Uniform |
| Paragraph Organization | Multiple paragraphs | Single block |
| Punctuation Variety | `,` `;` `:` `—` `()` | Minimal |

### 4. Creativity (20%) — Original Voice

| Factor | Indicators |
|--------|------------|
| Personal Voice | I/my/we + opinion markers ("I think", "I believe") |
| Specific Evidence | Numbers, percentages, dates, proper nouns, citations |
| Rhetorical Engagement | Questions, exclamations, direct address |
| Unique Phrasing | Uncommon word combinations, domain terms |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+
- **MetaMask** (optional, for on-chain features)
- **GEN tokens** (free from [faucet](https://faucet.genlayer.com))

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

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server at http://localhost:5173 |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | TypeScript type checking |

---

## 🏗 Architecture

### Hybrid Mode: Local + On-Chain

ContentScout works in two modes:

1. **Local Mode** (always available)
   - Instant analysis using JavaScript algorithms
   - Results stored in browser memory
   - No wallet or tokens required

2. **On-Chain Mode** (with MetaMask)
   - Same instant local analysis
   - Additionally broadcasts to GenLayer Bradbury
   - Permanent on-chain record
   - Requires GEN tokens for gas

```
User Submit → Local Analysis (instant) → Show Results
                    ↓
              [If wallet connected]
                    ↓
              On-Chain TX (background) → Update Status Badge
```

### Project Structure

```
ContentScout/
├── src/
│   ├── components/
│   │   ├── Header.tsx          # Navigation + wallet connection
│   │   ├── Stats.tsx           # Dashboard statistics
│   │   ├── SubmitForm.tsx      # Content submission form
│   │   ├── ResultCard.tsx      # Analysis results display
│   │   ├── SubmissionList.tsx  # Submission history
│   │   ├── WalletModal.tsx     # MetaMask connection modal
│   │   └── RewardInfo.tsx      # Token rewards info
│   ├── hooks/
│   │   ├── useWallet.ts        # MetaMask state management
│   │   └── useContract.ts      # Contract interaction hook
│   ├── lib/
│   │   ├── genlayer.ts         # GenLayer SDK integration
│   │   └── analyzer.ts         # ⭐ Scoring algorithms
│   ├── types/
│   │   └── index.ts            # TypeScript definitions
│   ├── App.tsx                 # Main application
│   ├── main.tsx                # Entry point
│   └── index.css               # Global styles
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── LICENSE
└── README.md
```

---

## 🔧 Configuration

### Environment Variables (Optional)

Create `.env.local` for custom configuration:

```env
# Override contract address
VITE_CONTRACT_ADDRESS=0x...

# Override RPC endpoint
VITE_RPC_ENDPOINT=https://rpc-bradbury.genlayer.com

# Override chain ID
VITE_CHAIN_ID=4221
```

### GenLayer Contract

| Property | Value |
|----------|-------|
| Network | GenLayer Bradbury (Testnet) |
| Chain ID | 4221 |
| Contract | `0xEDf0e9B44b609f63aE17d1345C1e5dDF81000BdE` |
| Explorer | [View on Explorer](https://explorer-bradbury.genlayer.com/contract/0xEDf0e9B44b609f63aE17d1345C1e5dDF81000BdE) |

---

## 🌐 Deployment

### Cloudflare Pages

```bash
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
Build command: npm run build
Publish directory: dist
```

---

## 📖 Tech Stack

| Technology | Purpose |
|------------|---------|
| **React 19** | UI framework |
| **TypeScript 5** | Type safety |
| **Vite 7** | Build tool |
| **Tailwind CSS 4** | Styling |
| **Framer Motion** | Animations |
| **Sonner** | Toast notifications |
| **genlayer-js** | Blockchain SDK |

---

## 🔗 Links

| Resource | URL |
|----------|-----|
| **Live Demo** | https://contentscout.pages.dev |
| **GenLayer Docs** | https://docs.genlayer.com |
| **Faucet** | https://faucet.genlayer.com |
| **Explorer** | https://explorer-bradbury.genlayer.com |
| **genlayer-js** | https://github.com/genlayerlabs/genlayer-js |

---

## 🙏 Acknowledgments

- **[OriginalityArbiter](https://github.com/rivaleuc/OriginalityArbiter)** — Original inspiration
- **[GenLayer](https://genlayer.com)** — AI consensus blockchain platform
- **[Tailwind CSS](https://tailwindcss.com)** — Utility-first CSS framework
- **[Framer Motion](https://www.framer.com/motion/)** — Animation library

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with 💜 using React + GenLayer**

[⬆ Back to Top](#-contentscout)

</div>

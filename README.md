# Codebase Explorer AI

> Your AI pair-programmer for exploring any GitHub repository.

Drop a GitHub URL, get an instant interactive file tree, and chat with an AI that has actually read the code. No more cloning repos just to figure out what they do.

[![Built with v0](https://img.shields.io/badge/Built%20with-v0-black?style=flat-square)](https://v0.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![Powered by Groq](https://img.shields.io/badge/Powered%20by-Groq-orange?style=flat-square)](https://groq.com)

---

## What it does

Codebase Explorer AI turns any public GitHub repository into a conversation. Instead of digging through dozens of files trying to understand a project, you ask questions in plain English and get answers grounded in the actual source code.

**Try asking things like:**
- *"What does this project do?"*
- *"How is authentication handled?"*
- *"Where is the database schema defined?"*
- *"Walk me through the request lifecycle."*

---

## How it works

```
   ┌─────────────────┐         ┌──────────────┐         ┌─────────────┐
   │   Your input    │   ───►  │  /api/github │   ───►  │  GitHub API │
   │ owner/repo URL  │         │  (file tree) │         └─────────────┘
   └─────────────────┘         └──────────────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │  File Explorer  │
                              │   (left panel)  │
                              └─────────────────┘

   ┌─────────────────┐         ┌──────────────┐         ┌─────────────┐
   │  Your question  │   ───►  │   /api/ask   │   ───►  │  Groq LLM   │
   │   in the chat   │         │ (RAG + files)│         └─────────────┘
   └─────────────────┘         └──────────────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │   AI Response   │
                              │  (right panel)  │
                              └─────────────────┘
```

1. **Fetch** — `/api/github` pulls the repo's file tree from GitHub's REST API
2. **Score** — `/api/ask` ranks files by relevance to your question (entry points, configs, keyword matches)
3. **Read** — Top 3–5 files are downloaded and trimmed to fit the context window
4. **Answer** — Groq's `llama-3.3-70b-versatile` generates a response grounded in real code

---

## Features

| | |
|---|---|
| Interactive file tree | Collapsible folders, syntax-aware icons |
| Smart file selection | Automatically picks the most relevant files per question |
| Streaming AI chat | Fast responses powered by Groq's LPU inference |
| Source citations | See exactly which files the AI used |
| Dark IDE theme | Built for developers, easy on the eyes |
| Fully responsive | Works on mobile, tablet, and desktop |

---

## Tech Stack

- **Framework** — [Next.js 16](https://nextjs.org) (App Router) + [React 19](https://react.dev)
- **Styling** — [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
- **AI** — [Groq](https://groq.com) — `llama-3.3-70b-versatile`
- **Data** — [GitHub REST API](https://docs.github.com/rest)
- **Deployment** — [Vercel](https://vercel.com)

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/Aishwarya5-6/v0-codebase.git
cd v0-codebase
pnpm install
```

### 2. Set up environment variables

Create a `.env.local` file in the root:

```bash
GROQ_API_KEY=gsk_your_groq_api_key_here
GITHUB_TOKEN=ghp_your_github_token_here   # optional, but recommended
```

- Get a Groq key → [console.groq.com/keys](https://console.groq.com/keys)
- Get a GitHub token → [github.com/settings/tokens](https://github.com/settings/tokens) (only `public_repo` scope needed)

> The GitHub token is optional but raises your rate limit from 60 → 5,000 requests/hour.

### 3. Run the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and paste any GitHub repo URL to get started.

---

## Project Structure

```
app/
  ├── api/
  │   ├── github/route.ts    # Fetches repo file tree
  │   └── ask/route.ts       # RAG pipeline + Groq inference
  ├── page.tsx               # Main UI shell
  ├── layout.tsx             # Root layout + fonts
  └── globals.css            # Theme tokens

components/
  ├── repo-input.tsx         # Top bar with URL input
  ├── file-tree.tsx          # Collapsible file explorer
  ├── chat-panel.tsx         # AI chat interface
  └── ui/                    # shadcn/ui primitives
```

---

## Try It

Paste any of these to see it in action:

- `vercel/ai-chatbot`
- `shadcn-ui/ui`
- `vercel/next.js`
- `your-org/your-repo`

---

## Built with v0

This project was built and is continuously improved using [v0](https://v0.app) — Vercel's AI-powered development platform. Want to fork and customize it?

[Continue working on v0 →](https://v0.app/chat/projects/prj_Sf4NtQ8r6QxgJvitk1SaH02kbaPX)

<a href="https://v0.app/chat/api/kiro/clone/Aishwarya5-6/v0-codebase" alt="Open in Kiro"><img src="https://pdgvvgmkdvyeydso.public.blob.vercel-storage.com/open%20in%20kiro.svg?sanitize=true" /></a>

---

## License

MIT — feel free to fork, remix, and build something cool.

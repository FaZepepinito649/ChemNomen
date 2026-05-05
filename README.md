# ChemNomen — IUPAC Nomenclature Trainer

A web app to practice organic IUPAC nomenclature with real 2D structures and an AI tutor.

## Features
- 63 compounds across 10 categories (alkanes, alkenes, alkynes, alcohols, aldehydes, ketones, carboxylic acids, amines, amides, aromatics)
- 2D structures loaded live from PubChem (free public API)
- 3-strike system: fail 3 times → reveals name + step-by-step rules
- ChemBot: AI tutor powered by Claude (won't spoil the answer until revealed)
- Score + streak tracker

---

## Deploy to Netlify from GitHub

### 1. Push this repo to GitHub
```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOUR_USER/chemnomen.git
git push -u origin main
```

### 2. Connect to Netlify
1. Go to [netlify.com](https://netlify.com) → **Add new site → Import an existing project**
2. Select **GitHub** and pick your repository
3. Build settings are already configured via `netlify.toml` — leave them as-is
4. Click **Deploy site**

### 3. Add the Anthropic API key
1. In your Netlify dashboard → **Site configuration → Environment variables**
2. Add a new variable:
   - **Key:** `ANTHROPIC_API_KEY`
   - **Value:** your key from [console.anthropic.com](https://console.anthropic.com)
3. **Redeploy** the site (Deploys → Trigger deploy → Deploy site)

Done! The chatbot will now work. PubChem structures work without any key.

---

## Project structure
```
chemnomen/
├── index.html                  # Main app (all HTML/CSS/JS)
├── netlify.toml                # Netlify build + functions config
├── package.json                # Node version pin
├── netlify/
│   └── functions/
│       └── chat.js             # Serverless proxy for Anthropic API
└── README.md
```

## How the API proxy works
The browser calls `/.netlify/functions/chat` (same domain, no CORS issues).  
The serverless function adds the `ANTHROPIC_API_KEY` from environment variables and forwards the request to Anthropic's API.  
The key is never exposed to the client.

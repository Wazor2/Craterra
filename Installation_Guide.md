# Installation & Deployment Guide
### Lunar Landing Site Navigator — NASA Space Apps Challenge 2026

---

## 1. System Requirements

- **Node.js:** v20.x or v22.x LTS
- **Package Manager:** `pnpm` v9.x or v10.x (recommended) or `npm`
- **Operating System:** Cross-platform (Windows 10/11, macOS, Linux)
- **Optional Python Environment (for offline preprocessing scripts):** Python 3.10+

---

## 2. Installation Steps

### Step 1: Clone Repository
```bash
git clone https://github.com/Wazor2/NASA-s-SPACE-APP-HACKATHON.git
cd NASA-s-SPACE-APP-HACKATHON
```

### Step 2: Install Node Dependencies
```bash
pnpm install
```

### Step 3: Run Validation & Test Suite
Verify that all 19 contract schemas, mathematical transformations, and physical sanity tests pass:
```bash
pnpm test
```

### Step 4: Run Type Check
Confirm strict TypeScript compilation:
```bash
pnpm typecheck
```

### Step 5: Start Local Development Server
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 3. Production Build & Verification

To verify that the Next.js production build succeeds with static prerendering:
```bash
pnpm build
pnpm start
```

---

## 4. Deployment Instructions

### Vercel Deployment (Recommended)
1. Push your branch to GitHub.
2. Sign in to [Vercel](https://vercel.com/) and click **"Add New Project"**.
3. Select this repository.
4. Framework Preset: **Next.js**.
5. Build Command: `pnpm build` (or default `next build`).
6. Click **Deploy**. Vercel will automatically build the static pages and deploy the site globally with edge caching.

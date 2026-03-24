# Portfolio Forge

Generate realistic GitHub project portfolios from resumes or custom project definitions. Creates actual repositories with backdated commit histories that follow natural development patterns.

## How It Works

1. **Sign in** with Google (access managed via CET)
2. **Connect GitHub** account(s) where repos will be pushed
3. **Define projects** — paste/upload a resume for AI-suggested projects, or manually define them
4. **Generate & Build** — AI generates source code, then commits are created with realistic backdated timestamps and pushed to GitHub

## Tech Stack

- **Frontend**: Vue 3, TypeScript, Vite, Tailwind CSS, shadcn-vue
- **Backend**: NestJS, TypeScript
- **AI**: Claude via [RD-AIC](https://ai-center.roochedigital.com) API gateway
- **Auth**: Google OAuth with CET access verification
- **Git**: simple-git for repo creation and backdated commits

## Setup

### Prerequisites

- Node.js 18+
- Google OAuth credentials (console.cloud.google.com)
- GitHub OAuth App (github.com/settings/developers)
- RD-AIC API key
- CET tool registration

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Fill in .env values
npm run start:dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:5173`, backend at `http://localhost:3000`.

## Environment Variables

### Backend (.env)

| Variable | Description |
|----------|-------------|
| `PORT` | Backend port (default: 3000) |
| `FRONTEND_URL` | Frontend URL for OAuth redirects |
| `RD_AIC_URL` | RD-AIC gateway URL |
| `RD_AIC_API_KEY` | RD-AIC API key for Claude requests |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | Google OAuth callback URL |
| `CET_BASE_URL` | CET server URL |
| `CET_API_KEY` | CET API key for access checks |
| `CET_TOOL_NAME` | Tool name registered in CET |
| `CET_API_TOKEN` | Token for CET integration endpoints |
| `SESSION_EXPIRATION_DAYS` | Session lifetime (default: 5) |
| `GITHUB_CLIENT_ID` | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth app client secret |
| `GITHUB_CALLBACK_URL` | GitHub OAuth callback URL |

## Features

- **Resume Analysis**: Paste text or upload PDF/DOCX — AI extracts skills and suggests matching projects
- **Custom Projects**: Define projects manually with preset tech stack tags
- **Web Search**: Toggle AI web search for up-to-date framework info
- **Multi-GitHub**: Connect multiple GitHub accounts, switch between them
- **Per-Project Generation**: Generate and build projects individually
- **Realistic Commits**: Weekday-weighted, work-hour timestamps, per-file commits, maintenance fixes
- **Interactive Tour**: Built-in guided walkthrough with spotlight highlights
- **CET Integration**: Google OAuth login with centralized access management

## CET Integration Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/authorize` | POST | Create/update user (called by CET) |
| `/api/auth/unauthorize` | DELETE | Revoke user access (called by CET) |
| `/api/auth/signin` | POST | Generate session token (called by CET) |

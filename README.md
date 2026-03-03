# CollegeCommunity Platform

A full-stack communication and collaboration system for students and faculty, featuring **AI-powered content moderation**.

## 🚀 Tech Stack
- **Frontend**: React.js (Vite), Tailwind CSS, React Router, Lucide Icons, Framer Motion.
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage).
- **AI Moderation**: OpenAI Moderation API via Supabase Edge Functions.

## ✨ Key Features
1.  **AI Content Moderation**: Automatically filters harassment, hate speech, and toxicity in Posts, Comments, and Chat messages.
2.  **Role-Based Access**: Specialized interfaces for Students, Faculty, and Admins.
3.  **Real-time Community Chat**: Instant messaging with live AI-safety checks.
4.  **Campus Events**: Faculty-driven event management system.
5.  **Admin Dashboard**: Monitor moderation logs with toxicity scores and manual override capabilities.
6.  **Profile System**: Customizable user profiles with role identification.

## 🛠️ Setup Instructions

### 1. Supabase Backend
1.  Create a new project on [Supabase](https://supabase.com).
2.  Run the SQL provided in `supabase/schema.sql` in the SQL Editor.
3.  Enable **Supabase Auth** (Email/Password).

### 2. AI Moderation (Edge Function)
1.  Install Supabase CLI: `npm install supabase --save-dev`
2.  Deploy the edge function:
    ```bash
    supabase functions deploy moderate-content --no-verify-jwt
    ```
3.  Set Auth Secrets in Supabase:
    ```bash
    supabase secrets set OPENAI_API_KEY=your_openai_key
    ```

### 3. Frontend Configuration
1.  Clone the repository.
2.  Install dependencies: `npm install`
3.  Create a `.env` file based on `.env.example`:
    ```env
    VITE_SUPABASE_URL=your_project_url
    VITE_SUPABASE_ANON_KEY=your_anon_key
    ```
4.  Start development server: `npm run dev`

## 🛡️ Moderation Logic
- **Automated**: Every piece of content is sent to OpenAI's `/v1/moderations` endpoint.
- **Immediate Action**: If `flagged: true`, the content is blocked from the UI and marked as `rejected` in the database.
- **Transparency**: Admins can see the exact category scores (e.g., `harassment: 0.98`) in the dashboard.

## 📄 License
MIT

# ScopeLock
A simple tool that enforces scope limits so builders actually ship.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- A Supabase account and project

### Environment Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd ScopeLock
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:

Create a `.env.local` file in the root directory and add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**How to get your Supabase credentials:**
- Go to your [Supabase Dashboard](https://supabase.com/dashboard)
- Select your project
- Navigate to Settings > API
- Copy the "Project URL" and paste it as `NEXT_PUBLIC_SUPABASE_URL`
- Copy the "anon/public" key and paste it as `NEXT_PUBLIC_SUPABASE_ANON_KEY`

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

### Authentication
- Email-based authentication using Supabase Auth magic links
- Protected routes that require authentication
- Persistent sessions across browser refreshes

### Routes
- `/` - Home page with app navigation
- `/login` - Authentication page for signing in with email
- `/app` - Protected dashboard (requires authentication)

## Testing Authentication Locally

1. Ensure your `.env.local` file is configured with valid Supabase credentials
2. Start the development server with `npm run dev`
3. Navigate to `/login` and enter your email address
4. Check your email for the magic link
5. Click the magic link to authenticate
6. You'll be redirected to the `/app` page showing your authenticated session

**Note:** For magic links to work properly in local development, you may need to configure your Supabase project's Site URL and redirect URLs in the Supabase Dashboard under Authentication > URL Configuration.

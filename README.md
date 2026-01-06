# ScopeLock
A simple tool that enforces scope limits so builders actually ship.

## Database Setup

### Features Table

To enable the Features CRUD functionality with ScopeLock enforcement, you need to create the `features` table in your Supabase database.

1. Go to your Supabase Dashboard
2. Navigate to the SQL Editor
3. Run the SQL script from `features-table.sql`:

```sql
-- Features table schema for ScopeLock
-- This table stores features for each project with status tracking

CREATE TABLE features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  project_id uuid REFERENCES projects(id),
  title text NOT NULL,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'done')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE features ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "feature_isolation" ON features
  FOR ALL
  USING (user_id = auth.uid());
```

The table includes:
- Row Level Security (RLS) enabled to ensure users can only access their own features
- A policy that enforces `user_id = auth.uid()` for all operations
- Foreign key constraints to ensure data integrity
- Status validation through CHECK constraint

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

### Projects Management
- Create, list, and delete projects
- Each project includes:
  - Name
  - Deadline
  - Feature limit (minimum 1)
- Projects are user-scoped (each user sees only their own projects)
- Projects are ordered by creation date (most recent first)
- Click on a project to view its details and manage features

### Features Management (ScopeLock)
- View all features for a project
- Create new features with title and status (planned, in_progress, done)
- Update feature status
- Delete features
- **ScopeLock Enforcement**: When the number of open features (status != 'done') reaches the project's feature limit, the system prevents adding new features until at least one feature is marked as done

### Routes
- `/` - Home page with app navigation
- `/login` - Authentication page for signing in with email
- `/app` - Protected dashboard with Projects CRUD (requires authentication)
- `/projects/[id]` - Project detail page with Features CRUD and ScopeLock enforcement

## Testing Locally

### Testing Authentication

1. Ensure your `.env.local` file is configured with valid Supabase credentials
2. Start the development server with `npm run dev`
3. Navigate to `/login` and enter your email address
4. Check your email for the magic link
5. Click the magic link to authenticate
6. You'll be redirected to the `/app` page showing your authenticated session

**Note:** For magic links to work properly in local development, you may need to configure your Supabase project's Site URL and redirect URLs in the Supabase Dashboard under Authentication > URL Configuration.

### Testing Projects CRUD

After signing in (see Testing Authentication above), you can test the Projects functionality:

1. **View existing projects**: The `/app` page will automatically load and display all projects for the signed-in user
2. **Create a project**:
   - Fill in the "Create Project" form with:
     - Project name (required, text field)
     - Deadline (required, date picker)
     - Feature limit (required, number, minimum value is 1)
   - Click "Create Project"
   - The new project will appear in the projects list below
3. **View project details**: Click on any project in the list to navigate to its detail page
4. **Delete a project**:
   - Click the "Delete" button next to any project
   - Confirm the deletion in the prompt
   - The project will be removed from the list

### Testing Features CRUD and ScopeLock

After creating a project (see Testing Projects CRUD above):

1. **Navigate to project details**: Click on a project from the `/app` page
2. **View project information**: The detail page shows the project name, deadline, feature limit, and current open features count
3. **Create a feature**:
   - Fill in the "Create Feature" form with:
     - Feature title (required, text field)
     - Status (select from: Planned, In Progress, Done)
   - Click "Create Feature"
   - The new feature will appear in the features list below
4. **Test ScopeLock**:
   - Create features until the number of open features (status != 'done') reaches the feature limit
   - Try to create another feature - the form will be disabled
   - A warning message will appear: "Scope locked — mark a feature done to add another."
   - Change the status of a feature to "Done"
   - The form will become enabled again, allowing you to create new features
5. **Update feature status**: Use the status dropdown next to each feature to change its status
6. **Delete a feature**:
   - Click the "Delete" button next to any feature
   - Confirm the deletion in the prompt
   - The feature will be removed from the list

**Database Requirements:**
- The `public.projects` table must exist in your Supabase database with columns:
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to auth.users)
  - `name` (text)
  - `deadline` (timestamptz)
  - `feature_limit` (int)
  - `created_at` (timestamptz)
- The `public.features` table must exist in your Supabase database with columns:
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to auth.users)
  - `project_id` (uuid, foreign key to projects)
  - `title` (text)
  - `status` (text, check constraint for 'planned', 'in_progress', 'done')
  - `created_at` (timestamptz)
- Row Level Security (RLS) policies should be configured to allow users to manage only their own projects and features

See `features-table.sql` in the repository root for the complete features table schema.

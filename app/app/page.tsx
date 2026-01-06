'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import type { User } from '@supabase/supabase-js';
import type { Project } from '@/lib/types';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    deadline: '',
    feature_limit: 1,
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check current session
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUser(session.user);
      } else {
        router.push('/login');
      }
      setLoading(false);
    };

    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        router.push('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const fetchProjects = useCallback(async () => {
    setProjectsLoading(true);
    setProjectsError(null);

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        setProjectsError(error.message);
      } else {
        setProjects(data || []);
      }
    } catch {
      setProjectsError('Failed to fetch projects');
    } finally {
      setProjectsLoading(false);
    }
  }, [user?.id]);

  // Fetch projects when user is loaded
  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user, fetchProjects]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    try {
      const { error } = await supabase
        .from('projects')
        .insert({
          user_id: user?.id,
          name: formData.name,
          deadline: formData.deadline,
          feature_limit: formData.feature_limit,
        });

      if (error) {
        setFormError(error.message);
      } else {
        setFormData({ name: '', deadline: '', feature_limit: 1 });
        await fetchProjects();
      }
    } catch {
      setFormError('Failed to create project');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) {
        alert(`Failed to delete project: ${error.message}`);
      } else {
        await fetchProjects();
      }
    } catch {
      alert('Failed to delete project');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              Projects Dashboard
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Signed in as <span className="font-semibold">{user.email}</span>
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Sign Out
          </button>
        </div>

        {/* Create Project Form */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow-md dark:bg-zinc-900">
          <h2 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Create Project
          </h2>
          <form onSubmit={handleCreateProject} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
                Project Name
              </label>
              <input
                id="name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500"
                placeholder="Enter project name"
              />
            </div>

            <div>
              <label htmlFor="deadline" className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
                Deadline
              </label>
              <input
                id="deadline"
                type="date"
                required
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500"
              />
            </div>

            <div>
              <label htmlFor="feature_limit" className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
                Feature Limit
              </label>
              <input
                id="feature_limit"
                type="number"
                required
                min="1"
                value={formData.feature_limit}
                onChange={(e) => setFormData({ ...formData, feature_limit: Math.max(1, parseInt(e.target.value) || 1) })}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500"
              />
            </div>

            {formError && (
              <div className="rounded-md bg-red-50 p-3 dark:bg-red-900/20">
                <p className="text-sm text-red-800 dark:text-red-400">{formError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={formSubmitting}
              className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {formSubmitting ? 'Creating...' : 'Create Project'}
            </button>
          </form>
        </div>

        {/* Projects List */}
        <div className="rounded-lg bg-white p-6 shadow-md dark:bg-zinc-900">
          <h2 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Your Projects
          </h2>

          {projectsLoading && (
            <p className="text-zinc-600 dark:text-zinc-400">Loading projects...</p>
          )}

          {projectsError && (
            <div className="rounded-md bg-red-50 p-3 dark:bg-red-900/20">
              <p className="text-sm text-red-800 dark:text-red-400">{projectsError}</p>
            </div>
          )}

          {!projectsLoading && !projectsError && projects.length === 0 && (
            <p className="text-zinc-600 dark:text-zinc-400">
              No projects yet. Create your first project above!
            </p>
          )}

          {!projectsLoading && !projectsError && projects.length > 0 && (
            <div className="space-y-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 dark:border-zinc-700"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                      {project.name}
                    </h3>
                    <div className="mt-1 flex flex-wrap gap-4 text-sm text-zinc-600 dark:text-zinc-400">
                      <span>
                        Deadline: {new Date(project.deadline).toLocaleDateString()}
                      </span>
                      <span>Feature Limit: {project.feature_limit}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteProject(project.id)}
                    className="ml-4 rounded-md bg-red-600 px-3 py-1 text-sm font-semibold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import type { User } from '@supabase/supabase-js';
import type { Project, Feature, ProjectStatus } from '@/lib/types';
import { computeProjectStatus } from '@/lib/types';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectFeatures, setProjectFeatures] = useState<Record<string, Feature[]>>({});
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
        const projectsList = data || [];
        
        // Fetch features for all projects
        const { data: featuresData } = await supabase
          .from('features')
          .select('*')
          .eq('user_id', user?.id);

        // Group features by project_id
        const featuresMap: Record<string, Feature[]> = {};
        (featuresData || []).forEach((feature: Feature) => {
          if (!featuresMap[feature.project_id]) {
            featuresMap[feature.project_id] = [];
          }
          featuresMap[feature.project_id].push(feature);
        });
        
        setProjectFeatures(featuresMap);

        // Sort projects by status: Blocked → In Progress → Planning → Completed
        const statusOrder: Record<ProjectStatus, number> = {
          'Blocked': 0,
          'In Progress': 1,
          'Planning': 2,
          'Completed': 3,
        };

        const sortedProjects = projectsList.sort((a, b) => {
          const statusA = computeProjectStatus(featuresMap[a.id] || [], a.feature_limit);
          const statusB = computeProjectStatus(featuresMap[b.id] || [], b.feature_limit);
          return statusOrder[statusA] - statusOrder[statusB];
        });

        setProjects(sortedProjects);
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

  // Find blocked projects
  const blockedProjects = projects.filter(project => {
    const features = projectFeatures[project.id] || [];
    return computeProjectStatus(features, project.feature_limit) === 'Blocked';
  });

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Blocked Projects Warning Banner */}
        {blockedProjects.length > 0 && (
          <div className="mb-6 rounded-lg border-4 border-red-600 bg-red-50 p-6 dark:bg-red-950">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-xl font-bold text-red-900 dark:text-red-200">
                  {blockedProjects.length} {blockedProjects.length === 1 ? 'Project is' : 'Projects are'} Blocked
                </h3>
                <p className="mt-2 text-base font-semibold text-red-800 dark:text-red-300">
                  You are blocked because you chose too many open features. You chose this limit. Finish something to continue.
                </p>
                <ul className="mt-3 list-disc list-inside space-y-1 text-sm text-red-800 dark:text-red-300">
                  {blockedProjects.map(project => (
                    <li key={project.id} className="font-medium">
                      <button
                        type="button"
                        onClick={() => router.push(`/projects/${project.id}`)}
                        className="hover:underline"
                        aria-label={`View details for ${project.name}`}
                      >
                        {project.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

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
              {projects.map((project) => {
                const features = projectFeatures[project.id] || [];
                const status = computeProjectStatus(features, project.feature_limit);
                const openFeaturesCount = features.filter(f => f.status !== 'done').length;
                
                // Status badge styling
                const statusStyles: Record<ProjectStatus, string> = {
                  'Blocked': 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700',
                  'In Progress': 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700',
                  'Planning': 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-700',
                  'Completed': 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700',
                };

                return (
                  <div
                    key={project.id}
                    className={`flex items-center justify-between rounded-lg border p-4 ${
                      status === 'Blocked' 
                        ? 'border-red-400 bg-red-50 dark:border-red-700 dark:bg-red-950/20' 
                        : 'border-zinc-200 dark:border-zinc-700'
                    }`}
                  >
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => router.push(`/projects/${project.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-zinc-900 hover:text-zinc-700 dark:text-zinc-50 dark:hover:text-zinc-300">
                          {project.name}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-bold border rounded ${statusStyles[status]}`}>
                          {status.toUpperCase()}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-4 text-sm text-zinc-600 dark:text-zinc-400">
                        <span>
                          Deadline: {new Date(project.deadline).toLocaleDateString()}
                        </span>
                        <span>Feature Limit: {project.feature_limit}</span>
                        <span className={status === 'Blocked' ? 'font-semibold text-red-700 dark:text-red-400' : ''}>
                          Open Features: {openFeaturesCount}/{project.feature_limit}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteProject(project.id)}
                      className="ml-4 rounded-md bg-red-600 px-3 py-1 text-sm font-semibold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                      Delete
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

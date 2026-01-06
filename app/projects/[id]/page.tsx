'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import type { User } from '@supabase/supabase-js';
import type { Project, Feature } from '@/lib/types';

export default function ProjectDetail() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [featuresLoading, setFeaturesLoading] = useState(false);
  const [featuresError, setFeaturesError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    status: 'planned' as 'planned' | 'in_progress' | 'done',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

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

  const fetchProject = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('user_id', user?.id)
        .single();

      if (error) {
        console.error('Error fetching project:', error);
        router.push('/app');
      } else {
        setProject(data);
      }
    } catch {
      router.push('/app');
    }
  }, [user, projectId, router]);

  const fetchFeatures = useCallback(async () => {
    if (!user) return;

    setFeaturesLoading(true);
    setFeaturesError(null);

    try {
      const { data, error } = await supabase
        .from('features')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        setFeaturesError(error.message);
      } else {
        setFeatures(data || []);
      }
    } catch {
      setFeaturesError('Failed to fetch features');
    } finally {
      setFeaturesLoading(false);
    }
  }, [user, projectId]);

  // Fetch project and features when user is loaded
  useEffect(() => {
    if (user) {
      fetchProject();
      fetchFeatures();
    }
  }, [user, fetchProject, fetchFeatures]);

  // Calculate if scope is locked
  const openFeaturesCount = features.filter(f => f.status !== 'done').length;
  const isScopeLocked = project ? openFeaturesCount >= project.feature_limit : false;

  const handleCreateFeature = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    // Client-side ScopeLock enforcement
    if (isScopeLocked) {
      setFormError('You chose this limit. Finish something to continue.');
      setFormSubmitting(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('features')
        .insert({
          user_id: user?.id,
          project_id: projectId,
          title: formData.title,
          status: formData.status,
        });

      if (error) {
        setFormError(error.message);
      } else {
        setFormData({ title: '', status: 'planned' });
        await fetchFeatures();
      }
    } catch {
      setFormError('Failed to create feature');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleUpdateStatus = async (featureId: string, newStatus: 'planned' | 'in_progress' | 'done') => {
    try {
      const { error } = await supabase
        .from('features')
        .update({ status: newStatus })
        .eq('id', featureId)
        .eq('user_id', user?.id);

      if (error) {
        alert(`Failed to update feature: ${error.message}`);
      } else {
        await fetchFeatures();
      }
    } catch {
      alert('Failed to update feature');
    }
  };

  const handleDeleteFeature = async (featureId: string) => {
    if (!confirm('Are you sure you want to delete this feature?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('features')
        .delete()
        .eq('id', featureId)
        .eq('user_id', user?.id);

      if (error) {
        alert(`Failed to delete feature: ${error.message}`);
      } else {
        await fetchFeatures();
      }
    } catch {
      alert('Failed to delete feature');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (!user || !project) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Blocked Warning Banner */}
        {isScopeLocked && (
          <div className="mb-6 rounded-lg border-4 border-red-600 bg-red-50 p-6 dark:bg-red-950">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-xl font-bold text-red-900 dark:text-red-200">
                  You are Blocked
                </h3>
                <p className="mt-2 text-base font-semibold text-red-800 dark:text-red-300">
                  You have too many open features ({openFeaturesCount}/{project.feature_limit}). You chose this limit. Finish something to continue.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/app')}
            className="mb-4 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            ← Back to Projects
          </button>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            {project.name}
          </h1>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-zinc-600 dark:text-zinc-400">
            <span>Deadline: {new Date(project.deadline).toLocaleDateString()}</span>
            <span>Feature Limit: {project.feature_limit}</span>
            <span>Open Features: {openFeaturesCount}/{project.feature_limit}</span>
          </div>
        </div>

        {/* Create Feature Form */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow-md dark:bg-zinc-900">
          <h2 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Create Feature
          </h2>
          <form onSubmit={handleCreateFeature} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
                Feature Title
              </label>
              <input
                id="title"
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                disabled={isScopeLocked}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500"
                placeholder="Enter feature title"
              />
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
                Status
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'planned' | 'in_progress' | 'done' })}
                disabled={isScopeLocked}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              >
                <option value="planned">Planned</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>

            {formError && (
              <div className="rounded-md bg-red-50 p-3 dark:bg-red-900/20">
                <p className="text-sm text-red-800 dark:text-red-400">{formError}</p>
              </div>
            )}

            {isScopeLocked && (
              <div className="rounded-md bg-red-50 p-3 dark:bg-red-900/20">
                <p className="text-sm font-semibold text-red-800 dark:text-red-400">
                  You chose this limit. Finish something to continue.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={formSubmitting || isScopeLocked}
              className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {formSubmitting ? 'Creating...' : 'Create Feature'}
            </button>
          </form>
        </div>

        {/* Features List */}
        <div className="rounded-lg bg-white p-6 shadow-md dark:bg-zinc-900">
          <h2 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Features
          </h2>

          {featuresLoading && (
            <p className="text-zinc-600 dark:text-zinc-400">Loading features...</p>
          )}

          {featuresError && (
            <div className="rounded-md bg-red-50 p-3 dark:bg-red-900/20">
              <p className="text-sm text-red-800 dark:text-red-400">{featuresError}</p>
            </div>
          )}

          {!featuresLoading && !featuresError && features.length === 0 && (
            <p className="text-zinc-600 dark:text-zinc-400">
              No features yet. Create your first feature above!
            </p>
          )}

          {!featuresLoading && !featuresError && features.length > 0 && (
            <div className="space-y-4">
              {features.map((feature) => (
                <div
                  key={feature.id}
                  className="flex items-start justify-between rounded-lg border border-zinc-200 p-4 dark:border-zinc-700"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                      {feature.title}
                    </h3>
                    <div className="mt-2">
                      <label htmlFor={`status-${feature.id}`} className="mr-2 text-sm text-zinc-600 dark:text-zinc-400">
                        Status:
                      </label>
                      <select
                        id={`status-${feature.id}`}
                        value={feature.status}
                        onChange={(e) => handleUpdateStatus(feature.id, e.target.value as 'planned' | 'in_progress' | 'done')}
                        className="rounded-md border border-zinc-300 px-2 py-1 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                      >
                        <option value="planned">Planned</option>
                        <option value="in_progress">In Progress</option>
                        <option value="done">Done</option>
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteFeature(feature.id)}
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

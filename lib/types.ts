export interface Project {
  id: string;
  user_id: string;
  name: string;
  deadline: string;
  feature_limit: number;
  created_at: string;
}

export interface Feature {
  id: string;
  user_id: string;
  project_id: string;
  title: string;
  status: 'planned' | 'in_progress' | 'done';
  created_at: string;
}

export type ProjectStatus = 'Blocked' | 'In Progress' | 'Planning' | 'Completed';

/**
 * Computes the status of a project based on its features and limits.
 * - Blocked: open features >= feature limit (scope locked)
 * - Completed: all features are done
 * - In Progress: has features, not blocked or completed
 * - Planning: no features yet
 */
export function computeProjectStatus(
  features: Feature[],
  featureLimit: number
): ProjectStatus {
  const openFeaturesCount = features.filter(f => f.status !== 'done').length;
  const allFeaturesDone = features.length > 0 && openFeaturesCount === 0;
  const isBlocked = openFeaturesCount >= featureLimit;

  if (isBlocked) return 'Blocked';
  if (allFeaturesDone) return 'Completed';
  if (features.length > 0) return 'In Progress';
  return 'Planning';
}

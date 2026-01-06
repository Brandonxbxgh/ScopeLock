import type { Feature } from './types';

export type ProjectStatus = 'Planning' | 'In Progress' | 'Blocked' | 'Completed';

export interface ProjectStatusInfo {
  status: ProjectStatus;
  color: string;
  textColor: string;
}

/**
 * Computes the project status based on features and feature limit
 * 
 * Status Categorization:
 * 1. Planning: The project has 0 features
 * 2. In Progress: At least one feature with status != 'done' AND open features < feature_limit
 * 3. Blocked: Open features count >= feature_limit
 * 4. Completed: All features have status = 'done'
 */
export function computeProjectStatus(
  features: Feature[],
  featureLimit: number
): ProjectStatusInfo {
  // Validate inputs
  if (!features || !Array.isArray(features)) {
    features = [];
  }
  if (!featureLimit || featureLimit < 1) {
    featureLimit = 1;
  }

  const totalFeatures = features.length;
  const openFeatures = features.filter(f => f.status !== 'done');
  const openFeaturesCount = openFeatures.length;

  // Planning: 0 features
  if (totalFeatures === 0) {
    return {
      status: 'Planning',
      color: 'bg-blue-100 dark:bg-blue-900/20',
      textColor: 'text-blue-800 dark:text-blue-400',
    };
  }

  // Completed: All features are done
  if (openFeaturesCount === 0) {
    return {
      status: 'Completed',
      color: 'bg-green-100 dark:bg-green-900/20',
      textColor: 'text-green-800 dark:text-green-400',
    };
  }

  // Blocked: Open features >= feature_limit
  if (openFeaturesCount >= featureLimit) {
    return {
      status: 'Blocked',
      color: 'bg-red-100 dark:bg-red-900/20',
      textColor: 'text-red-800 dark:text-red-400',
    };
  }

  // In Progress: Has open features but not blocked
  return {
    status: 'In Progress',
    color: 'bg-yellow-100 dark:bg-yellow-900/20',
    textColor: 'text-yellow-800 dark:text-yellow-400',
  };
}

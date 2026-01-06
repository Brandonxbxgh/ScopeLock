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

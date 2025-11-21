export interface Initiative {
  ID: number;
  Product: string | null;
  Status: string | null;
  Initiative: string | null;
  Objective: string | null;
  Deliverables: string | null;
  "Measure of Success / Outcomes": string | null;
  "User Impact / Effort": string | null;
  Priority: string | null;
  "Start Date": string | null;  // ISO date string
  "End Date": string | null;    // ISO date string
  "Quarter Due": string | null;
  "Production Live Date": string | null;
  "Product Dev Status": string | null;
  Notes: string | null;
  sort_order?: number | null;
  // New columns
  priority_rank: number | null;
  requested_by: string | null;
  engineer_assigned: string | null;
  est_hours_story_points: number | null;
  dependencies: string | null;
  tags_labels: string | null;
  epic_theme: string | null;
  business_value_roi: string | null;
  risk_level: string | null;
  external_links: string | null;
  actual_completion_date: string | null;  // ISO date string
  customer_impact: string | null;
  team: string | null;
  // Allow dynamic columns added via column manager
  [key: string]: any;
}

export type TabStatus = 'Active' | 'Completed' | 'Backlog' | 'All';

export type ProductType = string; // Allow any product name

export interface Database {
  public: {
    Tables: {
      roadmap_fields: {
        Row: Initiative;
        Insert: Omit<Initiative, 'ID'> & { ID?: number };
        Update: Partial<Omit<Initiative, 'ID'>>;
      };
    };
  };
}

export const PRIORITY_OPTIONS = ['Build Now', 'Build Next', 'On Hold'] as const;

export const QUARTER_OPTIONS = [
  'Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024',
  'Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025',
  'Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026',
  'TBD'
] as const;

export const IMPACT_EFFORT_OPTIONS = [
  'High / High', 'High / Medium', 'High / Low',
  'Medium / High', 'Medium / Medium', 'Medium / Low',
  'Low / High', 'Low / Medium', 'Low / Low'
] as const;

export const DEV_STATUS_OPTIONS = [
  'Not started',
  'Dev In progress',
  'Design In progress',
  'Design In progress, Dev In progress',
  'Completed',
  'Completed, PROD LIVE',
  'Completed, PROD LIVE, VoC In Progress',
  'Completed, PROD LIVE, VoC Completed',
  'Backlog'
] as const;


export const STATUS_OPTIONS: TabStatus[] = ['Active', 'Backlog', 'Completed', 'All'];

// Actual status values (excluding 'All' which is just a view filter)
export const ACTUAL_STATUS_OPTIONS: ('Active' | 'Completed' | 'Backlog')[] = ['Active', 'Completed', 'Backlog'];

export const RISK_LEVEL_OPTIONS = ['Low', 'Medium', 'High', 'Critical'] as const;

// Column configuration types
export type ColumnDataType = 'text' | 'integer' | 'date' | 'boolean' | 'numeric';

export interface ColumnConfig {
  id: string;
  column_name: string;
  display_name: string;
  data_type: ColumnDataType;
  is_visible: boolean;
  sort_order: number;
  is_system_column: boolean;
  is_required: boolean;
  created_at: string;
  updated_at: string;
}

// Status badge colors
export const STATUS_COLORS: Record<string, string> = {
  'Dev In progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'Not started': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  'Completed, PROD LIVE': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'Completed, PROD LIVE, VoC Completed': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  'Completed, PROD LIVE, VoC In Progress': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  'Backlog': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  'Design In progress': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'Design In progress, Dev In progress': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  'Completed': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

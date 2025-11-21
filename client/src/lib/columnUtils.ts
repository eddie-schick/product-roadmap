import type { ColumnDataType } from '@/types/database';
import {
  PRIORITY_OPTIONS,
  QUARTER_OPTIONS,
  IMPACT_EFFORT_OPTIONS,
  DEV_STATUS_OPTIONS,
  ACTUAL_STATUS_OPTIONS,
  RISK_LEVEL_OPTIONS
} from '@/types/database';

export type EditableColumnType = 'text' | 'date' | 'select' | 'textarea';

/**
 * Determines the editable column type based on column name and data type
 */
export function getColumnType(
  columnName: string,
  dataType: ColumnDataType
): EditableColumnType {
  // Date columns
  if (dataType === 'date' || columnName.toLowerCase().includes('date')) {
    return 'date';
  }

  // Select dropdowns - check by column name
  const selectColumns = [
    'Status',
    'Priority',
    'User Impact / Effort',
    'Product Dev Status',
    'Quarter Due',
    'risk_level'
  ];
  if (selectColumns.includes(columnName)) {
    return 'select';
  }

  // Textarea for long text fields
  const textareaColumns = [
    'Objective',
    'Deliverables',
    'Measure of Success / Outcomes',
    'Notes',
    'dependencies',
    'tags_labels',
    'epic_theme',
    'business_value_roi',
    'customer_impact',
    'external_links'
  ];
  if (textareaColumns.includes(columnName)) {
    return 'textarea';
  }

  // Default text input
  return 'text';
}

/**
 * Gets the options for select dropdown columns
 */
export function getColumnOptions(columnName: string): string[] | undefined {
  const optionsMap: Record<string, string[]> = {
    Status: [...ACTUAL_STATUS_OPTIONS],
    Priority: [...PRIORITY_OPTIONS],
    'User Impact / Effort': [...IMPACT_EFFORT_OPTIONS],
    'Quarter Due': [...QUARTER_OPTIONS],
    'Product Dev Status': [...DEV_STATUS_OPTIONS],
    risk_level: [...RISK_LEVEL_OPTIONS]
  };

  return optionsMap[columnName];
}


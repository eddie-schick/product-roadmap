import * as XLSX from 'xlsx';
import { supabase } from './supabase';
import type { Initiative, TabStatus, ProductType } from '@/types/database';
import { toast } from 'sonner';

/**
 * Exports ALL initiatives to Excel file (all statuses: Active, Completed, Backlog)
 * Exports ALL columns from the roadmap_fields table, including custom columns
 */
export async function exportToExcel(): Promise<void> {
  try {
    // Build query - select ALL columns (including custom columns) from ALL statuses
    // This ensures we export everything, not just visible columns
    let query = supabase
      .from('roadmap_fields')
      .select('*');

    // Order by Status first, then sort_order, then ID
    query = query.order('Status', { ascending: true })
                 .order('sort_order', { ascending: true, nullsFirst: false })
                 .order('ID', { ascending: true });

    const { data, error } = await query;

    if (error) throw error;

    if (!data || data.length === 0) {
      toast.error('No data to export');
      return;
    }

    // Convert to worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Set column widths
    const maxWidth = 30;
    const columnWidths = Object.keys(data[0] || {}).map((key) => {
      const maxLength = Math.max(
        key.length,
        ...data.map((row: any) => String(row[key] || '').length)
      );
      return { wch: Math.min(maxLength + 2, maxWidth) };
    });
    worksheet['!cols'] = columnWidths;

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Roadmap');

    // Generate filename with timestamp
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `roadmap_all_statuses_${dateStr}.xlsx`;

    // Download
    XLSX.writeFile(workbook, filename);

    // Count by status for informative message
    const statusCounts = data.reduce((acc: Record<string, number>, row: any) => {
      const status = row.Status || 'Unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const statusSummary = Object.entries(statusCounts)
      .map(([status, count]) => `${status}: ${count}`)
      .join(', ');

    toast.success(`Exported ${data.length} row${data.length !== 1 ? 's' : ''} (${statusSummary}) with all fields successfully`);
  } catch (error) {
    console.error('Export failed:', error);
    toast.error('Failed to export data');
  }
}

/**
 * Validates import data
 * Only requires ID column - accepts any other columns that exist in the table
 */
export function validateImportData(data: any[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check if data is empty
  if (!data || data.length === 0) {
    errors.push('File is empty');
    return { isValid: false, errors };
  }

  // Check required columns - only ID is required
  const requiredColumns = ['ID'];
  const firstRow = data[0];

  for (const col of requiredColumns) {
    if (!(col in firstRow)) {
      errors.push(`Missing required column: ${col}`);
    }
  }

  // Check for duplicate IDs
  const ids = data.map((row) => row.ID).filter((id) => id != null);
  const uniqueIds = new Set(ids);
  if (ids.length !== uniqueIds.size) {
    errors.push('Duplicate IDs found');
  }

  // Validate data types
  for (let i = 0; i < data.length; i++) {
    const row = data[i];

    // ID must be a number
    if (row.ID != null && isNaN(Number(row.ID))) {
      errors.push(`Row ${i + 2}: ID must be a number`);
    }

    // Validate dates - dynamically detect any column with "date" in the name (case-insensitive)
    for (const col of Object.keys(row)) {
      if (col.toLowerCase().includes('date') && row[col] && !isValidDate(row[col])) {
        errors.push(`Row ${i + 2}: ${col} is not a valid date`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Checks if a string is a valid date
 */
function isValidDate(dateString: string): boolean {
  if (!dateString) return true; // Null/empty is valid
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Cleans row data for database update
 * Handles ALL columns dynamically, including custom columns
 */
export function cleanRowData(row: any): Partial<Initiative> {
  // Remove ID from updates (it's the WHERE condition)
  const { ID, ...updates } = row;

  // Convert empty strings to null
  Object.keys(updates).forEach((key) => {
    if (updates[key] === '' || updates[key] === undefined) {
      updates[key] = null;
    }
  });

  // Parse dates - dynamically detect any column with "date" in the name (case-insensitive)
  Object.keys(updates).forEach((col) => {
    if (col.toLowerCase().includes('date') && updates[col]) {
      // Ensure proper date format
      const date = new Date(updates[col]);
      if (!isNaN(date.getTime())) {
        updates[col] = date.toISOString().split('T')[0]; // YYYY-MM-DD
      } else {
        updates[col] = null;
      }
    }
  });

  // Parse numbers - detect known numeric columns and any column that looks numeric
  // Known numeric columns
  const knownNumberColumns = ['priority_rank', 'est_hours_story_points', 'sort_order'];
  knownNumberColumns.forEach((col) => {
    if (updates[col] != null && updates[col] !== '') {
      const num = Number(updates[col]);
      updates[col] = isNaN(num) ? null : num;
    } else if (updates[col] === '') {
      updates[col] = null;
    }
  });

  // For other columns, try to detect if they should be numbers based on the value
  // (This is a best-effort approach - if it's a valid number string, convert it)
  Object.keys(updates).forEach((col) => {
    // Skip if already processed or if it's a date column
    if (knownNumberColumns.includes(col) || col.toLowerCase().includes('date')) {
      return;
    }
    
    // If the value is a string that looks like a number, try to convert it
    // But only if it's not a text field (we can't reliably detect this, so we'll be conservative)
    // For now, we'll only convert known numeric columns above
  });

  return updates;
}

/**
 * Reads and parses Excel/CSV file
 */
export async function parseImportFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error('Failed to read file'));
          return;
        }

        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          raw: false, // Keep dates as strings for parsing
          defval: null // Use null for empty cells
        });

        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Performs bulk update of initiatives
 */
export async function bulkUpdateInitiatives(
  data: any[],
  onProgress?: (progress: number) => void
): Promise<{ successCount: number; errorCount: number }> {
  let successCount = 0;
  let errorCount = 0;

  // Process in batches of 10
  const batchSize = 10;
  const total = data.length;

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);

    // Update each row
    const promises = batch.map(async (row) => {
      try {
        // Convert row to database format
        const updates = cleanRowData(row);

        const { error } = await supabase
          .from('roadmap_fields')
          .update(updates)
          .eq('ID', row.ID);

        if (error) throw error;
        successCount++;
      } catch (error) {
        console.error(`Failed to update ID ${row.ID}:`, error);
        errorCount++;
      }
    });

    await Promise.all(promises);

    // Update progress
    if (onProgress) {
      const progress = Math.round(((i + batch.length) / total) * 100);
      onProgress(progress);
    }
  }

  return { successCount, errorCount };
}


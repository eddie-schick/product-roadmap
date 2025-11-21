import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { ColumnConfig } from '@/types/database';
import { toast } from 'sonner';

// Custom event name for global column refetch
const COLUMN_REFETCH_EVENT = 'columns:refetch';

// Function to trigger a global refetch across all useColumns instances
export function triggerColumnRefetch() {
  window.dispatchEvent(new CustomEvent(COLUMN_REFETCH_EVENT));
}

export function useColumns() {
  const [columns, setColumns] = useState<ColumnConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchColumns = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('column_config')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setColumns(data || []);
    } catch (error) {
      console.error('Error fetching columns:', error);
      toast.error('Failed to fetch column configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchColumns();
    
    // Listen for global refetch events
    const handleRefetch = () => {
      fetchColumns();
    };
    
    window.addEventListener(COLUMN_REFETCH_EVENT, handleRefetch);
    
    return () => {
      window.removeEventListener(COLUMN_REFETCH_EVENT, handleRefetch);
    };
  }, []);

  // Get visible columns sorted by sort_order
  const visibleColumns = columns
    .filter(col => col.is_visible)
    .sort((a, b) => a.sort_order - b.sort_order);

  // Get system columns
  const systemColumns = columns.filter(col => col.is_system_column);

  // Get custom columns
  const customColumns = columns.filter(col => !col.is_system_column);

  return {
    columns,
    visibleColumns,
    systemColumns,
    customColumns,
    loading,
    refetch: fetchColumns
  };
}


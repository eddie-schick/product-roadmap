import { supabase } from '@/lib/supabase';
import type { ColumnConfig, ColumnDataType } from '@/types/database';
import { toast } from 'sonner';

interface AddColumnParams {
  column_name: string;
  display_name: string;
  data_type: ColumnDataType;
  is_required?: boolean;
  is_visible?: boolean;
}

interface UpdateColumnParams {
  id: string;
  display_name?: string;
  is_visible?: boolean;
  sort_order?: number;
}

// Map data types to SQL types
const sqlTypeMap: Record<ColumnDataType, string> = {
  text: 'text',
  integer: 'integer',
  date: 'date',
  boolean: 'boolean',
  numeric: 'numeric'
};

export function useColumnMutation() {
  const addColumn = async (params: AddColumnParams): Promise<ColumnConfig | null> => {
    try {
      // Validate column name format
      if (!/^[a-z][a-z0-9_]*$/.test(params.column_name)) {
        toast.error('Column name must start with lowercase letter and contain only lowercase letters, numbers, and underscores');
        return null;
      }

      // Get max sort_order
      const { data: maxData } = await supabase
        .from('column_config')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1)
        .single();

      const maxSortOrder = maxData?.sort_order ?? 0;

      // Step 1: Add to column_config
      const { data: columnData, error: columnError } = await supabase
        .from('column_config')
        .insert({
          column_name: params.column_name,
          display_name: params.display_name,
          data_type: params.data_type,
          is_visible: params.is_visible ?? true,
          sort_order: maxSortOrder + 1,
          is_system_column: false,
          is_required: params.is_required ?? false
        })
        .select()
        .single();

      if (columnError) {
        if (columnError.code === '23505') {
          toast.error('Column name already exists');
        } else {
          throw columnError;
        }
        return null;
      }

      // Step 2: Add column to roadmap_fields table via RPC
      const sqlType = sqlTypeMap[params.data_type];
      const { error: rpcError } = await supabase.rpc('add_column_to_roadmap', {
        col_name: params.column_name,
        col_type: sqlType
      });

      if (rpcError) {
        // Rollback: remove from column_config if RPC fails
        await supabase
          .from('column_config')
          .delete()
          .eq('id', columnData.id);
        throw rpcError;
      }

      toast.success('Column added successfully');
      return columnData;
    } catch (error: any) {
      console.error('Error adding column:', error);
      toast.error(error.message || 'Failed to add column');
      return null;
    }
  };

  const updateColumn = async (params: UpdateColumnParams): Promise<boolean> => {
    try {
      const updates: Partial<ColumnConfig> = {};
      if (params.display_name !== undefined) updates.display_name = params.display_name;
      if (params.is_visible !== undefined) updates.is_visible = params.is_visible;
      if (params.sort_order !== undefined) updates.sort_order = params.sort_order;

      const { error } = await supabase
        .from('column_config')
        .update(updates)
        .eq('id', params.id);

      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error('Error updating column:', error);
      toast.error(error.message || 'Failed to update column');
      return false;
    }
  };

  const deleteColumn = async (columnId: string, columnName: string): Promise<boolean> => {
    try {
      // Check if it's a system column
      const { data: column } = await supabase
        .from('column_config')
        .select('is_system_column')
        .eq('id', columnId)
        .single();

      if (column?.is_system_column) {
        toast.error('Cannot delete system columns');
        return false;
      }

      // Step 1: Remove from column_config
      const { error: deleteError } = await supabase
        .from('column_config')
        .delete()
        .eq('id', columnId);

      if (deleteError) throw deleteError;

      // Step 2: Drop column from roadmap_fields table via RPC
      const { error: rpcError } = await supabase.rpc('drop_column_from_roadmap', {
        col_name: columnName
      });

      if (rpcError) {
        // If RPC fails, try to restore column_config (best effort)
        console.error('Failed to drop column from table, but removed from config:', rpcError);
        toast.error('Column removed from config but failed to drop from table');
        return false;
      }

      toast.success('Column deleted successfully');
      return true;
    } catch (error: any) {
      console.error('Error deleting column:', error);
      toast.error(error.message || 'Failed to delete column');
      return false;
    }
  };

  const reorderColumns = async (reorderedColumnIds: string[]): Promise<boolean> => {
    try {
      // Update sort_order for all columns in parallel
      const updatePromises = reorderedColumnIds.map((id, index) => 
        supabase
          .from('column_config')
          .update({ sort_order: index })
          .eq('id', id)
      );

      // Wait for all updates to complete in parallel
      const results = await Promise.all(updatePromises);
      
      // Check for any errors
      for (const result of results) {
        if (result.error) throw result.error;
      }

      return true;
    } catch (error: any) {
      console.error('Error reordering columns:', error);
      toast.error(error.message || 'Failed to reorder columns');
      return false;
    }
  };

  return {
    addColumn,
    updateColumn,
    deleteColumn,
    reorderColumns
  };
}


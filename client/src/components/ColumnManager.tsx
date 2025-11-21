import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ColumnList } from './ColumnList';
import { AddColumnForm } from './AddColumnForm';
import { useColumns, triggerColumnRefetch } from '@/hooks/useColumns';
import { useColumnMutation } from '@/hooks/useColumnMutation';
import type { ColumnConfig } from '@/types/database';

interface ColumnManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ColumnManager({ open, onOpenChange }: ColumnManagerProps) {
  const { columns, systemColumns, customColumns, refetch } = useColumns();
  const { addColumn, updateColumn, deleteColumn, reorderColumns } = useColumnMutation();
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingColumn, setEditingColumn] = useState<ColumnConfig | null>(null);
  const [deletingColumn, setDeletingColumn] = useState<ColumnConfig | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [localColumns, setLocalColumns] = useState<ColumnConfig[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize local state when dialog opens or columns change
  useEffect(() => {
    if (open && columns.length > 0) {
      // Sort columns by sort_order to ensure proper display order
      const sortedColumns = [...columns].sort((a, b) => a.sort_order - b.sort_order);
      setLocalColumns(sortedColumns);
      setHasUnsavedChanges(false);
      setShowAddForm(false);
      setEditingColumn(null);
    }
  }, [open, columns]);

  const handleToggleVisibility = (id: string, isVisible: boolean) => {
    setLocalColumns((prev) =>
      prev.map((col) => (col.id === id ? { ...col, is_visible: isVisible } : col))
    );
    setHasUnsavedChanges(true);
  };

  const handleReorder = (reorderedIds: string[]) => {
    // Get all columns that weren't reordered (from the other group)
    const reorderedSet = new Set(reorderedIds);
    const otherColumns = localColumns.filter((col) => !reorderedSet.has(col.id));
    
    // Determine if we're reordering system or custom columns
    const firstReordered = localColumns.find((col) => col.id === reorderedIds[0]);
    const isSystemReorder = firstReordered?.is_system_column ?? false;
    
    // Calculate new sort orders
    // System columns should come first (0 to N), custom columns after (N+1 to M)
    let newSortOrder = 0;
    const reordered: ColumnConfig[] = [];
    
    if (isSystemReorder) {
      // Reorder system columns first
      for (const id of reorderedIds) {
        const col = localColumns.find((c) => c.id === id);
        if (col) {
          reordered.push({ ...col, sort_order: newSortOrder++ });
        }
      }
      // Then add custom columns (maintain their relative order)
      const sortedOther = otherColumns
        .filter((col) => !col.is_system_column)
        .sort((a, b) => a.sort_order - b.sort_order);
      for (const col of sortedOther) {
        reordered.push({ ...col, sort_order: newSortOrder++ });
      }
    } else {
      // Add system columns first (maintain their relative order)
      const sortedSystem = otherColumns
        .filter((col) => col.is_system_column)
        .sort((a, b) => a.sort_order - b.sort_order);
      for (const col of sortedSystem) {
        reordered.push({ ...col, sort_order: newSortOrder++ });
      }
      // Then reorder custom columns
      for (const id of reorderedIds) {
        const col = localColumns.find((c) => c.id === id);
        if (col) {
          reordered.push({ ...col, sort_order: newSortOrder++ });
        }
      }
    }
    
    setLocalColumns(reordered);
    setHasUnsavedChanges(true);
  };

  const handleAddColumn = async (params: {
    column_name: string;
    display_name: string;
    data_type: 'text' | 'integer' | 'date' | 'boolean' | 'numeric';
    is_required: boolean;
    is_visible: boolean;
  }) => {
    const newColumn = await addColumn(params);
    if (newColumn) {
      await refetch();
      setShowAddForm(false);
      setHasUnsavedChanges(true);
    }
  };

  const handleEditColumn = (column: ColumnConfig) => {
    setEditingColumn(column);
    setEditDisplayName(column.display_name);
  };

  const handleSaveEdit = async () => {
    if (!editingColumn) return;
    
    const success = await updateColumn({
      id: editingColumn.id,
      display_name: editDisplayName
    });
    
    if (success) {
      await refetch();
      setEditingColumn(null);
      setEditDisplayName('');
      setHasUnsavedChanges(true);
    }
  };

  const handleDeleteClick = (column: ColumnConfig) => {
    setDeletingColumn(column);
  };

  const handleConfirmDelete = async () => {
    if (!deletingColumn) return;
    
    const success = await deleteColumn(deletingColumn.id, deletingColumn.column_name);
    if (success) {
      await refetch();
      setDeletingColumn(null);
      setHasUnsavedChanges(true);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Collect all visibility updates and run them in parallel
      const visibilityUpdates = localColumns
        .map((localCol) => {
          const originalCol = columns.find((c) => c.id === localCol.id);
          if (originalCol && originalCol.is_visible !== localCol.is_visible) {
            return updateColumn({
              id: localCol.id,
              is_visible: localCol.is_visible
            });
          }
          return null;
        })
        .filter((update): update is Promise<boolean> => update !== null);

      // Run all visibility updates in parallel
      await Promise.all(visibilityUpdates);

      // Update sort order (this is already optimized to run in parallel)
      const reorderedIds = localColumns.map((col) => col.id);
      await reorderColumns(reorderedIds);

      // Reset unsaved changes flag BEFORE closing to prevent warning
      setHasUnsavedChanges(false);
      
      // Close the dialog immediately
      onOpenChange(false);
      
      // Refetch in this component and trigger global refetch after closing
      // This way the dialog closes immediately and updates happen in background
      refetch().then(() => {
        triggerColumnRefetch();
      }).catch(err => {
        console.error('Error refetching:', err);
        triggerColumnRefetch();
      });
    } catch (error) {
      console.error('Error saving column changes:', error);
      // Reset flag even on error to prevent stuck state
      setHasUnsavedChanges(false);
      // Even if there's an error, close the dialog
      // The error will be shown via toast from the mutation hooks
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to close?')) {
        setLocalColumns(columns);
        setHasUnsavedChanges(false);
        setShowAddForm(false);
        setEditingColumn(null);
        onOpenChange(false);
      }
    } else {
      onOpenChange(false);
    }
  };

  // Sort columns by sort_order to ensure proper display order
  const systemCols = localColumns
    .filter((col) => col.is_system_column)
    .sort((a, b) => a.sort_order - b.sort_order);
  const customCols = localColumns
    .filter((col) => !col.is_system_column)
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <>
      <Dialog open={open} onOpenChange={(open) => {
        // Only use handleCancel if we're closing and have unsaved changes
        // Otherwise, close directly
        if (!open && hasUnsavedChanges && !isSaving) {
          handleCancel();
        } else if (!open) {
          onOpenChange(false);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>Manage Columns</DialogTitle>
            <DialogDescription>
              Drag ≡ to reorder • Check to show/hide
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 px-6 pb-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">System Columns (cannot be deleted)</h3>
              </div>
              <ColumnList
                columns={systemCols}
                onToggleVisibility={handleToggleVisibility}
                onReorder={handleReorder}
                title=""
                showActions={false}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Custom Columns</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Column
                </Button>
              </div>

              {showAddForm && (
                <div className="border rounded-lg p-4 bg-muted/50">
                  <AddColumnForm
                    onAdd={handleAddColumn}
                    onCancel={() => setShowAddForm(false)}
                  />
                </div>
              )}

              <ColumnList
                columns={customCols}
                onToggleVisibility={handleToggleVisibility}
                onReorder={handleReorder}
                onEdit={handleEditColumn}
                onDelete={handleDeleteClick}
                title=""
                showActions={true}
              />
            </div>

            {editingColumn && (
              <div className="border rounded-lg p-4 bg-muted/50 space-y-4">
                <div className="space-y-2">
                  <Label>Display Name</Label>
                  <Input
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    placeholder="Display Name"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditingColumn(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveEdit}>Save</Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="px-6 pb-6">
            <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!hasUnsavedChanges || isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deletingColumn}
        onOpenChange={(open) => !open && setDeletingColumn(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Column</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the column "{deletingColumn?.display_name}"? 
              This will permanently remove the column from the database and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}


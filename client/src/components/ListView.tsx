import { useState, useRef, useEffect, useMemo } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowUpDown, GripVertical, Settings } from 'lucide-react';
import { Initiative } from '@/types/database';
import { StatusBadge } from './StatusBadge';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useColumns } from '@/hooks/useColumns';
import { EditableCell } from './EditableCell';
import { getColumnType, getColumnOptions } from '@/lib/columnUtils';

interface ListViewProps {
  initiatives: Initiative[];
  onRowClick: (initiative: Initiative) => void;
  onReorder?: (reorderedInitiatives: Initiative[]) => void;
  pageSize: number;
  currentPage: number;
  isEditMode?: boolean;
  savingCells?: Set<string>;
  onCellSave?: (rowId: number, columnName: string, newValue: any, immediate?: boolean) => Promise<void>;
}

interface Column {
  id: string;
  label: string;
  width: number;
  accessor: (item: Initiative) => React.ReactNode;
  dataType?: string;
}

const formatDate = (date: string | null) => date || '';

// Default column widths
const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  'Product': 220,
  'Initiative': 220,
  'Objective': 220,
  'Deliverables': 220,
  'Measure of Success / Outcomes': 220,
  'User Impact / Effort': 220,
  'Priority': 220,
  'priority_rank': 150,
  'requested_by': 220,
  'engineer_assigned': 200,
  'est_hours_story_points': 200,
  'dependencies': 220,
  'tags_labels': 200,
  'epic_theme': 200,
  'business_value_roi': 200,
  'risk_level': 150,
  'external_links': 200,
  'Quarter Due': 220,
  'Start Date': 220,
  'End Date': 220,
  'actual_completion_date': 200,
  'Production Live Date': 220,
  'Product Dev Status': 220,
  'customer_impact': 220,
  'team': 180,
  'Notes': 220,
};

// Columns that should be left-aligned
const LEFT_ALIGNED_COLUMNS = [
  'Objective',
  'Measure of Success / Outcomes',
  'Notes',
  'dependencies',
  'external_links'
];

// Create accessor function for a column
function createAccessor(columnName: string, dataType: string): (item: Initiative) => React.ReactNode {
  return (item: Initiative) => {
    const value = (item as any)[columnName];
    
    // Special handling for priority_rank - show auto-numbered value
    if (columnName === 'priority_rank') {
      // If value is null/undefined, we'll show it as empty (will be auto-numbered on reorder)
      return value ?? '';
    }
    
    if (value === null || value === undefined) {
      return '';
    }

    // Special handling for specific columns
    if (columnName === 'Product Dev Status') {
      return <StatusBadge status={value} />;
    }

    if (columnName === 'external_links' && value) {
      return (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {value}
        </a>
      );
    }

    // Format dates
    if (dataType === 'date' || columnName.includes('Date')) {
      return formatDate(value);
    }

    // Format numbers
    if (dataType === 'integer' || dataType === 'numeric') {
      return value ?? '';
    }

    return value;
  };
}

function SortableRow({ 
  initiative, 
  columns, 
  onRowClick,
  isEditMode,
  savingCells,
  onCellSave
}: { 
  initiative: Initiative; 
  columns: Column[];
  onRowClick: (initiative: Initiative) => void;
  isEditMode: boolean;
  savingCells: Set<string>;
  onCellSave?: (rowId: number, columnName: string, newValue: any, immediate?: boolean) => Promise<void>;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: initiative.ID });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      onClick={(e) => {
        // Don't trigger row click if clicking on drag handle or in edit mode
        if (!isEditMode && !(e.target as HTMLElement).closest('[data-sortable-handle]')) {
          onRowClick(initiative);
        }
      }}
      className={`border-b border-border/50 transition-colors duration-150 ${
        isEditMode ? 'hover:bg-muted/30' : 'hover:bg-muted/50 cursor-pointer'
      }`}
    >
      <td className="px-4 py-4 w-14 min-w-[56px]">
        <div 
          {...attributes} 
          {...listeners} 
          data-sortable-handle
          className="cursor-grab active:cursor-grabbing flex items-center justify-center w-full h-full transition-colors duration-150 touch-none group hover:bg-muted/50 rounded"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
        </div>
      </td>
      {columns.map((column) => {
        const isLeftAligned = LEFT_ALIGNED_COLUMNS.includes(column.id);
        const cellKey = `${initiative.ID}-${column.id}`;
        const isSaving = savingCells.has(cellKey);
        const value = (initiative as any)[column.id];

        return (
          <td
            key={column.id}
            className={`px-6 py-4 text-sm text-foreground overflow-hidden ${isLeftAligned ? 'text-left' : 'text-center'}`}
            style={{ width: column.width, minWidth: column.width, maxWidth: column.width }}
            onClick={(e) => isEditMode && e.stopPropagation()}
          >
            {isEditMode && onCellSave && column.id !== 'priority_rank' ? (
              <EditableCell
                value={value}
                columnName={column.id}
                columnType={getColumnType(column.id, column.dataType || 'text')}
                rowId={initiative.ID}
                options={getColumnOptions(column.id)}
                isEditMode={isEditMode}
                isSaving={isSaving}
                onSave={onCellSave}
                dataType={column.dataType}
              />
            ) : (
              <div className={isLeftAligned ? 'truncate' : 'truncate inline-block'}>
                {column.accessor(initiative)}
              </div>
            )}
          </td>
        );
      })}
    </tr>
  );
}

export function ListView({
  initiatives,
  onRowClick,
  onReorder,
  pageSize,
  currentPage,
  isEditMode = false,
  savingCells = new Set(),
  onCellSave
}: ListViewProps) {
  const { visibleColumns, loading: columnsLoading } = useColumns();
  
  // Store column widths in localStorage
  const [columnWidths, setColumnWidths] = useLocalStorage<Record<string, number>>(
    'roadmap-column-widths-v3',
    DEFAULT_COLUMN_WIDTHS
  );
  
  // Build columns from visible columns config
  const columns = useMemo(() => {
    if (columnsLoading || visibleColumns.length === 0) {
      return [];
    }

    return visibleColumns.map((colConfig) => {
      const columnName = colConfig.column_name;
      const width = columnWidths[columnName] ?? DEFAULT_COLUMN_WIDTHS[columnName] ?? 220;
      
        return {
        id: columnName,
        label: colConfig.display_name,
        width,
        accessor: createAccessor(columnName, colConfig.data_type),
        dataType: colConfig.data_type
      };
    });
  }, [visibleColumns, columnWidths, columnsLoading]);

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const sortedInitiatives = useMemo(() => {
    if (!sortConfig) return initiatives;

    return [...initiatives].sort((a, b) => {
      const aValue = (a as any)[sortConfig.key];
      const bValue = (b as any)[sortConfig.key];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [initiatives, sortConfig]);

  const paginatedInitiatives = useMemo(() => {
    if (pageSize === -1) return sortedInitiatives;
    const start = (currentPage - 1) * pageSize;
    return sortedInitiatives.slice(start, start + pageSize);
  }, [sortedInitiatives, pageSize, currentPage]);

  const handleSort = (columnId: string) => {
    setSortConfig((current) => {
      if (current?.key === columnId) {
        if (current.direction === 'asc') return { key: columnId, direction: 'desc' };
        return null;
      }
      return { key: columnId, direction: 'asc' };
    });
  };

  const handleResizeStart = (columnId: string, e: React.MouseEvent) => {
    e.preventDefault();
    setResizingColumn(columnId);
    resizeStartX.current = e.clientX;
    const column = columns.find(c => c.id === columnId);
    resizeStartWidth.current = column?.width || 0;
  };

  useEffect(() => {
    if (!resizingColumn) return;

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - resizeStartX.current;
      const newWidth = Math.max(80, resizeStartWidth.current + diff);
      
      setColumnWidths(prev => ({
        ...prev,
        [resizingColumn]: newWidth
      }));
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingColumn, setColumnWidths]);

  const handleRowDragEnd = (event: DragEndEvent) => {
    if (!onReorder) return;
    
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = initiatives.findIndex((i) => i.ID === active.id);
      const newIndex = initiatives.findIndex((i) => i.ID === over.id);

      const reordered = arrayMove(initiatives, oldIndex, newIndex);
      onReorder(reordered);
    }
  };


  if (columnsLoading) {
    return (
      <div className="bg-background rounded-lg border border-border shadow-sm p-12 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted border-t-primary" />
          <p className="text-muted-foreground">Loading columns...</p>
        </div>
      </div>
    );
  }

  if (columns.length === 0) {
    return (
      <div className="bg-background rounded-lg border border-border shadow-sm p-12 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Settings className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No columns configured</h3>
            <p className="text-sm text-muted-foreground">Please add columns in Manage Columns.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background rounded-lg border border-border shadow-sm overflow-hidden">
      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCenter} 
        onDragEnd={handleRowDragEnd}
      >
        <div className={`overflow-x-auto ${pageSize === -1 ? 'max-h-[calc(100vh-300px)] flex flex-col' : ''}`}>
          <div className={pageSize === -1 ? 'overflow-y-auto flex-1' : ''}>
            <table className="w-full table-fixed">
              <thead className={`${pageSize === -1 ? 'sticky top-0 z-10 bg-muted/80 backdrop-blur-sm' : 'bg-muted/50'} border-b border-border`}>
                <tr>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider border-r border-border/50 w-14 min-w-[56px]">
                    <div className="flex items-center justify-center">
                      <GripVertical className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </th>
                  {columns.map((column) => {
                    const isLeftAligned = LEFT_ALIGNED_COLUMNS.includes(column.id);
                    return (
                      <th
                        key={column.id}
                        className={`relative px-6 py-3 ${isLeftAligned ? 'text-left' : 'text-center'} text-xs font-semibold text-muted-foreground uppercase tracking-wider border-r border-border/50 last:border-r-0 overflow-hidden`}
                        style={{ width: column.width, minWidth: column.width, maxWidth: column.width }}
                      >
                        <div className={`flex items-center gap-2 ${isLeftAligned ? '' : 'justify-center'}`}>
                          <button
                            onClick={() => handleSort(column.id)}
                            className={`flex items-center gap-1 hover:text-foreground transition-colors duration-150 ${isLeftAligned ? 'flex-1 min-w-0' : ''}`}
                          >
                            <span className="truncate">{column.label}</span>
                            <ArrowUpDown className="h-3 w-3 flex-shrink-0" />
                          </button>
                        </div>
                        <div
                          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors duration-150"
                          onMouseDown={(e) => handleResizeStart(column.id, e)}
                        />
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {paginatedInitiatives.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="px-6 py-12">
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                          <Settings className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">No initiatives found</h3>
                        <p className="text-sm text-muted-foreground">Get started by creating your first initiative</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <SortableContext items={paginatedInitiatives.map(i => i.ID)} strategy={verticalListSortingStrategy}>
                    {paginatedInitiatives.map((initiative) => (
                      <SortableRow
                        key={initiative.ID}
                        initiative={initiative}
                        columns={columns}
                        onRowClick={onRowClick}
                        isEditMode={isEditMode}
                        savingCells={savingCells}
                        onCellSave={onCellSave}
                      />
                    ))}
                  </SortableContext>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </DndContext>
    </div>
  );
}

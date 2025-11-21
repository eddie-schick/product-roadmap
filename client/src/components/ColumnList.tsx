import { useState } from 'react';
import { GripVertical, Edit2, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ColumnConfig } from '@/types/database';

interface ColumnListProps {
  columns: ColumnConfig[];
  onToggleVisibility: (id: string, isVisible: boolean) => void;
  onReorder: (reorderedIds: string[]) => void;
  onEdit?: (column: ColumnConfig) => void;
  onDelete?: (column: ColumnConfig) => void;
  title: string;
  showActions?: boolean;
}

function SortableColumnItem({
  column,
  onToggleVisibility,
  onEdit,
  onDelete,
  showActions
}: {
  column: ColumnConfig;
  onToggleVisibility: (id: string, isVisible: boolean) => void;
  onEdit?: (column: ColumnConfig) => void;
  onDelete?: (column: ColumnConfig) => void;
  showActions?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 px-4 py-3 rounded-md border ${
        isDragging ? 'bg-accent' : 'bg-background'
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      <Checkbox
        checked={column.is_visible}
        onCheckedChange={(checked) => onToggleVisibility(column.id, checked === true)}
      />
      <span className="flex-1 text-sm">
        {column.display_name}
        {column.is_required && (
          <span className="text-muted-foreground ml-2 text-xs">(required)</span>
        )}
      </span>
      {showActions && onEdit && onDelete && (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onEdit(column)}
            className="h-7 w-7"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onDelete(column)}
            className="h-7 w-7 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

export function ColumnList({
  columns,
  onToggleVisibility,
  onReorder,
  onEdit,
  onDelete,
  title,
  showActions = false
}: ColumnListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = columns.findIndex((col) => col.id === active.id);
      const newIndex = columns.findIndex((col) => col.id === over.id);

      const reorderedColumns = arrayMove(columns, oldIndex, newIndex);
      const reorderedIds = reorderedColumns.map((col) => col.id);
      onReorder(reorderedIds);
    }
  };

  if (columns.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={columns.map((col) => col.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {columns.map((column) => (
              <SortableColumnItem
                key={column.id}
                column={column}
                onToggleVisibility={onToggleVisibility}
                onEdit={onEdit}
                onDelete={onDelete}
                showActions={showActions}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}


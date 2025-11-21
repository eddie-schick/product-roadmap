import { useState, useEffect } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { Initiative } from '@/types/database';

interface EditableCellProps {
  value: any;
  columnName: string;
  columnType: 'text' | 'date' | 'select' | 'textarea';
  rowId: number;
  options?: string[];
  isEditMode: boolean;
  isSaving: boolean;
  onSave: (rowId: number, columnName: string, newValue: any, immediate?: boolean) => Promise<void>;
  dataType?: string;
}

export function EditableCell({
  value,
  columnName,
  columnType,
  rowId,
  options,
  isEditMode,
  isSaving,
  onSave,
  dataType
}: EditableCellProps) {
  const [localValue, setLocalValue] = useState(value);

  // Update local value when prop value changes (e.g., after save or external update)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleSave = useDebouncedCallback(async (newValue: any) => {
    console.log('EditableCell handleSave called:', { rowId, columnName, newValue, currentValue: value });
    if (newValue !== value) {
      console.log('Values differ, calling onSave');
      await onSave(rowId, columnName, newValue);
    } else {
      console.log('Values are the same, skipping save');
    }
  }, 500);

  const handleBlur = async () => {
    console.log('EditableCell handleBlur called:', { rowId, columnName, localValue });
    // Cancel any pending debounced save
    handleSave.cancel();
    // Save immediately on blur
    if (localValue !== value) {
      await onSave(rowId, columnName, localValue, true);
    }
  };

  const handleSelectChange = (newValue: string) => {
    // Convert empty string to null for database
    const valueToSave = newValue === '__NULL__' ? null : newValue;
    setLocalValue(valueToSave);
    // Auto-save immediately for selects
    onSave(rowId, columnName, valueToSave, true);
  };

  if (!isEditMode) {
    // Display mode - show formatted value
    if (value === null || value === undefined || value === '') {
      return <div className="p-2 text-muted-foreground">—</div>;
    }
    
    // Format dates
    if (dataType === 'date' || columnName.includes('Date')) {
      return <div className="p-2">{value}</div>;
    }
    
    return <div className="p-2">{String(value)}</div>;
  }

  // Edit mode - render appropriate input
  return (
    <div className="relative">
      {columnType === 'text' && (
        <Input
          type="text"
          value={localValue || ''}
          onChange={(e) => {
            console.log('EditableCell text onChange:', { rowId, columnName, newValue: e.target.value });
            setLocalValue(e.target.value);
          }}
          onBlur={handleBlur}
          className="w-full h-8 text-sm border-primary/50 focus:border-primary"
          disabled={isSaving}
        />
      )}

      {columnType === 'textarea' && (
        <Textarea
          value={localValue || ''}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          className="w-full min-h-[60px] text-sm border-primary/50 focus:border-primary resize-none"
          disabled={isSaving}
          rows={2}
        />
      )}

      {columnType === 'date' && (
        <Input
          type="date"
          value={localValue ? (typeof localValue === 'string' ? localValue.split('T')[0] : new Date(localValue).toISOString().split('T')[0]) : ''}
          onChange={(e) => {
            const newValue = e.target.value || null;
            setLocalValue(newValue);
            // For dates, save immediately (no debounce needed)
            if (newValue !== value) {
              onSave(rowId, columnName, newValue, true);
            }
          }}
          className="w-full h-8 text-sm border-primary/50 focus:border-primary"
          disabled={isSaving}
        />
      )}

      {columnType === 'select' && (
        <Select
          value={localValue == null || localValue === '' ? '__NULL__' : localValue}
          onValueChange={handleSelectChange}
          disabled={isSaving}
        >
          <SelectTrigger className="w-full h-8 text-sm border-primary/50 focus:border-primary">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__NULL__">—</SelectItem>
            {options?.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {isSaving && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <Loader2 className="h-3 w-3 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
}


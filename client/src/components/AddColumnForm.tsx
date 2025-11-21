import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import type { ColumnDataType } from '@/types/database';

interface AddColumnFormProps {
  onAdd: (params: {
    column_name: string;
    display_name: string;
    data_type: ColumnDataType;
    is_required: boolean;
    is_visible: boolean;
  }) => Promise<void>;
  onCancel: () => void;
}

export function AddColumnForm({ onAdd, onCancel }: AddColumnFormProps) {
  const [columnName, setColumnName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [dataType, setDataType] = useState<ColumnDataType>('text');
  const [isRequired, setIsRequired] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!columnName.trim() || !displayName.trim()) {
      return;
    }

    // Validate column name format
    if (!/^[a-z][a-z0-9_]*$/.test(columnName)) {
      alert('Column name must start with a lowercase letter and contain only lowercase letters, numbers, and underscores');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAdd({
        column_name: columnName,
        display_name: displayName,
        data_type: dataType,
        is_required: isRequired,
        is_visible: isVisible
      });
      // Reset form
      setColumnName('');
      setDisplayName('');
      setDataType('text');
      setIsRequired(false);
      setIsVisible(true);
    } catch (error) {
      console.error('Error adding column:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="column-name">
          Column Name (internal) <span className="text-destructive">*</span>
        </Label>
        <Input
          id="column-name"
          value={columnName}
          onChange={(e) => setColumnName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
          placeholder="requested_by"
          required
          pattern="^[a-z][a-z0-9_]*$"
        />
        <p className="text-xs text-muted-foreground">
          lowercase, underscores, no spaces
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="display-name">
          Display Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="display-name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Requested By"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="data-type">
          Data Type <span className="text-destructive">*</span>
        </Label>
        <Select value={dataType} onValueChange={(value) => setDataType(value as ColumnDataType)}>
          <SelectTrigger id="data-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="integer">Integer</SelectItem>
            <SelectItem value="numeric">Numeric</SelectItem>
            <SelectItem value="date">Date</SelectItem>
            <SelectItem value="boolean">Boolean</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="is-required"
          checked={isRequired}
          onCheckedChange={(checked) => setIsRequired(checked === true)}
        />
        <Label htmlFor="is-required" className="cursor-pointer">
          Required field
        </Label>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="is-visible"
          checked={isVisible}
          onCheckedChange={(checked) => setIsVisible(checked === true)}
        />
        <Label htmlFor="is-visible" className="cursor-pointer">
          Show in table by default
        </Label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !columnName.trim() || !displayName.trim()}>
          {isSubmitting ? 'Adding...' : 'Add Column'}
        </Button>
      </div>
    </form>
  );
}


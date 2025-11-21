import { useState, useEffect } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Initiative, TabStatus } from '@/types/database';
import {
  PRIORITY_OPTIONS,
  QUARTER_OPTIONS,
  IMPACT_EFFORT_OPTIONS,
  DEV_STATUS_OPTIONS,
  ACTUAL_STATUS_OPTIONS,
  RISK_LEVEL_OPTIONS
} from '@/types/database';

interface InitiativePopupProps {
  initiative: Initiative | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (id: number, updates: Partial<Initiative>) => Promise<boolean>;
  onDelete: (id: number) => Promise<boolean>;
  onCreate?: (initiative: Partial<Initiative>) => Promise<Initiative | null>;
}

export function InitiativePopup({ initiative, open, onClose, onUpdate, onDelete, onCreate }: InitiativePopupProps) {
  const [formData, setFormData] = useState<Partial<Initiative>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [creating, setCreating] = useState(false);

  const isNewInitiative = !initiative || !initiative.ID;

  useEffect(() => {
    if (initiative) {
      setFormData(initiative);
    } else {
      // Reset form data when no initiative (shouldn't happen, but safety check)
      setFormData({});
    }
  }, [initiative]);

  const debouncedSave = useDebouncedCallback(async (updates: Partial<Initiative>) => {
    // Only auto-save for existing initiatives
    if (!initiative || !initiative.ID) return;
    
    setSaving(true);
    const success = await onUpdate(initiative.ID, updates);
    setSaving(false);
    
    if (success) {
      toast.success('Saved');
    }
  }, 500);

  const handleFieldChange = (field: keyof Initiative, value: any) => {
    const updates = { [field]: value };
    setFormData(prev => ({ ...prev, ...updates }));
    
    // Only auto-save for existing initiatives
    if (!isNewInitiative) {
      debouncedSave(updates);
    }
  };

  const handleCreate = async () => {
    if (!onCreate) return;
    
    setCreating(true);
    try {
      const newInitiative = await onCreate(formData);
      if (newInitiative) {
        toast.success('Initiative created');
        onClose();
      }
    } catch (error) {
      console.error('Error creating initiative:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!initiative || !initiative.ID) return;
    
    if (!confirm('Are you sure you want to delete this initiative?')) return;
    
    setDeleting(true);
    const success = await onDelete(initiative.ID);
    setDeleting(false);
    
    if (success) {
      onClose();
    }
  };

  // Allow popup to show even for new initiatives (draft state)
  if (!initiative && !onCreate) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0 shadow-xl flex flex-col" showCloseButton={false}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30 flex-shrink-0">
          <DialogTitle className="text-xl font-semibold text-foreground">
            Initiative Details
          </DialogTitle>
          <div className="flex items-center gap-4">
            {saving && (
              <span className="text-sm font-normal text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </span>
            )}
            <button
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all duration-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-6 min-h-0">
          <div className="space-y-6">
            {/* Move to dropdown */}
            <div className="pb-6 border-b border-border">
              <Label className="block text-sm font-medium text-foreground mb-2">Move to</Label>
              <Select
                value={formData.Status || ''}
                onValueChange={(value) => handleFieldChange('Status', value)}
              >
                <SelectTrigger className="w-48 shadow-sm">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {ACTUAL_STATUS_OPTIONS.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Two-column grid for fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Product */}
              <div className="space-y-2">
                <Label className="block text-sm font-medium text-foreground">Product</Label>
                <Input
                  value={formData.Product || ''}
                  onChange={(e) => handleFieldChange('Product', e.target.value)}
                  placeholder="Enter product name"
                  className="shadow-sm focus:ring-2 focus:ring-primary/50 transition-all duration-200"
                />
              </div>

              {/* Initiative */}
              <div className="space-y-2">
                <Label className="block text-sm font-medium text-foreground">Initiative</Label>
                <Input
                  value={formData.Initiative || ''}
                  onChange={(e) => handleFieldChange('Initiative', e.target.value)}
                  className="shadow-sm focus:ring-2 focus:ring-primary/50 transition-all duration-200"
                />
            </div>

              {/* Objective - full width */}
              <div className="space-y-2 md:col-span-2">
                <Label className="block text-sm font-medium text-foreground">Objective</Label>
                <Textarea
                  value={formData.Objective || ''}
                  onChange={(e) => handleFieldChange('Objective', e.target.value)}
                  rows={3}
                  className="shadow-sm focus:ring-2 focus:ring-primary/50 transition-all duration-200 resize-none"
                />
              </div>

            {/* Deliverables - full width */}
            <div className="space-y-2 md:col-span-2">
              <Label>Deliverables</Label>
              <Textarea
                value={formData.Deliverables || ''}
                onChange={(e) => handleFieldChange('Deliverables', e.target.value)}
                rows={3}
              />
            </div>

            {/* Measure of Success - full width */}
            <div className="space-y-2 md:col-span-2">
              <Label>Measure of Success / Outcomes</Label>
              <Textarea
                value={formData['Measure of Success / Outcomes'] || ''}
                onChange={(e) => handleFieldChange('Measure of Success / Outcomes', e.target.value)}
                rows={2}
              />
            </div>

            {/* User Impact / Effort */}
            <div className="space-y-2">
              <Label>User Impact / Effort</Label>
              <Select
                value={formData['User Impact / Effort'] || ''}
                onValueChange={(value) => handleFieldChange('User Impact / Effort', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select impact/effort" />
                </SelectTrigger>
                <SelectContent>
                  {IMPACT_EFFORT_OPTIONS.map(option => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={formData.Priority || ''}
                onValueChange={(value) => handleFieldChange('Priority', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map(priority => (
                    <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority Rank */}
            <div className="space-y-2">
              <Label>Priority Rank</Label>
              <Input
                type="number"
                value={formData.priority_rank ?? ''}
                onChange={(e) => handleFieldChange('priority_rank', e.target.value ? parseInt(e.target.value) : null)}
              />
            </div>

            {/* Requested By */}
            <div className="space-y-2">
              <Label>Requested By</Label>
              <Input
                value={formData.requested_by || ''}
                onChange={(e) => handleFieldChange('requested_by', e.target.value)}
              />
            </div>

            {/* Engineer Assigned */}
            <div className="space-y-2">
              <Label>Engineer Assigned</Label>
              <Input
                value={formData.engineer_assigned || ''}
                onChange={(e) => handleFieldChange('engineer_assigned', e.target.value)}
              />
            </div>

            {/* Est. Hours / Story Points */}
            <div className="space-y-2">
              <Label>Est. Hours / Story Points</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.est_hours_story_points ?? ''}
                onChange={(e) => handleFieldChange('est_hours_story_points', e.target.value ? parseFloat(e.target.value) : null)}
              />
            </div>

            {/* Dependencies */}
            <div className="space-y-2 md:col-span-2">
              <Label>Dependencies</Label>
              <Textarea
                value={formData.dependencies || ''}
                onChange={(e) => handleFieldChange('dependencies', e.target.value)}
                rows={2}
              />
            </div>

            {/* Tags / Labels */}
            <div className="space-y-2">
              <Label>Tags / Labels</Label>
              <Input
                value={formData.tags_labels || ''}
                onChange={(e) => handleFieldChange('tags_labels', e.target.value)}
              />
            </div>

            {/* Epic / Theme */}
            <div className="space-y-2">
              <Label>Epic / Theme</Label>
              <Input
                value={formData.epic_theme || ''}
                onChange={(e) => handleFieldChange('epic_theme', e.target.value)}
              />
            </div>

            {/* Business Value / ROI */}
            <div className="space-y-2">
              <Label>Business Value / ROI</Label>
              <Input
                value={formData.business_value_roi || ''}
                onChange={(e) => handleFieldChange('business_value_roi', e.target.value)}
              />
            </div>

            {/* Risk Level */}
            <div className="space-y-2">
              <Label>Risk Level</Label>
              <Select
                value={formData.risk_level || ''}
                onValueChange={(value) => handleFieldChange('risk_level', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select risk level" />
                </SelectTrigger>
                <SelectContent>
                  {RISK_LEVEL_OPTIONS.map(risk => (
                    <SelectItem key={risk} value={risk}>{risk}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* External Links */}
            <div className="space-y-2 md:col-span-2">
              <Label>External Links</Label>
              <Input
                type="url"
                value={formData.external_links || ''}
                onChange={(e) => handleFieldChange('external_links', e.target.value)}
              />
            </div>

            {/* Customer Impact */}
            <div className="space-y-2">
              <Label>Customer Impact</Label>
              <Input
                value={formData.customer_impact || ''}
                onChange={(e) => handleFieldChange('customer_impact', e.target.value)}
              />
            </div>

            {/* Team */}
            <div className="space-y-2">
              <Label>Team</Label>
              <Input
                value={formData.team || ''}
                onChange={(e) => handleFieldChange('team', e.target.value)}
              />
            </div>

            {/* Quarter Due */}
            <div className="space-y-2">
              <Label>Quarter Due</Label>
              <Select
                value={formData['Quarter Due'] || ''}
                onValueChange={(value) => handleFieldChange('Quarter Due', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select quarter" />
                </SelectTrigger>
                <SelectContent>
                  {QUARTER_OPTIONS.map(quarter => (
                    <SelectItem key={quarter} value={quarter}>{quarter}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={formData['Start Date'] || ''}
                onChange={(e) => handleFieldChange('Start Date', e.target.value)}
              />
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={formData['End Date'] || ''}
                onChange={(e) => handleFieldChange('End Date', e.target.value)}
              />
            </div>

            {/* Actual Completion Date */}
            <div className="space-y-2">
              <Label>Actual Completion Date</Label>
              <Input
                type="date"
                value={formData.actual_completion_date || ''}
                onChange={(e) => handleFieldChange('actual_completion_date', e.target.value)}
              />
            </div>

            {/* Production Live Date */}
            <div className="space-y-2">
              <Label>Production Live Date</Label>
              <Input
                value={formData['Production Live Date'] || ''}
                onChange={(e) => handleFieldChange('Production Live Date', e.target.value)}
              />
            </div>

            {/* Product Dev Status */}
            <div className="space-y-2 md:col-span-2">
              <Label>Product Dev Status</Label>
              <Select
                value={formData['Product Dev Status'] || ''}
                onValueChange={(value) => handleFieldChange('Product Dev Status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {DEV_STATUS_OPTIONS.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes - full width */}
            <div className="space-y-2 md:col-span-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.Notes || ''}
                onChange={(e) => handleFieldChange('Notes', e.target.value)}
                rows={4}
              />
            </div>
          </div>

          </div>
        </div>

        {/* Footer with actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/30 flex-shrink-0">
          <div className="text-sm text-muted-foreground">
            {isNewInitiative 
              ? 'Fill in the details and click Create to add this initiative'
              : saving 
                ? 'Saving...' 
                : 'All changes saved automatically'}
          </div>
          <div className="flex items-center gap-3">
            {isNewInitiative ? (
              <>
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="shadow-sm transition-all duration-200 hover:shadow-md"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={creating}
                  className="gap-2 shadow-sm transition-all duration-200 hover:shadow-md"
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Initiative'
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="shadow-sm transition-all duration-200 hover:shadow-md"
                >
                  Done
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="gap-2 shadow-sm transition-all duration-200 hover:shadow-md"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Delete Initiative
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

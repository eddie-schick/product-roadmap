import { useEffect, useRef, useState } from 'react';
import type { Initiative } from '@/types/database';
import { quarterToDateRange } from '@/lib/dateUtils';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
// @ts-ignore - frappe-gantt doesn't have types
import Gantt from 'frappe-gantt';

interface GanttViewProps {
  onTaskClick: (initiative: Initiative) => void;
  onDateChange: (id: number, startDate: string, endDate: string) => Promise<void>;
}

function getDateRange(initiative: Initiative): { start: Date; end: Date } {
  let startDate: Date;
  let endDate: Date;

  // Use Start Date if available
  if (initiative['Start Date']) {
    startDate = new Date(initiative['Start Date']);
  } else if (initiative['Quarter Due']) {
    // Derive from Quarter Due
    const range = quarterToDateRange(initiative['Quarter Due']);
    startDate = range.start;
  } else {
    // Default to current date
    startDate = new Date();
  }

  // Use End Date if available
  if (initiative['End Date']) {
    endDate = new Date(initiative['End Date']);
  } else if (initiative['Quarter Due']) {
    // Derive from Quarter Due
    const range = quarterToDateRange(initiative['Quarter Due']);
    endDate = range.end;
  } else {
    // Default to 3 months from start
    endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 3);
  }

  return { start: startDate, end: endDate };
}

function getStatusColor(status: string | null): string {
  switch (status) {
    case 'Active':
      return 'gantt-active';
    case 'Completed':
      return 'gantt-completed';
    case 'Backlog':
      return 'gantt-backlog';
    default:
      return 'gantt-default';
  }
}

function getProgress(init: Initiative): number {
  // Calculate progress based on status
  if (init.Status === 'Completed') return 100;
  if (init.Status === 'Backlog') return 0;

  // For Active, estimate based on dev status
  const devStatus = init['Product Dev Status'];
  if (devStatus?.includes('Completed')) return 100;
  if (devStatus?.includes('In progress')) return 50;
  if (devStatus?.includes('Not started')) return 0;

  return 25; // Default for Active
}

function transformToGanttTasks(initiatives: Initiative[]) {
  return initiatives.map((init) => {
    const { start, end } = getDateRange(init);
    const statusColor = getStatusColor(init.Status);

    // Build name with priority rank
    let name = init.Initiative || 'Untitled';
    if (init.priority_rank !== null && init.priority_rank !== undefined) {
      name = `#${init.priority_rank} ${name}`;
    }

    return {
      id: init.ID.toString(),
      name: name,
      start: start.toISOString().split('T')[0], // YYYY-MM-DD
      end: end.toISOString().split('T')[0],
      progress: getProgress(init),
      custom_class: statusColor,
      initiative: init // Store full object for click handler
    };
  });
}

export function GanttView({ onTaskClick, onDateChange }: GanttViewProps) {
  const ganttRef = useRef<HTMLDivElement>(null);
  const ganttInstance = useRef<any>(null);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'Day' | 'Week' | 'Month' | 'Year'>('Month');

  // Fetch ALL initiatives regardless of Status
  useEffect(() => {
    async function fetchGanttData() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('roadmap_fields')
          .select('*')
          .order('Status', { ascending: true }) // Group by Status first
          .order('priority_rank', { ascending: true, nullsFirst: false }); // Then by priority_rank

        if (error) throw error;
        setInitiatives(data || []);
      } catch (error) {
        console.error('Error fetching Gantt data:', error);
        toast.error('Failed to fetch initiatives');
      } finally {
        setLoading(false);
      }
    }

    fetchGanttData();
  }, []);

  useEffect(() => {
    if (!ganttRef.current || initiatives.length === 0 || loading) return;

    const tasks = transformToGanttTasks(initiatives);

    if (tasks.length === 0) {
      console.log('No tasks to display');
      return;
    }

    // Destroy existing instance
    if (ganttInstance.current) {
      ganttRef.current.innerHTML = '';
      ganttInstance.current = null;
    }

    try {
      // Create new Gantt instance
      ganttInstance.current = new Gantt(ganttRef.current, tasks, {
      view_mode: viewMode,
      date_format: 'YYYY-MM-DD',

      // Bar styling
      bar_height: 30,
      bar_corner_radius: 3,
      arrow_curve: 5,
      padding: 18,

      // View options
      view_modes: ['Quarter Day', 'Half Day', 'Day', 'Week', 'Month', 'Year'],

      // Event handlers
      on_click: (task: any) => {
        const initiative = initiatives.find((i) => i.ID.toString() === task.id);
        if (initiative) {
          onTaskClick(initiative);
        }
      },

      on_date_change: async (task: any, start: Date, end: Date) => {
        try {
          const startStr = start.toISOString().split('T')[0];
          const endStr = end.toISOString().split('T')[0];
          await onDateChange(parseInt(task.id), startStr, endStr);
          // Refresh data after date change
          const { data, error } = await supabase
            .from('roadmap_fields')
            .select('*')
            .order('Status', { ascending: true })
            .order('priority_rank', { ascending: true, nullsFirst: false });
          if (error) throw error;
          if (data) setInitiatives(data);
        } catch (error) {
          console.error('Failed to update dates:', error);
          toast.error('Failed to update dates');
        }
      },

      on_progress_change: (task: any, progress: number) => {
        // Optional: Update progress
      },

      on_view_change: (mode: string) => {
        console.log('View mode:', mode);
      },

      // Custom popup
      custom_popup_html: (task: any) => {
        const initiative = initiatives.find((i) => i.ID.toString() === task.id);
        if (!initiative) return '';

        return `
          <div class="gantt-popup">
            <h3>${task.name}</h3>
            <p><strong>Status:</strong> ${initiative.Status || 'N/A'}</p>
            <p><strong>Priority Rank:</strong> ${initiative.priority_rank || 'N/A'}</p>
            <p><strong>Product:</strong> ${initiative.Product || 'N/A'}</p>
            <p><strong>Dates:</strong> ${task.start} to ${task.end}</p>
            <p><strong>Engineer:</strong> ${initiative.engineer_assigned || 'Unassigned'}</p>
            <p class="text-sm text-gray-600">Click to edit</p>
          </div>
        `;
      }
      });

      // Auto-scroll to current date
      setTimeout(() => {
        const todayElements = ganttRef.current?.querySelectorAll('.today-highlight');
        if (todayElements && todayElements.length > 0) {
          todayElements[0].scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }
      }, 100);
    } catch (error) {
      console.error('Error initializing Gantt chart:', error);
      toast.error('Failed to render Gantt chart');
    }
  }, [initiatives, loading, viewMode, onTaskClick, onDateChange]);

  const handleViewModeChange = (mode: 'Day' | 'Week' | 'Month' | 'Year') => {
    setViewMode(mode);
    if (ganttInstance.current) {
      ganttInstance.current.change_view_mode(mode);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading Gantt chart...</div>
      </div>
    );
  }

  return (
    <div className="bg-background p-4 rounded-lg border border-border">
      {/* View mode toggle */}
      <div className="mb-4 flex gap-2 flex-wrap">
        <Button
          variant={viewMode === 'Day' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleViewModeChange('Day')}
        >
          Day
        </Button>
        <Button
          variant={viewMode === 'Week' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleViewModeChange('Week')}
        >
          Week
        </Button>
        <Button
          variant={viewMode === 'Month' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleViewModeChange('Month')}
        >
          Month
        </Button>
        <Button
          variant={viewMode === 'Year' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleViewModeChange('Year')}
        >
          Year
        </Button>
      </div>

      {/* Gantt chart */}
      <style>{`
        /* Frappe Gantt base styles */
        :root {
          --g-arrow-color: #1f2937;
          --g-bar-color: #fff;
          --g-bar-border: #fff;
          --g-tick-color-thick: #ededed;
          --g-tick-color: #f3f3f3;
          --g-actions-background: #f3f3f3;
          --g-border-color: #ebeff2;
          --g-text-muted: #7c7c7c;
          --g-text-light: #fff;
          --g-text-dark: #171717;
          --g-progress-color: #dbdbdb;
          --g-handle-color: #37352f;
          --g-header-background: #fff;
          --g-row-color: #fdfdfd;
          --g-row-border-color: #c7c7c7;
          --g-today-highlight: #37352f;
        }
        
        .gantt-container {
          line-height: 14.5px;
          position: relative;
          overflow: auto;
          font-size: 12px;
          width: 100%;
          border-radius: 8px;
          overflow-x: auto;
          overflow-y: auto;
          max-height: calc(100vh - 400px);
          min-height: 400px;
          background: white !important;
          border: 1px solid #e5e7eb;
        }
        
        .gantt {
          user-select: none;
          -webkit-user-select: none;
          position: absolute;
          background: white !important;
        }
        
        .gantt-container svg {
          background: white !important;
          display: block;
        }
        
        .gantt .grid-background {
          fill: none;
        }
        
        .gantt .grid-row {
          fill: var(--g-row-color);
        }
        
        .gantt .row-line {
          stroke: var(--g-border-color);
        }
        
        .gantt .tick {
          stroke: var(--g-tick-color);
          stroke-width: 0.4;
        }
        
        .gantt .tick.thick {
          stroke: var(--g-tick-color-thick);
          stroke-width: 0.7;
        }
        
        .gantt .arrow {
          fill: none;
          stroke: var(--g-arrow-color);
          stroke-width: 1.5;
        }
        
        .gantt .bar-wrapper {
          cursor: pointer;
        }
        
        .gantt .bar-wrapper .bar {
          fill: var(--g-bar-color);
          stroke: var(--g-bar-border);
          stroke-width: 0;
          transition: stroke-width 0.3s ease;
          outline: 1px solid var(--g-row-border-color);
          border-radius: 3px;
        }
        
        .gantt .bar-progress {
          fill: var(--g-progress-color);
          border-radius: 4px;
        }
        
        .gantt .bar-label {
          fill: var(--g-text-dark);
          dominant-baseline: central;
          font-family: Helvetica;
          font-size: 13px;
          font-weight: 400;
        }
        
        .gantt .bar-label.big {
          fill: var(--g-text-dark);
          text-anchor: start;
        }
        
        .gantt .handle {
          fill: var(--g-handle-color);
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        
        .gantt .handle.active,
        .gantt .handle.visible {
          cursor: ew-resize;
          opacity: 1;
        }
        
        .gantt-container .grid-header {
          background-color: var(--g-header-background);
          position: sticky;
          top: 0;
          left: 0;
          border-bottom: 1px solid var(--g-row-border-color);
          z-index: 1000;
        }
        
        .gantt-container .lower-text,
        .gantt-container .upper-text {
          text-anchor: middle;
        }
        
        .gantt-container .lower-text {
          font-size: 12px;
          color: var(--g-text-muted);
        }
        
        .gantt-container .upper-text {
          font-weight: 500;
          font-size: 14px;
          color: var(--g-text-dark);
        }
        
        .gantt-container .current-highlight {
          position: absolute;
          background: var(--g-today-highlight);
          width: 1px;
          z-index: 999;
        }
        
        /* Status-based bar colors */
        .gantt-active .bar {
          fill: #3B82F6 !important;  /* Blue for Active */
        }
        .gantt-active .bar-progress {
          fill: #2563EB !important;  /* Darker blue for progress */
        }
        .gantt-completed .bar {
          fill: #10B981 !important;  /* Green for Completed */
        }
        .gantt-completed .bar-progress {
          fill: #059669 !important;  /* Darker green */
        }
        .gantt-backlog .bar {
          fill: #F59E0B !important;  /* Orange/Yellow for Backlog */
        }
        .gantt-backlog .bar-progress {
          fill: #D97706 !important;  /* Darker orange */
        }
        .gantt-default .bar {
          fill: #6B7280 !important;  /* Gray for undefined */
        }
        .gantt-default .bar-progress {
          fill: #4B5563 !important;
        }
        
        .gantt .bar-label {
          fill: #fff;
          font-size: 12px;
          font-weight: 600;
        }
        .gantt .grid-header {
          fill: #f9fafb;
          stroke: #e5e7eb;
          stroke-width: 1;
        }
        .gantt .grid-row {
          fill: #fff;
        }
        .gantt .grid-row:nth-child(even) {
          fill: #f9fafb;
        }
        .gantt .today-highlight {
          fill: rgba(239, 68, 68, 0.1);
          stroke: #EF4444;
          stroke-width: 2;
        }
        .gantt .arrow {
          stroke: #6b7280;
        }
        .gantt .lower-text, .gantt .upper-text {
          fill: #374151;
          font-size: 12px;
        }
        .gantt .tick {
          stroke: #e5e7eb;
          stroke-width: 1;
        }
        .gantt svg {
          background: white !important;
          display: block;
        }
        .gantt .bar:hover {
          opacity: 0.9;
          cursor: pointer;
        }
        .gantt-container > svg {
          background: white !important;
        }
        
        /* Custom popup styling */
        .gantt-popup {
          padding: 12px;
          min-width: 250px;
        }
        .gantt-popup h3 {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .gantt-popup p {
          margin: 4px 0;
          font-size: 14px;
        }
      `}</style>
      <div ref={ganttRef} className="gantt-container" style={{ width: '100%', minHeight: '400px' }} />
    </div>
  );
}

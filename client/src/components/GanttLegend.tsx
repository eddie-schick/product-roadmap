export function GanttLegend() {
  return (
    <div className="bg-muted/30 border-b border-border px-6 py-3">
      <div className="flex items-center gap-6 flex-wrap">
        <span className="text-sm font-medium text-foreground">Status:</span>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded shadow-sm" style={{ backgroundColor: '#3B82F6' }}></div>
          <span className="text-sm text-foreground">Active</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded shadow-sm" style={{ backgroundColor: '#10B981' }}></div>
          <span className="text-sm text-foreground">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded shadow-sm" style={{ backgroundColor: '#F59E0B' }}></div>
          <span className="text-sm text-foreground">Backlog</span>
        </div>
      </div>
    </div>
  );
}


import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, List, Calendar, Settings, Edit, Download, Upload, Search, BarChart3 } from 'lucide-react';
import type { ProductType } from '@/types/database';

interface HeaderProps {
  view: 'list' | 'gantt';
  onViewChange: (view: 'list' | 'gantt') => void;
  productFilter: ProductType | 'All';
  onProductFilterChange: (filter: ProductType | 'All') => void;
  availableProducts: string[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onNewInitiative: () => void;
  onManageColumns: () => void;
  isEditMode: boolean;
  onEditModeToggle: () => void;
  savingCells: number;
  onExport: () => void;
  onImport: () => void;
}

export function Header({
  view,
  onViewChange,
  productFilter,
  onProductFilterChange,
  availableProducts,
  searchTerm,
  onSearchChange,
  onNewInitiative,
  onManageColumns,
  isEditMode,
  onEditModeToggle,
  savingCells,
  onExport,
  onImport
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-sm bg-background/95 border-b border-border shadow-sm">
      <div className="max-w-[1600px] mx-auto px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Executive Product Roadmap
          </h1>
          <div className="flex items-center gap-3">
            <Button
              variant={isEditMode ? 'default' : 'outline'}
              onClick={onEditModeToggle}
              className="gap-2 shadow-sm transition-all duration-200 hover:shadow-md"
            >
              <Edit className="h-4 w-4" />
              {isEditMode ? 'Done Editing' : 'Edit Roadmap'}
            </Button>
            {isEditMode && (
              <span className="text-sm text-muted-foreground px-2">
                {savingCells > 0 ? 'Saving...' : 'All changes saved'}
              </span>
            )}
            <Button variant="outline" onClick={onExport} className="gap-2 shadow-sm transition-all duration-200 hover:shadow-md">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button variant="outline" onClick={onImport} className="gap-2 shadow-sm transition-all duration-200 hover:shadow-md">
              <Upload className="h-4 w-4" />
              Import
            </Button>
            <Button variant="outline" onClick={onManageColumns} className="gap-2 shadow-sm transition-all duration-200 hover:shadow-md">
              <Settings className="h-4 w-4" />
              Manage Columns
            </Button>
            <Button onClick={onNewInitiative} className="gap-2 shadow-md hover:shadow-lg transition-all duration-200">
              <Plus className="h-4 w-4" />
              New Initiative
            </Button>
          </div>
        </div>

        <div className="bg-muted/30 border-b border-border -mx-6 px-6 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-foreground">View:</span>
              <div className="inline-flex rounded-lg border border-border bg-background p-1 shadow-sm">
                <Button
                  variant={view === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onViewChange('list')}
                  className={`gap-2 transition-all duration-200 ${
                    view === 'list' ? 'shadow-sm' : ''
                  }`}
                >
                  <List className="h-4 w-4" />
                  List
                </Button>
                <Button
                  variant={view === 'gantt' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onViewChange('gantt')}
                  className={`gap-2 transition-all duration-200 ${
                    view === 'gantt' ? 'shadow-sm' : ''
                  }`}
                >
                  <BarChart3 className="h-4 w-4" />
                  Gantt
                </Button>
              </div>

              <Select value={productFilter} onValueChange={(value) => onProductFilterChange(value as ProductType | 'All')}>
                <SelectTrigger className="w-[200px] shadow-sm">
                  <SelectValue placeholder="All Products" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Products</SelectItem>
                  {availableProducts.map(product => (
                    <SelectItem key={product} value={product}>{product}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search initiatives..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 shadow-sm focus:ring-2 focus:ring-primary/50 transition-all duration-200"
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

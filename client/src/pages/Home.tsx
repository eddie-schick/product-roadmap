import { useState, useRef, useMemo, useCallback } from 'react';
import { Header } from '@/components/Header';
import { TabNavigation } from '@/components/TabNavigation';
import { ListView } from '@/components/ListView';
import { GanttView } from '@/components/GanttView';
import { GanttLegend } from '@/components/GanttLegend';
import { BacklogView } from '@/components/BacklogView';
import { InitiativePopup } from '@/components/InitiativePopup';
import { ColumnManager } from '@/components/ColumnManager';
import { Pagination } from '@/components/Pagination';
import { ImportPreviewDialog } from '@/components/ImportPreviewDialog';
import { useInitiatives } from '@/hooks/useInitiatives';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { Initiative, TabStatus, ProductType } from '@/types/database';
import { Loader2 } from 'lucide-react';
import { exportToExcel, parseImportFile, validateImportData, bulkUpdateInitiatives } from '@/lib/exportImport';
import { toast } from 'sonner';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabStatus>('Active');
  const [view, setView] = useLocalStorage<'list' | 'gantt'>('roadmap-view', 'list');
  const [productFilter, setProductFilter] = useLocalStorage<ProductType | 'All'>('roadmap-product-filter', 'All');
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useLocalStorage('roadmap-page-size', 10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedInitiative, setSelectedInitiative] = useState<Initiative | null>(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const [columnManagerOpen, setColumnManagerOpen] = useState(false);
  
  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [savingCells, setSavingCells] = useState<Set<string>>(new Set());
  
  // Batch updates to prevent overwriting
  const pendingUpdatesRef = useRef<Map<number, Partial<Initiative>>>(new Map());
  const updateTimeoutRef = useRef<Map<number, NodeJS.Timeout>>(new Map());
  
  // Import state
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    initiatives,
    loading,
    refetch,
    createInitiative,
    updateInitiative,
    deleteInitiative,
    updateInitiativeOrder
  } = useInitiatives(activeTab, productFilter, searchTerm);

  // Extract unique products from all initiatives for dynamic filter
  const availableProducts = useMemo(() => {
    const products = new Set<string>();
    initiatives.forEach(init => {
      if (init.Product && init.Product.trim()) {
        products.add(init.Product);
      }
    });
    return Array.from(products).sort();
  }, [initiatives]);

  const handleNewInitiative = () => {
    // Default to 'Active' status when creating from 'All' tab
    const status = activeTab === 'All' ? 'Active' : activeTab;
    // Create a draft initiative object (without ID) - won't be saved until user clicks Create
    const draftInitiative: Partial<Initiative> = {
      Status: status,
      Initiative: '',
      Product: 'Order Management',
      Priority: 'Build Now',
      'Quarter Due': 'Q1 2026'
    };
    
    setSelectedInitiative(draftInitiative as Initiative);
    setPopupOpen(true);
  };

  const handleRowClick = (initiative: Initiative) => {
    setSelectedInitiative(initiative);
    setPopupOpen(true);
  };

  const handleDateChange = async (id: number, startDate: string, endDate: string) => {
    await updateInitiative(id, {
      'Start Date': startDate,
      'End Date': endDate
    });
  };

  const handleReorder = async (reorderedInitiatives: Initiative[]) => {
    await updateInitiativeOrder(reorderedInitiatives);
  };

  const handleTabChange = (tab: TabStatus) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  // Edit mode handlers
  const handleEditModeToggle = async () => {
    if (isEditMode) {
      // When exiting edit mode, flush all pending updates
      const pendingRowIds = Array.from(pendingUpdatesRef.current.keys());
      const flushPromises = pendingRowIds.map(rowId => processBatchedUpdate(rowId));
      await Promise.all(flushPromises);
      
      // Clear all timeouts
      updateTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
      updateTimeoutRef.current.clear();
      pendingUpdatesRef.current.clear();
      
      // Clear saving cells
      setSavingCells(new Set());
    }
    setIsEditMode(!isEditMode);
  };

  // Process batched updates for a row
  const processBatchedUpdate = useCallback(async (rowId: number) => {
    const updates = pendingUpdatesRef.current.get(rowId);
    if (!updates || Object.keys(updates).length === 0) {
      return;
    }

    // Clear the pending updates
    pendingUpdatesRef.current.delete(rowId);
    const timeout = updateTimeoutRef.current.get(rowId);
    if (timeout) {
      clearTimeout(timeout);
      updateTimeoutRef.current.delete(rowId);
    }

    // Mark all cells for this row as saving
    const cellKeys = Object.keys(updates).map(col => `${rowId}-${col}`);
    setSavingCells((prev) => {
      const next = new Set(prev);
      cellKeys.forEach(key => next.add(key));
      return next;
    });

    try {
      console.log('Processing batched update for row:', { rowId, updates });
      const success = await updateInitiative(rowId, updates);
      
      if (success) {
        console.log('Batched update completed successfully for row:', rowId);
      } else {
        console.error('Batched update failed for row:', rowId);
        toast.error('Failed to save some changes');
      }
    } catch (error) {
      console.error('Failed to process batched update:', error);
      toast.error('Failed to save changes');
    } finally {
      // Remove all cell keys from saving state
      setSavingCells((prev) => {
        const next = new Set(prev);
        cellKeys.forEach(key => next.delete(key));
        return next;
      });
    }
  }, [updateInitiative]);

  const handleCellSave = useCallback(async (rowId: number, columnName: string, newValue: any, immediate: boolean = false) => {
    const cellKey = `${rowId}-${columnName}`;
    console.log('handleCellSave called:', { rowId, columnName, newValue, cellKey, immediate });
    
    // Mark cell as saving immediately for UI feedback
    setSavingCells((prev) => new Set(prev).add(cellKey));

    // Add to pending updates batch
    const currentUpdates = pendingUpdatesRef.current.get(rowId) || {};
    pendingUpdatesRef.current.set(rowId, {
      ...currentUpdates,
      [columnName]: newValue
    });

    // Clear existing timeout for this row
    const existingTimeout = updateTimeoutRef.current.get(rowId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      updateTimeoutRef.current.delete(rowId);
    }

    if (immediate) {
      // Save immediately (e.g., on blur)
      await processBatchedUpdate(rowId);
    } else {
      // Set a new timeout to batch updates (300ms debounce)
      const timeout = setTimeout(() => {
        processBatchedUpdate(rowId);
      }, 300);
      
      updateTimeoutRef.current.set(rowId, timeout);
    }
  }, [processBatchedUpdate]);

  // Export handler - exports all statuses at once
  const handleExport = async () => {
    await exportToExcel();
  };

  // Import handlers
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    try {
      // Parse file
      const data = await parseImportFile(file);

      // Validate data
      const validation = validateImportData(data);
      if (!validation.isValid) {
        toast.error(`Validation failed: ${validation.errors.join(', ')}`);
        return;
      }

      // Show preview
      setImportPreview(data);
      setShowImportDialog(true);
    } catch (error) {
      console.error('Import failed:', error);
      toast.error('Failed to read file');
    }
  };

  const handleImportConfirm = async () => {
    try {
      let progressToastId: string | number | undefined;
      
      const result = await bulkUpdateInitiatives(importPreview, (progress) => {
        if (progressToastId) {
          toast.loading(`Importing... ${progress}%`, { id: progressToastId });
        } else {
          progressToastId = toast.loading(`Importing... ${progress}%`);
        }
      });

      if (progressToastId) {
        toast.dismiss(progressToastId);
      }

      // Refresh data
      await refetch();

      toast.success(
        `Import complete: ${result.successCount} updated, ${result.errorCount} failed`
      );
      setShowImportDialog(false);
      setImportPreview([]);
    } catch (error) {
      console.error('Bulk update failed:', error);
      toast.error('Import failed');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        view={view}
        onViewChange={setView}
        productFilter={productFilter}
        onProductFilterChange={setProductFilter}
        availableProducts={availableProducts}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onNewInitiative={handleNewInitiative}
        onManageColumns={() => setColumnManagerOpen(true)}
        isEditMode={isEditMode}
        onEditModeToggle={handleEditModeToggle}
        savingCells={savingCells.size}
        onExport={handleExport}
        onImport={handleImportClick}
      />

      {view === 'list' && (
        <TabNavigation
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      )}

      <div className="max-w-[1600px] mx-auto px-6 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-muted border-t-primary" />
            <p className="text-sm text-muted-foreground">Loading initiatives...</p>
          </div>
        ) : (
          <>
            {activeTab === 'Backlog' && view === 'list' ? (
              <>
                <BacklogView
                  initiatives={initiatives}
                  onReorder={handleReorder}
                  onRowClick={handleRowClick}
                  pageSize={pageSize}
                  currentPage={currentPage}
                  isEditMode={isEditMode}
                  savingCells={savingCells}
                  onCellSave={handleCellSave}
                />
                <Pagination
                  currentPage={currentPage}
                  totalItems={initiatives.length}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={handlePageSizeChange}
                />
              </>
            ) : view === 'list' ? (
              <>
                <ListView
                  initiatives={initiatives}
                  onRowClick={handleRowClick}
                  onReorder={handleReorder}
                  pageSize={pageSize}
                  currentPage={currentPage}
                  isEditMode={isEditMode}
                  savingCells={savingCells}
                  onCellSave={handleCellSave}
                />
                <Pagination
                  currentPage={currentPage}
                  totalItems={initiatives.length}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={handlePageSizeChange}
                />
              </>
            ) : (
              <>
                <GanttLegend />
                <GanttView
                  onTaskClick={handleRowClick}
                  onDateChange={handleDateChange}
                />
              </>
            )}
          </>
        )}
      </div>

      <InitiativePopup
        initiative={selectedInitiative}
        open={popupOpen}
        onClose={() => {
          setPopupOpen(false);
          setSelectedInitiative(null);
          refetch();
        }}
        onUpdate={updateInitiative}
        onDelete={deleteInitiative}
        onCreate={createInitiative}
      />

      <ColumnManager
        open={columnManagerOpen}
        onOpenChange={setColumnManagerOpen}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileChange}
        className="hidden"
      />

      <ImportPreviewDialog
        open={showImportDialog}
        data={importPreview}
        onConfirm={handleImportConfirm}
        onCancel={() => {
          setShowImportDialog(false);
          setImportPreview([]);
        }}
      />
    </div>
  );
}

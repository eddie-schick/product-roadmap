import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

interface ImportPreviewDialogProps {
  open: boolean;
  data: any[];
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function ImportPreviewDialog({
  open,
  data,
  onConfirm,
  onCancel
}: ImportPreviewDialogProps) {
  const [processing, setProcessing] = useState(false);

  const handleConfirm = async () => {
    setProcessing(true);
    try {
      await onConfirm();
    } finally {
      setProcessing(false);
    }
  };

  if (data.length === 0) {
    return null;
  }

  const columns = Object.keys(data[0] || {});
  const previewRows = data.slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={(open) => !open && !processing && onCancel()}>
      <DialogContent className="max-w-6xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Preview</DialogTitle>
          <DialogDescription>
            {data.length} row{data.length !== 1 ? 's' : ''} will be updated. Review the first 10 rows below.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto border rounded-md">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-muted sticky top-0">
                <tr>
                  {columns.map((key) => (
                    <th
                      key={key}
                      className="border p-2 text-left font-medium min-w-[120px]"
                    >
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-muted/50">
                    {columns.map((key) => (
                      <td
                        key={key}
                        className="border p-2 text-left"
                      >
                        <div className="truncate max-w-[200px]" title={String(row[key] ?? '')}>
                          {row[key] === null || row[key] === undefined || row[key] === ''
                            ? '—'
                            : String(row[key])}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {data.length > 10 && (
          <p className="text-sm text-muted-foreground mt-2">
            Showing first 10 of {data.length} rows
          </p>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={processing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={processing}
            className="gap-2"
          >
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              'Confirm Import'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


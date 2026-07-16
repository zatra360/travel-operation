'use client';
import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Upload, Download, FileText } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

interface Props {
  type: 'leads' | 'clients';
  onImported?: () => void;
}

export function ImportExportButtons({ type, onImported }: Props) {
  const { activeTenant } = useAuthStore();
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImport = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setImporting(true);
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await api.post<any>(`/api/v1/tenant/${type}/import`, form, { tenantId: activeTenant!.id });
      setResult(res);
      toast.success(`Imported ${res.imported} ${type}`);
      onImported?.();
    } catch (e: any) { toast.error(e.message || 'Import failed'); }
    finally { setImporting(false); }
  };

  const handleExport = async () => {
    try {
      const res = await fetch(`http://localhost:3900/api/v1/tenant/${type}/export`, {
        headers: { 'Authorization': `Bearer ${useAuthStore.getState().accessToken}`, 'X-Tenant-Id': activeTenant!.id },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${type}-export.csv`; a.click();
      URL.revokeObjectURL(url);
      toast.success('Export downloaded');
    } catch (e: any) { toast.error('Export failed'); }
  };

  const downloadTemplate = () => {
    const headers = type === 'leads'
      ? 'fullName,email,primaryMobile,status,priority,source,serviceType,departureCity,destinationCity,numAdults,notes'
      : 'displayName,email,phone,type,nationalityLabel,city,country,notes';
    const sample = type === 'leads'
      ? 'John Smith,john@example.com,+1234567890,NEW,MEDIUM,WEBSITE,FLIGHT,New York,London,1,Sample import'
      : 'Acme Corp,acme@example.com,+1234567890,COMPANY,,New York,US,Sample client';
    const blob = new Blob([`${headers}\n${sample}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={handleExport}><Download className="h-4 w-4 mr-2" />Export</Button>
      <Button variant="outline" size="sm" onClick={() => { setImportOpen(true); setResult(null); }}><Upload className="h-4 w-4 mr-2" />Import</Button>
      <Button variant="ghost" size="sm" onClick={downloadTemplate}><FileText className="h-4 w-4 mr-2" />Template</Button>
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Import {type}</DialogTitle><DialogDescription>Upload a CSV file with a header row.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-center border-2 border-dashed rounded-lg p-8">
              <div className="text-center">
                <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-2">CSV with headers: FullName, Email, Phone, Source</p>
                <input type="file" ref={fileRef} accept=".csv" className="text-sm" />
              </div>
            </div>
            {result && (
              <div className="rounded-md bg-muted p-3 text-sm">
                <p>Imported: <strong>{result.imported}</strong></p>
                <p>Skipped: <strong>{result.skipped}</strong></p>
                <p>Total rows: <strong>{result.total}</strong></p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button onClick={handleImport} disabled={importing}>{importing ? 'Importing...' : 'Upload & Import'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

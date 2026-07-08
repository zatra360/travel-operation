'use client';

import { useState, useRef } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UploadCloud } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { DOCUMENT_CATEGORIES, formatFileSize } from '@/lib/crm';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded: () => void;
  entity?: string;
  entityId?: string;
}

interface UploadUrlResponse {
  uploadUrl: string;
  storageKey: string;
  expiresIn: number;
}

const MAX_BYTES = 25 * 1024 * 1024;

export function DocumentUploadDialog({ open, onOpenChange, onUploaded, entity, entityId }: Props) {
  const { activeTenant } = useAuthStore();
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState('OTHER');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setCategory('OTHER');
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const handleFile = (f: File | null) => {
    setError('');
    if (f && f.size > MAX_BYTES) {
      setError(`File exceeds the ${formatFileSize(MAX_BYTES)} limit`);
      return;
    }
    setFile(f);
  };

  const handleUpload = async () => {
    if (!activeTenant || !file) {
      setError('Please choose a file');
      return;
    }
    setUploading(true);
    setError('');

    try {
      const { uploadUrl, storageKey } = await api.post<UploadUrlResponse>(
        '/api/v1/tenant/documents/upload-url',
        {
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          category,
          sizeBytes: file.size,
        },
        { tenantId: activeTenant.id },
      );

      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
      });
      if (!putRes.ok) throw new Error('Upload to storage failed');

      await api.post(
        '/api/v1/tenant/documents',
        {
          storageKey,
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          category,
          sizeBytes: file.size,
          entity,
          entityId,
        },
        { tenantId: activeTenant.id },
      );

      toast.success('Document uploaded');
      handleOpenChange(false);
      onUploaded();
    } catch (err: any) {
      setError(err.message || 'Upload failed');
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Files are stored privately and accessed via signed links.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">File</Label>
            <label
              htmlFor="file"
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-input p-6 text-center text-sm text-muted-foreground hover:bg-accent/50"
            >
              <UploadCloud className="h-6 w-6" />
              {file ? (
                <span className="font-medium text-foreground">
                  {file.name} ({formatFileSize(file.size)})
                </span>
              ) : (
                <span>Click to choose a file (max {formatFileSize(MAX_BYTES)})</span>
              )}
            </label>
            <input
              id="file"
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={uploading || !file}>
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

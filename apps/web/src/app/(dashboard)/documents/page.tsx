'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Plus, Search, Download, Trash2, FileText } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/lib/utils';
import {
  DocumentItem,
  Paginated,
  DOCUMENT_CATEGORIES,
  SENSITIVE_DOCUMENT_CATEGORIES,
  formatFileSize,
} from '@/lib/crm';
import { DocumentUploadDialog } from './document-upload-dialog';

export default function DocumentsPage() {
  const [items, setItems] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleting, setDeleting] = useState<DocumentItem | null>(null);
  const { activeTenant } = useAuthStore();

  const load = useCallback(() => {
    if (!activeTenant) return;
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    api
      .get<Paginated<DocumentItem>>(`/api/v1/tenant/documents?${params.toString()}`, {
        tenantId: activeTenant.id,
      })
      .then((res) => setItems(res.data))
      .catch((err) => setError(err.message || 'Failed to load documents'))
      .finally(() => setLoading(false));
  }, [activeTenant, search, category]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDownload = async (doc: DocumentItem) => {
    if (!activeTenant) return;
    try {
      const { url } = await api.get<{ url: string; fileName: string }>(
        `/api/v1/tenant/documents/${doc.id}/download`,
        { tenantId: activeTenant.id },
      );
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      toast.error(err.message || 'Failed to get download link');
    }
  };

  const handleDelete = async () => {
    if (!activeTenant || !deleting) return;
    try {
      await api.delete(`/api/v1/tenant/documents/${deleting.id}`, { tenantId: activeTenant.id });
      toast.success('Document deleted');
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete document');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        subtitle="Upload and manage client and booking documents"
        actions={<Button size="sm" onClick={() => setUploadOpen(true)}><Plus className="h-4 w-4 mr-2" />Upload</Button>}
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search file name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          <Button
            variant={category === '' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCategory('')}
          >
            All
          </Button>
          {DOCUMENT_CATEGORIES.map((c) => (
            <Button
              key={c}
              variant={category === c ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategory(c)}
            >
              {c.replace(/_/g, ' ')}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading documents...</p>
          ) : error ? (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-muted-foreground">No documents found.</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => setUploadOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Upload your first document
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium">File</th>
                    <th className="pb-3 font-medium">Category</th>
                    <th className="pb-3 font-medium">Size</th>
                    <th className="pb-3 font-medium">Uploaded by</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((doc) => (
                    <tr key={doc.id} className="border-b last:border-0">
                      <td className="py-3 font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[240px]">{doc.fileName}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <Badge
                          variant={
                            SENSITIVE_DOCUMENT_CATEGORIES.has(doc.category)
                              ? 'warning'
                              : 'secondary'
                          }
                        >
                          {doc.category.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {formatFileSize(doc.sizeBytes)}
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {doc.uploadedBy
                          ? `${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName}`
                          : '--'}
                      </td>
                      <td className="py-3 text-muted-foreground">{formatDate(doc.createdAt)}</td>
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Download"
                            onClick={() => handleDownload(doc)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Delete"
                            onClick={() => setDeleting(doc)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <DocumentUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} onUploaded={load} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete document?"
        description={`This will remove "${deleting?.fileName}". This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}

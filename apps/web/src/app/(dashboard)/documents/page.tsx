'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Plus, Download, Trash2, FileText } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { TableToolbar } from '@/components/ui/table-toolbar';
import { Pagination } from '@/components/ui/pagination';
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

const ALL = '__all__';
const PAGE_SIZE = 25;

export default function DocumentsPage() {
  const [items, setItems] = useState<DocumentItem[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleting, setDeleting] = useState<DocumentItem | null>(null);
  const { activeTenant, activeBranch } = useAuthStore();

  const load = useCallback(() => {
    if (!activeTenant) return;
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));
    api
      .get<Paginated<DocumentItem>>(`/api/v1/tenant/documents?${params.toString()}`, {
        tenantId: activeTenant.id,
        branchId: activeBranch?.id,
      })
      .then((res) => {
        setItems(res.data);
        setMeta({ page: res.page, totalPages: res.totalPages, total: res.total });
      })
      .catch((err) => setError(err.message || 'Failed to load documents'))
      .finally(() => setLoading(false));
  }, [activeTenant, activeBranch, search, category, page]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    setPage(1);
  }, [search, category]);

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

  const hasFilters = search !== '' || category !== '';

  const columns: DataTableColumn<DocumentItem>[] = [
    {
      key: 'file',
      header: 'File',
      cell: (doc) => (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="max-w-[240px] truncate">{doc.fileName}</span>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      cell: (doc) => (
        <Badge variant={SENSITIVE_DOCUMENT_CATEGORIES.has(doc.category) ? 'warning' : 'secondary'}>
          {doc.category.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    { key: 'size', header: 'Size', hideOnMobile: true, cell: (doc) => <span className="text-muted-foreground">{formatFileSize(doc.sizeBytes)}</span> },
    {
      key: 'entity',
      header: 'Linked to',
      hideOnMobile: true,
      cell: (doc: any) => <span className="text-muted-foreground text-xs">{doc.entity ? `${doc.entity} #${doc.entityId?.slice(0, 8)}` : '—'}</span>,
    },
    {
      key: 'uploadedBy',
      header: 'Uploaded by',
      hideOnMobile: true,
      cell: (doc) => <span className="text-muted-foreground">{doc.uploadedBy ? `${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName}` : '—'}</span>,
    },
    { key: 'date', header: 'Date', hideOnMobile: true, cell: (doc) => <span className="text-muted-foreground">{formatDate(doc.createdAt)}</span> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (doc) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" title="Download" onClick={() => handleDownload(doc)}>
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Delete" onClick={() => setDeleting(doc)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Documents"
        subtitle="Upload and manage client and booking documents"
        actions={
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Upload
          </Button>
        }
      />

      <TableToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search file name…"
        hasActiveFilters={hasFilters}
        onReset={() => {
          setSearch('');
          setCategory('');
        }}
        filters={
          <Select value={category || ALL} onValueChange={(v) => setCategory(v === ALL ? '' : v)}>
            <SelectTrigger className="h-9 w-44" aria-label="Filter by category">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All categories</SelectItem>
              {DOCUMENT_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {error ? (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={items}
            rowKey={(doc) => doc.id}
            loading={loading}
            emptyTitle="No documents found"
            emptyDescription={hasFilters ? 'Try adjusting your filters.' : 'Upload your first document to get started.'}
            emptyAction={
              !hasFilters ? (
                <Button size="sm" variant="outline" onClick={() => setUploadOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Upload your first document
                </Button>
              ) : undefined
            }
            mobileCard={(doc) => (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate font-medium">{doc.fileName}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={SENSITIVE_DOCUMENT_CATEGORIES.has(doc.category) ? 'warning' : 'secondary'}>
                    {doc.category.replace(/_/g, ' ')}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{formatFileSize(doc.sizeBytes)}</span>
                </div>
              </div>
            )}
          />
          {!loading && items.length > 0 && (
            <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} limit={PAGE_SIZE} onPageChange={setPage} />
          )}
        </>
      )}

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

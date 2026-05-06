import { useState, useEffect, useRef } from 'react';
import { Upload as UploadIcon, FileText, File, CheckCircle, X } from 'lucide-react';
import { api } from '../api/client';
import EmptyState from '../components/EmptyState';
import DocumentReview from '../components/DocumentReview';

const TYPE_LABELS = {
  bol:     'BOL',
  ratecon: 'Rate Con',
  invoice: 'Invoice',
  pod:     'POD',
  other:   'Other',
};

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function Upload() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadResult, setUploadResult] = useState(null);
  const [successInfo, setSuccessInfo] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    api.get('/documents')
      .then((docs) => setDocuments(docs.filter((d) => d.status !== 'pending_review')))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleFile(file) {
    if (!file) return;
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowed.includes(file.type)) {
      setUploadError('Only PDF, JPG, and PNG files are supported.');
      return;
    }
    setUploading(true);
    setUploadError('');
    setSuccessInfo(null);
    try {
      const result = await api.upload(file);
      setUploadResult(result);
    } catch (e) {
      setUploadError(e.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function handleConfirm(result) {
    setDocuments((prev) => [result.document, ...prev.filter((d) => d.id !== result.document.id)]);
    setSuccessInfo(result);
    setUploadResult(null);
  }

  async function handleCancel() {
    if (uploadResult?.documentId) {
      await api.delete(`/documents/${uploadResult.documentId}`).catch(() => {});
    }
    setUploadResult(null);
  }

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  if (loading) return <div className="loading-state">Loading…</div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Upload</h1>
          <p className="page-subtitle">Rate cons, BOLs, invoices, and PODs</p>
        </div>
      </div>

      {/* Success banner */}
      {successInfo && (
        <div className="upload-success-banner">
          <CheckCircle size={15} />
          <span>
            <strong>{successInfo.document?.originalName || 'Document'}</strong> saved.
            {successInfo.created?.company && ' New company created.'}
            {successInfo.matched?.company && successInfo.company && ` Matched to ${successInfo.company.name}.`}
            {successInfo.created?.load && ' New load created.'}
            {successInfo.matched?.load && ' Existing load updated.'}
            {successInfo.unmatchedInvoice && ' Invoice has no matching load — attach manually.'}
            {successInfo.created?.contact && ' Contact added.'}
          </span>
          <button className="icon-btn" style={{ marginLeft: 'auto' }} onClick={() => setSuccessInfo(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Review mode: show inline form instead of upload zone */}
      {uploadResult ? (
        <DocumentReview
          uploadResult={uploadResult}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      ) : (
        <>
          {uploadError && (
            <div className="form-error" style={{ marginBottom: 16 }}>{uploadError}</div>
          )}

          <div
            className={`upload-zone${dragging ? ' drag-over' : ''}${uploading ? ' upload-zone-busy' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !uploading && inputRef.current?.click()}
            role="button"
            tabIndex={uploading ? -1 : 0}
            onKeyDown={(e) => e.key === 'Enter' && !uploading && inputRef.current?.click()}
          >
            <div className="upload-zone-icon">
              {uploading ? <div className="upload-spinner" /> : <UploadIcon />}
            </div>
            <div className="upload-zone-title">
              {uploading ? 'Uploading and extracting…' : 'Drop a file here or click to browse'}
            </div>
            <div className="upload-zone-desc">
              {uploading
                ? 'This may take a moment for images (OCR in progress)'
                : 'Supports PDF, JPG, PNG · Rate cons, BOLs, invoices, and PODs'}
            </div>
            <input
              ref={inputRef}
              type="file"
              style={{ display: 'none' }}
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = '';
              }}
            />
          </div>
        </>
      )}

      {/* Document history */}
      <div className="card mt-6">
        <div className="card-header">
          <span>Uploaded Documents</span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 400 }}>
            {documents.length} file{documents.length !== 1 ? 's' : ''}
          </span>
        </div>

        {documents.length === 0 ? (
          <EmptyState
            icon={<FileText />}
            title="No documents uploaded yet"
            description="Upload your first document to extract and organize rate cons, BOLs, invoices, and PODs."
          />
        ) : (
          documents.map((doc, i) => (
            <div
              key={doc.id}
              style={{
                padding: '13px 18px',
                borderBottom: i < documents.length - 1 ? '1px solid var(--border)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 7,
                background: 'var(--bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-muted)', flexShrink: 0,
              }}>
                <File size={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: 600, fontSize: 13, color: 'var(--text)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {doc.originalName || doc.filename}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {formatBytes(doc.size)}{doc.uploadedAt ? ` · ${fmtDate(doc.uploadedAt)}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                <span className="badge badge-neutral">
                  {TYPE_LABELS[doc.type] || doc.type || 'Other'}
                </span>
                {doc.extractionStatus === 'success' && (
                  <span className="badge badge-success">Extracted</span>
                )}
                {doc.extractionStatus === 'partial' && (
                  <span className="badge badge-warning">Partial</span>
                )}
                {doc.extractionStatus === 'failed' && (
                  <span className="badge badge-danger">Failed</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

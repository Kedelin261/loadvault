import { useState } from 'react';
import { CheckCircle, AlertTriangle, AlertCircle, FileText } from 'lucide-react';
import { api } from '../api/client';

const EQUIPMENT_TYPES = [
  'Dry Van', 'Reefer', 'Flatbed', 'Step Deck',
  'RGN', 'Power Only', 'Tanker', 'Hotshot', 'Other',
];

const DOC_TYPES = [
  { value: 'ratecon', label: 'Rate Confirmation' },
  { value: 'bol',     label: 'Bill of Lading (BOL)' },
  { value: 'pod',     label: 'Proof of Delivery (POD)' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'other',   label: 'Other' },
];

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ExtractionBanner({ status, error }) {
  if (status === 'success') {
    return (
      <div className="extraction-banner extraction-banner-success">
        <CheckCircle size={15} />
        Extraction successful — review and confirm the fields below.
      </div>
    );
  }
  if (status === 'partial') {
    return (
      <div className="extraction-banner extraction-banner-warning">
        <AlertTriangle size={15} />
        Partial extraction — some fields could not be read. Fill in any blanks before confirming.
      </div>
    );
  }
  return (
    <div className="extraction-banner extraction-banner-error">
      <AlertCircle size={15} />
      {error
        ? `Extraction failed: ${error}`
        : 'Extraction failed — enter fields manually below.'}
    </div>
  );
}

export default function DocumentReview({ uploadResult, onConfirm, onCancel }) {
  const ex = uploadResult.extracted || {};

  const [fields, setFields] = useState({
    docType:       'other',
    companyName:   ex.companyName   || '',
    companyEmail:  ex.companyEmail  || '',
    companyPhone:  ex.companyPhone  || '',
    contactName:   ex.contactName   || '',
    mcNumber:      ex.mcNumber      || '',
    dotNumber:     ex.dotNumber     || '',
    loadNumber:    ex.loadNumber    || '',
    rate:          ex.rate   != null ? String(ex.rate)   : '',
    originCity:    ex.originCity    || '',
    originState:   ex.originState   || '',
    pickupDate:    ex.pickupDate    || '',
    pickupTime:    ex.pickupTime    || '',
    destCity:      ex.destCity      || '',
    destState:     ex.destState     || '',
    deliveryDate:  ex.deliveryDate  || '',
    deliveryTime:  ex.deliveryTime  || '',
    commodity:     ex.commodity     || '',
    weight:        ex.weight != null ? String(ex.weight) : '',
    equipmentType: ex.equipmentType || '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (e) => {
    const { name, value } = e.target;
    setFields((f) => ({ ...f, [name]: value }));
  };

  async function handleConfirm() {
    setSaving(true);
    setError('');
    try {
      const result = await api.confirm(uploadResult.documentId, {
        ...fields,
        rate:   Number(fields.rate)   || 0,
        weight: Number(fields.weight) || 0,
      });
      onConfirm(result);
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  }

  return (
    <div className="review-panel">
      {/* File info bar */}
      <div className="review-file-header">
        <FileText size={15} color="var(--accent)" />
        <span className="review-file-name">{uploadResult.originalName}</span>
        <span className="review-file-size">{formatBytes(uploadResult.size)}</span>
      </div>

      <ExtractionBanner
        status={uploadResult.extractionStatus}
        error={uploadResult.extractionError}
      />

      {error && <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>}

      {/* Document type */}
      <div className="form-group">
        <label className="form-label">Document Type</label>
        <select className="form-select" name="docType" value={fields.docType} onChange={set}>
          {DOC_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* ── Company ────────────────────────────── */}
      <div className="form-divider" />
      <div className="form-section-title">Company</div>

      <div className="form-group">
        <label className="form-label">Company Name</label>
        <input
          className="form-input"
          name="companyName"
          value={fields.companyName}
          onChange={set}
          placeholder="Will create new company if filled in"
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-input" name="companyEmail" value={fields.companyEmail} onChange={set} placeholder="company@example.com" />
        </div>
        <div className="form-group">
          <label className="form-label">Phone</label>
          <input className="form-input" name="companyPhone" value={fields.companyPhone} onChange={set} placeholder="(555) 123-4567" />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">MC Number</label>
          <input className="form-input" name="mcNumber" value={fields.mcNumber} onChange={set} placeholder="MC-123456" />
        </div>
        <div className="form-group">
          <label className="form-label">DOT Number</label>
          <input className="form-input" name="dotNumber" value={fields.dotNumber} onChange={set} placeholder="1234567" />
        </div>
      </div>

      {/* ── Load ───────────────────────────────── */}
      <div className="form-divider" />
      <div className="form-section-title">Load</div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Load Number</label>
          <input className="form-input" name="loadNumber" value={fields.loadNumber} onChange={set} placeholder="Leave blank if unknown" />
        </div>
        <div className="form-group">
          <label className="form-label">Rate ($)</label>
          <input className="form-input" name="rate" value={fields.rate} onChange={set} type="number" min="0" step="0.01" placeholder="0.00" />
        </div>
      </div>

      <div className="form-section-title" style={{ marginTop: 12 }}>Pickup</div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">City</label>
          <input className="form-input" name="originCity" value={fields.originCity} onChange={set} placeholder="Chicago" />
        </div>
        <div className="form-group">
          <label className="form-label">State</label>
          <input className="form-input" name="originState" value={fields.originState} onChange={set} placeholder="IL" maxLength={2} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Date</label>
          <input className="form-input" name="pickupDate" value={fields.pickupDate} onChange={set} type="date" />
        </div>
        <div className="form-group">
          <label className="form-label">Time</label>
          <input className="form-input" name="pickupTime" value={fields.pickupTime} onChange={set} type="time" />
        </div>
      </div>

      <div className="form-section-title" style={{ marginTop: 12 }}>Delivery</div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">City</label>
          <input className="form-input" name="destCity" value={fields.destCity} onChange={set} placeholder="Dallas" />
        </div>
        <div className="form-group">
          <label className="form-label">State</label>
          <input className="form-input" name="destState" value={fields.destState} onChange={set} placeholder="TX" maxLength={2} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Date</label>
          <input className="form-input" name="deliveryDate" value={fields.deliveryDate} onChange={set} type="date" />
        </div>
        <div className="form-group">
          <label className="form-label">Time</label>
          <input className="form-input" name="deliveryTime" value={fields.deliveryTime} onChange={set} type="time" />
        </div>
      </div>

      {/* ── Cargo ──────────────────────────────── */}
      <div className="form-divider" />
      <div className="form-section-title">Cargo</div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Commodity</label>
          <input className="form-input" name="commodity" value={fields.commodity} onChange={set} placeholder="Auto Parts" />
        </div>
        <div className="form-group">
          <label className="form-label">Weight (lbs)</label>
          <input className="form-input" name="weight" value={fields.weight} onChange={set} type="number" min="0" placeholder="42000" />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Equipment Type</label>
        <select className="form-select" name="equipmentType" value={fields.equipmentType} onChange={set}>
          <option value="">Select equipment…</option>
          {EQUIPMENT_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" onClick={handleConfirm} disabled={saving}>
          {saving ? 'Saving…' : 'Confirm & Save'}
        </button>
      </div>
    </div>
  );
}

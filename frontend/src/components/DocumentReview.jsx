import { useState } from 'react';
import { CheckCircle, AlertTriangle, AlertCircle, FileText, Tag } from 'lucide-react';
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

const DETECTED_TYPE_LABELS = {
  RATE_CONFIRMATION: { label: 'Rate Confirmation', color: '#16a34a', bg: '#f0fdf4' },
  INVOICE:           { label: 'Invoice',           color: '#d97706', bg: '#fffbeb' },
  BOL:               { label: 'Bill of Lading',    color: '#3b82f6', bg: '#eff6ff' },
  RECEIPT:           { label: 'Receipt',            color: '#8b5cf6', bg: '#f5f3ff' },
  UNKNOWN:           { label: 'Unknown',            color: '#64748b', bg: '#f8fafc' },
};

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
        Fields extracted — review and confirm before saving.
      </div>
    );
  }
  if (status === 'partial') {
    return (
      <div className="extraction-banner extraction-banner-warning">
        <AlertTriangle size={15} />
        Partial extraction — some fields could not be read. Fill in any blanks.
      </div>
    );
  }
  return (
    <div className="extraction-banner extraction-banner-error">
      <AlertCircle size={15} />
      {error ? `Extraction failed: ${error}` : 'Extraction failed — enter fields manually.'}
    </div>
  );
}

/** A field that shows a source indicator when it was auto-extracted */
function Field({ label, children, extracted = false }) {
  return (
    <div className="form-group">
      <label className="form-label">
        {label}
        {extracted && <span className="field-extracted-tag">extracted</span>}
      </label>
      {children}
    </div>
  );
}

// ── Rate Confirmation Form ────────────────────────────────────────────────────

function RateConForm({ fields, set }) {
  return (
    <>
      <div className="form-divider" />
      <div className="form-section-title">Load Reference</div>
      <div className="form-row">
        <Field label="PO / Order Number" extracted={!!fields._ex?.poNumber}>
          <input className="form-input" name="poNumber" value={fields.poNumber} onChange={set} placeholder="Required to match/create load" />
        </Field>
        <Field label="Rate ($)" extracted={!!fields._ex?.rate}>
          <input className="form-input" name="rate" value={fields.rate} onChange={set} type="number" min="0" step="0.01" placeholder="0.00" />
        </Field>
      </div>

      <div className="form-divider" />
      <div className="form-section-title">Broker / Company</div>
      <Field label="Company Name" extracted={!!fields._ex?.companyName}>
        <input className="form-input" name="companyName" value={fields.companyName} onChange={set} placeholder="Will match or create" />
      </Field>
      <div className="form-row">
        <Field label="Phone" extracted={!!fields._ex?.companyPhone}>
          <input className="form-input" name="companyPhone" value={fields.companyPhone} onChange={set} placeholder="(555) 123-4567" />
        </Field>
        <Field label="Email" extracted={!!fields._ex?.companyEmail}>
          <input className="form-input" name="companyEmail" value={fields.companyEmail} onChange={set} placeholder="contact@broker.com" />
        </Field>
      </div>
      <div className="form-row">
        <Field label="MC Number" extracted={!!fields._ex?.mcNumber}>
          <input className="form-input" name="mcNumber" value={fields.mcNumber} onChange={set} placeholder="MC-123456" />
        </Field>
        <Field label="DOT Number" extracted={!!fields._ex?.dotNumber}>
          <input className="form-input" name="dotNumber" value={fields.dotNumber} onChange={set} placeholder="1234567" />
        </Field>
      </div>

      {/* Billing email is read-only — never creates a contact */}
      {fields.billingEmail && (
        <div className="billing-email-notice">
          <span className="billing-email-label">Billing Email (stored, not a contact):</span>
          <span className="billing-email-value">{fields.billingEmail}</span>
        </div>
      )}

      <div className="form-divider" />
      <div className="form-section-title">Broker Contact</div>
      <p className="form-hint">Only filled if a real name + direct phone/email was found. Billing and generic emails are excluded.</p>
      <div className="form-row">
        <Field label="First Name" extracted={!!fields._ex?.contactFirstName}>
          <input className="form-input" name="contactFirstName" value={fields.contactFirstName} onChange={set} placeholder="First" />
        </Field>
        <Field label="Last Name" extracted={!!fields._ex?.contactLastName}>
          <input className="form-input" name="contactLastName" value={fields.contactLastName} onChange={set} placeholder="Last" />
        </Field>
      </div>

      <div className="form-divider" />
      <div className="form-section-title">Pickup</div>
      <div className="form-row">
        <Field label="City" extracted={!!fields._ex?.originCity}>
          <input className="form-input" name="originCity" value={fields.originCity} onChange={set} placeholder="Chicago" />
        </Field>
        <Field label="State" extracted={!!fields._ex?.originState}>
          <input className="form-input" name="originState" value={fields.originState} onChange={set} placeholder="IL" maxLength={2} />
        </Field>
      </div>
      <div className="form-row">
        <Field label="Date" extracted={!!fields._ex?.pickupDate}>
          <input className="form-input" name="pickupDate" value={fields.pickupDate} onChange={set} type="date" />
        </Field>
        <Field label="Time" extracted={!!fields._ex?.pickupTime}>
          <input className="form-input" name="pickupTime" value={fields.pickupTime} onChange={set} type="time" />
        </Field>
      </div>

      <div className="form-section-title" style={{ marginTop: 12 }}>Delivery</div>
      <div className="form-row">
        <Field label="City" extracted={!!fields._ex?.destCity}>
          <input className="form-input" name="destCity" value={fields.destCity} onChange={set} placeholder="Dallas" />
        </Field>
        <Field label="State" extracted={!!fields._ex?.destState}>
          <input className="form-input" name="destState" value={fields.destState} onChange={set} placeholder="TX" maxLength={2} />
        </Field>
      </div>
      <div className="form-row">
        <Field label="Date" extracted={!!fields._ex?.deliveryDate}>
          <input className="form-input" name="deliveryDate" value={fields.deliveryDate} onChange={set} type="date" />
        </Field>
        <Field label="Time" extracted={!!fields._ex?.deliveryTime}>
          <input className="form-input" name="deliveryTime" value={fields.deliveryTime} onChange={set} type="time" />
        </Field>
      </div>

      <div className="form-divider" />
      <div className="form-section-title">Cargo</div>
      <div className="form-row">
        <Field label="Commodity" extracted={!!fields._ex?.commodity}>
          <input className="form-input" name="commodity" value={fields.commodity} onChange={set} placeholder="Auto Parts" />
        </Field>
        <Field label="Weight (lbs)" extracted={!!fields._ex?.weight}>
          <input className="form-input" name="weight" value={fields.weight} onChange={set} type="number" min="0" placeholder="42000" />
        </Field>
      </div>
      <Field label="Equipment Type" extracted={!!fields._ex?.equipmentType}>
        <select className="form-select" name="equipmentType" value={fields.equipmentType} onChange={set}>
          <option value="">Select equipment…</option>
          {EQUIPMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </Field>
    </>
  );
}

// ── Invoice Form ──────────────────────────────────────────────────────────────

function InvoiceForm({ fields, set }) {
  return (
    <>
      <div className="extraction-banner" style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', marginBottom: 16 }}>
        <AlertTriangle size={15} />
        Invoice — will attach to existing load using PO number. No new load will be created.
      </div>
      <div className="form-divider" />
      <div className="form-section-title">Invoice Details</div>
      <div className="form-row">
        <Field label="Invoice Number" extracted={!!fields._ex?.invoiceNumber}>
          <input className="form-input" name="invoiceNumber" value={fields.invoiceNumber} onChange={set} placeholder="INV-12345" />
        </Field>
        <Field label="Amount ($)" extracted={!!fields._ex?.amount}>
          <input className="form-input" name="rate" value={fields.rate} onChange={set} type="number" min="0" step="0.01" placeholder="0.00" />
        </Field>
      </div>
      <Field label="PO / Load Number (to attach to)" extracted={!!fields._ex?.poNumber}>
        <input className="form-input" name="poNumber" value={fields.poNumber} onChange={set} placeholder="Required to match an existing load" />
      </Field>
      <Field label="Invoice Date" extracted={!!fields._ex?.invoiceDate}>
        <input className="form-input" name="invoiceDate" value={fields.invoiceDate || ''} onChange={set} type="date" />
      </Field>
      <Field label="Company (for reference)" extracted={!!fields._ex?.companyName}>
        <input className="form-input" name="companyName" value={fields.companyName} onChange={set} placeholder="Broker or shipper name" />
      </Field>
    </>
  );
}

// ── BOL Form ──────────────────────────────────────────────────────────────────

function BolForm({ fields, set }) {
  return (
    <>
      <div className="form-divider" />
      <div className="form-section-title">BOL Reference</div>
      <div className="form-row">
        <Field label="BOL Number" extracted={!!fields._ex?.bolNumber}>
          <input className="form-input" name="bolNumber" value={fields.bolNumber || ''} onChange={set} placeholder="BOL-12345" />
        </Field>
        <Field label="PO / Load Number (to match)" extracted={!!fields._ex?.poNumber}>
          <input className="form-input" name="poNumber" value={fields.poNumber} onChange={set} placeholder="To attach to existing load" />
        </Field>
      </div>

      <div className="form-section-title" style={{ marginTop: 12 }}>Pickup</div>
      <div className="form-row">
        <Field label="City" extracted={!!fields._ex?.originCity}>
          <input className="form-input" name="originCity" value={fields.originCity} onChange={set} placeholder="Chicago" />
        </Field>
        <Field label="State" extracted={!!fields._ex?.originState}>
          <input className="form-input" name="originState" value={fields.originState} onChange={set} placeholder="IL" maxLength={2} />
        </Field>
      </div>
      <Field label="Pickup Date" extracted={!!fields._ex?.pickupDate}>
        <input className="form-input" name="pickupDate" value={fields.pickupDate} onChange={set} type="date" />
      </Field>

      <div className="form-section-title" style={{ marginTop: 12 }}>Delivery</div>
      <div className="form-row">
        <Field label="City" extracted={!!fields._ex?.destCity}>
          <input className="form-input" name="destCity" value={fields.destCity} onChange={set} placeholder="Dallas" />
        </Field>
        <Field label="State" extracted={!!fields._ex?.destState}>
          <input className="form-input" name="destState" value={fields.destState} onChange={set} placeholder="TX" maxLength={2} />
        </Field>
      </div>
      <Field label="Delivery Date" extracted={!!fields._ex?.deliveryDate}>
        <input className="form-input" name="deliveryDate" value={fields.deliveryDate} onChange={set} type="date" />
      </Field>

      <div className="form-divider" />
      <div className="form-section-title">Cargo</div>
      <div className="form-row">
        <Field label="Commodity" extracted={!!fields._ex?.commodity}>
          <input className="form-input" name="commodity" value={fields.commodity} onChange={set} placeholder="Auto Parts" />
        </Field>
        <Field label="Weight (lbs)" extracted={!!fields._ex?.weight}>
          <input className="form-input" name="weight" value={fields.weight} onChange={set} type="number" min="0" placeholder="42000" />
        </Field>
      </div>
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DocumentReview({ uploadResult, onConfirm, onCancel }) {
  const ex = uploadResult.extracted || {};
  const detectedType = uploadResult.detectedType || 'UNKNOWN';
  const typeInfo = DETECTED_TYPE_LABELS[detectedType] || DETECTED_TYPE_LABELS.UNKNOWN;

  const defaultDocType = uploadResult.docType || 'other';

  const [fields, setFields] = useState({
    docType:          defaultDocType,
    // shared
    poNumber:         ex.poNumber      || '',
    loadNumber:       ex.loadNumber    || '',
    companyName:      ex.companyName   || '',
    companyEmail:     ex.companyEmail  || '',
    companyPhone:     ex.companyPhone  || '',
    mcNumber:         ex.mcNumber      || '',
    dotNumber:        ex.dotNumber     || '',
    billingEmail:     ex.billingEmail  || '',
    contactFirstName: ex.contactFirstName || '',
    contactLastName:  ex.contactLastName  || '',
    contactPhone:     ex.contactPhone     || '',
    contactEmail:     ex.contactEmail     || '',
    // load data
    rate:          ex.rate    != null ? String(ex.rate)   : '',
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
    // invoice specific
    invoiceNumber: ex.invoiceNumber || '',
    // bol specific
    bolNumber:     ex.bolNumber     || '',
    // store original extracted for "extracted" tag display
    _ex: ex,
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
      const payload = {
        ...fields,
        rate:   Number(fields.rate)   || 0,
        weight: Number(fields.weight) || 0,
        _ex: undefined,
      };
      const result = await api.confirm(uploadResult.documentId, payload);
      onConfirm(result);
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  }

  return (
    <div className="review-panel">
      {/* File info + detected type */}
      <div className="review-file-header">
        <FileText size={15} color="var(--accent)" />
        <span className="review-file-name">{uploadResult.originalName}</span>
        <span className="review-file-size">{formatBytes(uploadResult.size)}</span>
        <span
          className="detected-type-badge"
          style={{ background: typeInfo.bg, color: typeInfo.color }}
        >
          <Tag size={11} />
          {typeInfo.label}
        </span>
      </div>

      <ExtractionBanner
        status={uploadResult.extractionStatus}
        error={uploadResult.extractionError}
      />

      {error && <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>}

      {/* Document type selector */}
      <div className="form-group">
        <label className="form-label">Document Type</label>
        <select className="form-select" name="docType" value={fields.docType} onChange={set}>
          {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {/* Type-specific form */}
      {(detectedType === 'RATE_CONFIRMATION' || detectedType === 'UNKNOWN' || detectedType === 'RECEIPT') && (
        <RateConForm fields={fields} set={set} />
      )}
      {detectedType === 'INVOICE' && <InvoiceForm fields={fields} set={set} />}
      {detectedType === 'BOL'     && <BolForm     fields={fields} set={set} />}

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

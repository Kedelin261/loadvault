import { useState, useEffect } from 'react';
import { Mail, AlertCircle } from 'lucide-react';
import Modal from './Modal';

const TEMPLATES = [
  {
    id: 'truck-availability',
    name: 'Truck Availability',
    subject: 'Truck Available – [Date] | [Equipment]',
    body: `Hello,

I wanted to reach out — we have a truck available:

Date Available:
Equipment:
Home Base:
Lane Preference:

Please let me know if you have anything in this area.

Thank you,
[Your Name]
[Your Company]
[Your Phone]`,
  },
  {
    id: 'paperwork-request',
    name: 'Paperwork Request',
    subject: 'Paperwork Request – Load #[Load Number]',
    body: `Hello,

Following up on Load #[Load Number]. We need the following documents:

☐ Rate Confirmation
☐ Bill of Lading (BOL)
☐ Proof of Delivery (POD)
☐ Invoice

Please send at your earliest convenience.

Thank you,
[Your Name]
[Your Company]`,
  },
  {
    id: 'load-availability',
    name: 'Load Availability',
    subject: 'Load Available – [Origin] to [Destination]',
    body: `Hello,

We have a load available and wanted to check your capacity:

Origin:
Destination:
Pickup Date:
Delivery Date:
Commodity:
Weight:
Equipment Needed:
Rate: $

Please confirm availability at your earliest convenience.

Thank you,
[Your Name]
[Your Company]`,
  },
  {
    id: 'rate-negotiation',
    name: 'Rate Negotiation',
    subject: 'Rate Negotiation – Load #[Load Number]',
    body: `Hello,

Thank you for the opportunity on Load #[Load Number].

After reviewing the details, our best rate is:

$[Rate] all-in

Please let us know if this works, or if there is flexibility on your end.

Looking forward to working together,
[Your Name]
[Your Company]
[Your Phone]`,
  },
  {
    id: 'detention-request',
    name: 'Detention Request',
    subject: 'Detention Billing Request – Load #[Load Number]',
    body: `Hello,

I am writing to request detention for Load #[Load Number]:

Arrival Time:
Free Time Expiration:
Detention Start:
Total Hours:
Rate: $[Rate]/hr
Total Detention: $

Please process this with the next invoice cycle. Let me know if you need any additional documentation.

Thank you,
[Your Name]
[Your Company]`,
  },
];

export default function EmailModal({ isOpen, onClose, company }) {
  const [templateId, setTemplateId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTemplateId('');
      setSubject('');
      setBody('');
    }
  }, [isOpen, company?.id]);

  const hasEmail = Boolean(company?.email);

  function selectTemplate(id) {
    setTemplateId(id);
    if (!id) { setSubject(''); setBody(''); return; }
    const t = TEMPLATES.find((t) => t.id === id);
    if (t) { setSubject(t.subject); setBody(t.body); }
  }

  function handleSend() {
    if (!hasEmail) return;
    const url = `mailto:${company.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url, '_blank');
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Email Portal">
      {/* Recipient */}
      <div className="email-to-bar">
        <span className="email-to-label">To</span>
        {hasEmail ? (
          <span className="email-to-address">{company.email}</span>
        ) : (
          <span className="email-to-none">
            <AlertCircle size={13} />
            No email on file
          </span>
        )}
      </div>

      {!hasEmail && (
        <div className="email-warning">
          This company has no email address. Edit the company to add one.
        </div>
      )}

      {/* Template */}
      <div className="form-group">
        <label className="form-label">Template</label>
        <select
          className="form-select"
          value={templateId}
          onChange={(e) => selectTemplate(e.target.value)}
        >
          <option value="">Select a template…</option>
          {TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {/* Subject */}
      <div className="form-group">
        <label className="form-label">Subject</label>
        <input
          className="form-input"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Enter subject…"
          disabled={!hasEmail}
        />
      </div>

      {/* Body */}
      <div className="form-group">
        <label className="form-label">Message</label>
        <textarea
          className="form-textarea email-textarea"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your message or select a template above…"
          disabled={!hasEmail}
        />
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSend}
          disabled={!hasEmail || !subject.trim()}
        >
          <Mail size={14} /> Open in Mail
        </button>
      </div>
    </Modal>
  );
}

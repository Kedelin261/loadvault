import { v4 as uuidv4 } from 'uuid';

export function createDocument(data) {
  return {
    id: uuidv4(),
    loadId: data.loadId || null,
    companyId: data.companyId || null,
    // bol | ratecon | invoice | pod | other
    type: data.type || 'other',
    filename: data.filename || '',
    originalName: data.originalName || '',
    size: data.size || 0,
    mimeType: data.mimeType || '',
    filePath: data.filePath || '',
    url: data.url || '',
    notes: data.notes || '',
    rawText: data.rawText || '',
    extractedFields: data.extractedFields || {},
    // pending | success | partial | failed
    extractionStatus: data.extractionStatus || 'pending',
    extractionError: data.extractionError || null,
    // pending_review | confirmed
    status: data.status || 'confirmed',
    uploadedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

import { PDFParse } from 'pdf-parse';

export async function extractTextFromBuffer(buffer, mimeType) {
  if (mimeType === 'application/pdf') {
    return extractPdf(buffer);
  }
  if (mimeType === 'image/jpeg' || mimeType === 'image/png' || mimeType === 'image/jpg') {
    return extractImage(buffer);
  }
  throw new Error(`Unsupported file type: ${mimeType}`);
}

async function extractPdf(buffer) {
  // verbosity: 0 = ERRORS only (suppress pdfjs warnings)
  const parser = new PDFParse({ data: buffer, verbosity: 0 });
  try {
    const result = await parser.getText();
    const text = (result.text || '').trim();
    if (!text) throw new Error('PDF has no extractable text — if scanned, re-upload as JPG or PNG for OCR');
    return text;
  } finally {
    await parser.destroy();
  }
}

async function extractImage(buffer) {
  const tessModule = await import('tesseract.js');
  const Tesseract = tessModule.default || tessModule;
  const result = await Tesseract.recognize(buffer, 'eng', { logger: () => {} });
  const text = (result.data.text || '').trim();
  if (!text) throw new Error('OCR produced no readable text from this image');
  return text;
}

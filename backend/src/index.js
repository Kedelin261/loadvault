import express from 'express';
import cors from 'cors';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import companiesRouter from './routes/companies.js';
import contactsRouter from './routes/contacts.js';
import loadsRouter from './routes/loads.js';
import documentsRouter from './routes/documents.js';
import emailTemplatesRouter from './routes/emailTemplates.js';
import uploadRouter, { UPLOADS_DIR } from './routes/upload.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(UPLOADS_DIR));

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/companies', companiesRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/loads', loadsRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/email-templates', emailTemplatesRouter);
app.use('/api/upload', uploadRouter);

app.listen(PORT, () => {
  console.log(`LoadVault API running on http://localhost:${PORT}`);
});

export default app;

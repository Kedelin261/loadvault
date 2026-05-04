import { Router } from 'express';
import store from '../store.js';
import { createEmailTemplate } from '../models/EmailTemplate.js';

const router = Router();

router.get('/', (req, res) => {
  const { category } = req.query;
  const result = category
    ? store.emailTemplates.filter(t => t.category === category)
    : store.emailTemplates;
  res.json(result);
});

router.get('/:id', (req, res) => {
  const template = store.emailTemplates.find(t => t.id === req.params.id);
  if (!template) return res.status(404).json({ error: 'Template not found' });
  res.json(template);
});

router.post('/', (req, res) => {
  const template = createEmailTemplate(req.body);
  store.emailTemplates.push(template);
  res.status(201).json(template);
});

router.put('/:id', (req, res) => {
  const index = store.emailTemplates.findIndex(t => t.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Template not found' });
  store.emailTemplates[index] = {
    ...store.emailTemplates[index],
    ...req.body,
    id: store.emailTemplates[index].id,
    updatedAt: new Date().toISOString(),
  };
  res.json(store.emailTemplates[index]);
});

router.delete('/:id', (req, res) => {
  const index = store.emailTemplates.findIndex(t => t.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Template not found' });
  store.emailTemplates.splice(index, 1);
  res.status(204).send();
});

export default router;

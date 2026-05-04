import { v4 as uuidv4 } from 'uuid';

export function createEmailTemplate(data) {
  return {
    id: uuidv4(),
    name: data.name || '',
    subject: data.subject || '',
    body: data.body || '',
    // general | rate-confirmation | invoice | follow-up
    category: data.category || 'general',
    variables: data.variables || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

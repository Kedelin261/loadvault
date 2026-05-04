import { v4 as uuidv4 } from 'uuid';

export function createContact(data) {
  return {
    id: uuidv4(),
    companyId: data.companyId || null,
    firstName: data.firstName || '',
    lastName: data.lastName || '',
    email: data.email || '',
    phone: data.phone || '',
    role: data.role || '',
    notes: data.notes || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

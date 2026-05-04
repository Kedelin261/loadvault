import { v4 as uuidv4 } from 'uuid';

export function createCompany(data) {
  return {
    id: uuidv4(),
    name: data.name || '',
    mcNumber: data.mcNumber || '',
    dotNumber: data.dotNumber || '',
    type: data.type || 'broker', // broker | shipper | carrier
    status: data.status || 'active',
    address: data.address || '',
    city: data.city || '',
    state: data.state || '',
    zip: data.zip || '',
    phone: data.phone || '',
    email: data.email || '',
    website: data.website || '',
    notes: data.notes || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

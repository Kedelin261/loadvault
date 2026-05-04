import { v4 as uuidv4 } from 'uuid';

export function createLoad(data) {
  return {
    id: uuidv4(),
    loadNumber: data.loadNumber || '',
    companyId: data.companyId || null,
    origin: {
      address: data.origin?.address || '',
      city: data.origin?.city || '',
      state: data.origin?.state || '',
      zip: data.origin?.zip || '',
    },
    destination: {
      address: data.destination?.address || '',
      city: data.destination?.city || '',
      state: data.destination?.state || '',
      zip: data.destination?.zip || '',
    },
    pickupDate: data.pickupDate || null,
    pickupTime: data.pickupTime || '',
    deliveryDate: data.deliveryDate || null,
    deliveryTime: data.deliveryTime || '',
    rate: data.rate || 0,
    // pending | dispatched | in-transit | delivered | invoiced | paid
    status: data.status || 'pending',
    truckType: data.truckType || '',
    weight: data.weight || 0,
    commodity: data.commodity || '',
    miles: data.miles || 0,
    driverName: data.driverName || '',
    truckNumber: data.truckNumber || '',
    trailerNumber: data.trailerNumber || '',
    notes: data.notes || '',
    documentIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

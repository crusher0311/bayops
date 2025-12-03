export type Role = 'OWNER' | 'MANAGER' | 'ADVISOR' | 'TECHNICIAN';

export interface Organization {
  id: string;
  name: string;
  slug: string;
}

export interface Location {
  id: string;
  orgId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  taxRate: number;
}

export interface User {
  id: string;
  orgId: string;
  name: string;
  email: string;
  role: Role;
  locationIds: string[]; // Locations they have access to
  avatarUrl?: string;
}

export interface Customer {
  id: string;
  orgId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  marketingConsent: boolean;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  customerId: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  licensePlate: string;
  mileage: number;
  tireSizeFront?: string;
  tireSizeRear?: string; // If different
  notes?: string;
}

// ROStatus is now a string to allow for custom statuses, 
// but we keep the system keys for type safety in core logic
export type ROStatus = 'ESTIMATE' | 'AWAITING_APPROVAL' | 'WORK_IN_PROGRESS' | 'COMPLETED' | 'INVOICED' | 'PAID' | string;

export interface WorkflowStage {
  id: string;
  label: string;
  color: string; // Tailwind class or hex
  type: 'SYSTEM' | 'CUSTOM';
  order: number;
  isEnabled: boolean;
}

export interface LineItem {
  id: string;
  type: 'LABOR' | 'PART' | 'TIRE' | 'FEE';
  description: string;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  inventoryItemId?: string; // If linked to inventory
  technicianId?: string; // For labor assignment
  approved: boolean;
}

export interface RepairOrder {
  id: string;
  orgId: string;
  locationId: string;
  roNumber: number;
  customerId: string;
  vehicleId: string;
  advisorId: string;
  technicianId?: string; // Main tech (optional)
  status: ROStatus;
  lineItems: LineItem[];
  createdAt: string;
  promisedAt?: string;
  completedAt?: string;
  notes: string;
  odometerIn: number;
}

export type InventoryType = 'TIRE' | 'PART' | 'OTHER';

export interface InventoryItem {
  id: string;
  orgId: string;
  locationId: string; // Simplified: each location tracks its own stock for MVP
  type: InventoryType;
  sku: string;
  brand: string;
  name: string; // Model name for tires
  description?: string;
  
  // Tire specifics
  tireSize?: string;
  speedRating?: string;
  loadIndex?: string;
  category?: 'ALL_SEASON' | 'WINTER' | 'PERFORMANCE' | 'LT' | 'AT';
  
  cost: number;
  price: number;
  quantityOnHand: number;
  binLocation?: string;
}

export interface AuditLog {
  id: string;
  orgId: string;
  userId: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string; // simplified from prev/new value for MVP
  timestamp: string;
}

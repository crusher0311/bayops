export type Role = 'OWNER' | 'MANAGER' | 'ADVISOR' | 'TECHNICIAN';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  subscriptionStatus: 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
  subscriptionPlan: 'STARTER' | 'GROWTH' | 'ENTERPRISE';
  billingEmail: string;
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
  isActive: boolean; // For billing purposes
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

export type ROStatus = string; // Dynamic based on workflow

export interface WorkflowStage {
  id: string;
  label: string;
  color: string; // Tailwind class or hex
  type: 'SYSTEM' | 'CUSTOM';
  order: number;
  isEnabled?: boolean;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  stages: WorkflowStage[];
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

export interface ServiceJob {
  id: string;
  name: string; // e.g. "Oil Change", "Brake Job"
  title?: string; // OEM maintenance jobs may also have title for display
  description?: string;
  notes?: string;
  chapter?: string;
  code?: string;
  lineItems: LineItem[];
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
  
  workflowId: string; // Link to specific workflow
  status: ROStatus;
  
  jobs: ServiceJob[];
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
  locationId: string;
  type: InventoryType;
  sku: string;
  brand: string;
  name: string;
  description?: string;
  
  // Tire specifics
  tireSize?: string;
  speedRating?: string;
  loadIndex?: string;
  category?: 'ALL_SEASON' | 'WINTER' | 'PERFORMANCE' | 'LT' | 'AT';
  
  cost: string;
  price: string;
  quantityOnHand: number;
  minQuantity: number;
  maxQuantity?: number;
  binLocation?: string;
  vendorPartNumber?: string;
  upc?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type StockTransactionType = 'RECEIVE' | 'ADJUST' | 'SALE' | 'RETURN' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'COUNT';

export interface StockTransaction {
  id: string;
  inventoryItemId: string;
  locationId: string;
  type: StockTransactionType;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  unitCost?: string;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
  userId?: string;
  createdAt: string;
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

// --- DVI Module Types ---

export type InspectionStatus = 'GREEN' | 'YELLOW' | 'RED';

export interface InspectionTemplateItem {
  id: string;
  label: string;
  category: string; // e.g., "Under Hood", "Under Vehicle", "Tires"
}

export interface InspectionTemplate {
  id: string;
  name: string;
  items: InspectionTemplateItem[];
}

export interface InspectionItemResult {
  itemId: string;
  status: InspectionStatus;
  notes?: string;
  imageUrl?: string; // Mock URL for photos
}

export interface Inspection {
  id: string;
  roId: string;
  templateId: string;
  technicianId: string;
  startedAt: string;
  completedAt?: string;
  items: InspectionItemResult[];
}

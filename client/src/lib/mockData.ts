import { 
  Organization, Location, User, Customer, Vehicle, 
  InventoryItem, RepairOrder, AuditLog, WorkflowDefinition,
  InspectionTemplate, Inspection 
} from './types';
import { addDays, subDays } from 'date-fns';

export const MOCK_ORG: Organization = {
  id: 'org-1',
  name: 'Apex Auto Group',
  slug: 'apex-auto',
  subscriptionStatus: 'ACTIVE',
  subscriptionPlan: 'GROWTH',
  billingEmail: 'billing@apexauto.com'
};

export const DEFAULT_WORKFLOWS: WorkflowDefinition[] = [
  {
    id: 'wf-standard',
    name: 'Standard Repair',
    description: 'Full diagnosis and repair process',
    isDefault: true,
    stages: [
      { id: 'ESTIMATE', label: 'Estimates', color: 'bg-gray-100 border-gray-200', type: 'SYSTEM', order: 1 },
      { id: 'AWAITING_APPROVAL', label: 'Approval Needed', color: 'bg-orange-50 border-orange-200', type: 'SYSTEM', order: 2 },
      { id: 'WORK_IN_PROGRESS', label: 'In Progress', color: 'bg-blue-50 border-blue-200', type: 'SYSTEM', order: 3 },
      { id: 'QC_CHECK', label: 'QC Check', color: 'bg-indigo-50 border-indigo-200', type: 'CUSTOM', order: 4 },
      { id: 'COMPLETED', label: 'Completed', color: 'bg-green-50 border-green-200', type: 'SYSTEM', order: 5 },
      { id: 'INVOICED', label: 'Ready for Pickup', color: 'bg-purple-50 border-purple-200', type: 'SYSTEM', order: 6 },
      { id: 'PAID', label: 'Paid / Closed', color: 'bg-slate-100 border-slate-200', type: 'SYSTEM', order: 7 },
    ]
  },
  {
    id: 'wf-quick',
    name: 'Quick Lube / Tire',
    description: 'Fast track workflow for simple services',
    isDefault: false,
    stages: [
      { id: 'CHECK_IN', label: 'Check In', color: 'bg-gray-100 border-gray-200', type: 'CUSTOM', order: 1 },
      { id: 'LUBE_BAY', label: 'In Bay', color: 'bg-blue-50 border-blue-200', type: 'CUSTOM', order: 2 },
      { id: 'COMPLETED', label: 'Done', color: 'bg-green-50 border-green-200', type: 'SYSTEM', order: 3 },
      { id: 'PAID', label: 'Paid', color: 'bg-slate-100 border-slate-200', type: 'SYSTEM', order: 4 },
    ]
  }
];

export const MOCK_LOCATIONS: Location[] = [
  {
    id: 'loc-1',
    orgId: 'org-1',
    name: 'Apex Downtown',
    address: '123 Main St',
    city: 'Metro City',
    state: 'TX',
    zip: '75001',
    phone: '(555) 123-4567',
    taxRate: 0.0825,
    isActive: true
  },
  {
    id: 'loc-2',
    orgId: 'org-1',
    name: 'Apex Westside',
    address: '456 West Ave',
    city: 'Metro City',
    state: 'TX',
    zip: '75002',
    phone: '(555) 987-6543',
    taxRate: 0.0825,
    isActive: true
  }
];

export const MOCK_USERS: User[] = [
  {
    id: 'user-1',
    orgId: 'org-1',
    name: 'John Owner',
    email: 'john@apexauto.com',
    role: 'OWNER',
    locationIds: ['loc-1', 'loc-2'],
    avatarUrl: 'https://i.pravatar.cc/150?u=user-1'
  },
  {
    id: 'user-2',
    orgId: 'org-1',
    name: 'Sarah Manager',
    email: 'sarah@apexauto.com',
    role: 'MANAGER',
    locationIds: ['loc-1'],
    avatarUrl: 'https://i.pravatar.cc/150?u=user-2'
  },
  {
    id: 'user-3',
    orgId: 'org-1',
    name: 'Mike Tech',
    email: 'mike@apexauto.com',
    role: 'TECHNICIAN',
    locationIds: ['loc-1'],
    avatarUrl: 'https://i.pravatar.cc/150?u=user-3'
  },
  {
    id: 'user-4',
    orgId: 'org-1',
    name: 'Alex Advisor',
    email: 'alex@apexauto.com',
    role: 'ADVISOR',
    locationIds: ['loc-1'],
    avatarUrl: 'https://i.pravatar.cc/150?u=user-4'
  }
];

export const MOCK_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    orgId: 'org-1',
    firstName: 'Alice',
    lastName: 'Smith',
    email: 'alice@example.com',
    phone: '(555) 111-2222',
    address: '789 Maple Dr',
    marketingConsent: true,
    createdAt: subDays(new Date(), 30).toISOString()
  },
  {
    id: 'cust-2',
    orgId: 'org-1',
    firstName: 'Bob',
    lastName: 'Jones',
    email: 'bob@example.com',
    phone: '(555) 333-4444',
    address: '321 Oak Ln',
    marketingConsent: false,
    createdAt: subDays(new Date(), 15).toISOString()
  }
];

export const MOCK_VEHICLES: Vehicle[] = [
  {
    id: 'veh-1',
    customerId: 'cust-1',
    vin: '1G1YC2D4X56789012',
    year: 2018,
    make: 'Toyota',
    model: 'Camry',
    trim: 'XLE',
    licensePlate: 'ABC-1234',
    mileage: 45000,
    tireSizeFront: '235/45R18',
    notes: 'Customer prefers synthetic oil'
  },
  {
    id: 'veh-2',
    customerId: 'cust-2',
    vin: '2T3ZF4R5X67890123',
    year: 2020,
    make: 'Ford',
    model: 'F-150',
    trim: 'Lariat',
    licensePlate: 'TRK-9999',
    mileage: 28000,
    tireSizeFront: '275/65R18',
    notes: 'Check spare tire pressure'
  }
];

export const MOCK_INVENTORY: InventoryItem[] = [
  {
    id: 'inv-1',
    orgId: 'org-1',
    locationId: 'loc-1',
    type: 'TIRE',
    sku: 'MICH-2354518',
    brand: 'Michelin',
    name: 'Defender 2',
    tireSize: '235/45R18',
    speedRating: 'V',
    loadIndex: '98',
    category: 'ALL_SEASON',
    cost: 145.00,
    price: 210.00,
    quantityOnHand: 8,
    binLocation: 'A-01'
  },
  {
    id: 'inv-2',
    orgId: 'org-1',
    locationId: 'loc-1',
    type: 'TIRE',
    sku: 'GY-2756518',
    brand: 'Goodyear',
    name: 'Wrangler Duratrac',
    tireSize: '275/65R18',
    speedRating: 'T',
    loadIndex: '116',
    category: 'LT',
    cost: 190.00,
    price: 285.00,
    quantityOnHand: 4,
    binLocation: 'B-05'
  },
  {
    id: 'inv-3',
    orgId: 'org-1',
    locationId: 'loc-1',
    type: 'PART',
    sku: 'OIL-0W20-SYN',
    brand: 'Mobil1',
    name: '0W-20 Synthetic Oil (Qt)',
    cost: 4.50,
    price: 12.99,
    quantityOnHand: 150,
    binLocation: 'OIL-ROOM'
  },
  {
    id: 'inv-4',
    orgId: 'org-1',
    locationId: 'loc-1',
    type: 'PART',
    sku: 'FL-500S',
    brand: 'Motorcraft',
    name: 'Oil Filter',
    cost: 3.25,
    price: 8.99,
    quantityOnHand: 12,
    binLocation: 'F-12'
  }
];

export const MOCK_ROS: RepairOrder[] = [
  {
    id: 'ro-1001',
    orgId: 'org-1',
    locationId: 'loc-1',
    roNumber: 1001,
    customerId: 'cust-1',
    vehicleId: 'veh-1',
    advisorId: 'user-4',
    technicianId: 'user-3',
    workflowId: 'wf-standard',
    status: 'WORK_IN_PROGRESS',
    createdAt: subDays(new Date(), 1).toISOString(),
    promisedAt: addDays(new Date(), 0).toISOString(),
    odometerIn: 45000,
    notes: 'Customer hears a rattle in the front right.',
    jobs: [
      {
        id: 'job-1',
        name: 'Front Suspension',
        description: 'Customer states rattle noise from front right',
        lineItems: [
          {
            id: 'li-1',
            type: 'LABOR',
            description: 'Diagnose Front Suspension Noise',
            quantity: 1,
            unitCost: 30,
            unitPrice: 120,
            technicianId: 'user-3',
            approved: true
          },
          {
            id: 'li-2',
            type: 'PART',
            description: 'Sway Bar Link',
            quantity: 1,
            unitCost: 25,
            unitPrice: 65,
            approved: true
          }
        ]
      }
    ]
  },
  {
    id: 'ro-1002',
    orgId: 'org-1',
    locationId: 'loc-1',
    roNumber: 1002,
    customerId: 'cust-2',
    vehicleId: 'veh-2',
    advisorId: 'user-4',
    workflowId: 'wf-standard',
    status: 'ESTIMATE',
    createdAt: new Date().toISOString(),
    odometerIn: 28000,
    notes: 'Quote for 4 tires',
    jobs: [
      {
        id: 'job-1',
        name: 'Tires',
        description: 'Replace all 4 tires',
        lineItems: [
          {
            id: 'li-3',
            type: 'TIRE',
            description: 'Goodyear Wrangler Duratrac 275/65R18',
            quantity: 4,
            unitCost: 190,
            unitPrice: 285,
            inventoryItemId: 'inv-2',
            approved: false
          },
          {
            id: 'li-4',
            type: 'LABOR',
            description: 'Mount & Balance',
            quantity: 4,
            unitCost: 10,
            unitPrice: 25,
            approved: false
          }
        ]
      }
    ]
  },
  {
    id: 'ro-1003',
    orgId: 'org-1',
    locationId: 'loc-1',
    roNumber: 1003,
    customerId: 'cust-1',
    vehicleId: 'veh-1',
    advisorId: 'user-4',
    workflowId: 'wf-quick',
    status: 'LUBE_BAY',
    createdAt: new Date().toISOString(),
    odometerIn: 45100,
    notes: 'Quick oil change waiter',
    jobs: [
      {
        id: 'job-1',
        name: 'Oil Change',
        description: 'Full synthetic service',
        lineItems: [
          {
            id: 'li-8',
            type: 'LABOR',
            description: 'Oil Change Service',
            quantity: 1,
            unitCost: 15,
            unitPrice: 35,
            approved: true
          }
        ]
      }
    ]
  },
  {
    id: 'ro-1000',
    orgId: 'org-1',
    locationId: 'loc-1',
    roNumber: 1000,
    customerId: 'cust-1',
    vehicleId: 'veh-1',
    advisorId: 'user-4',
    technicianId: 'user-3',
    workflowId: 'wf-standard',
    status: 'COMPLETED',
    createdAt: subDays(new Date(), 2).toISOString(),
    completedAt: subDays(new Date(), 1).toISOString(),
    odometerIn: 44800,
    notes: 'Oil change',
    jobs: [
      {
        id: 'job-1',
        name: 'Maintenance',
        description: 'Regular scheduled maintenance',
        lineItems: [
          {
            id: 'li-5',
            type: 'PART',
            description: '0W-20 Synthetic Oil (Qt)',
            quantity: 5,
            unitCost: 4.50,
            unitPrice: 12.99,
            inventoryItemId: 'inv-3',
            approved: true
          },
          {
            id: 'li-6',
            type: 'PART',
            description: 'Oil Filter',
            quantity: 1,
            unitCost: 3.25,
            unitPrice: 8.99,
            inventoryItemId: 'inv-4',
            approved: true
          },
          {
            id: 'li-7',
            type: 'LABOR',
            description: 'Oil Change Service',
            quantity: 0.5,
            unitCost: 30,
            unitPrice: 40,
            technicianId: 'user-3',
            approved: true
          }
        ]
      }
    ]
  }
];

export const MOCK_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-1',
    orgId: 'org-1',
    userId: 'user-4',
    action: 'RO_CREATE',
    targetType: 'RepairOrder',
    targetId: 'ro-1002',
    details: 'Created RO #1002',
    timestamp: subDays(new Date(), 0).toISOString()
  }
];

export const MOCK_INSPECTION_TEMPLATES: InspectionTemplate[] = [
  {
    id: 'tmpl-standard',
    name: 'Standard 25-Point Inspection',
    items: [
      { id: 'item-1', label: 'Engine Oil Level', category: 'Under Hood' },
      { id: 'item-2', label: 'Coolant Level', category: 'Under Hood' },
      { id: 'item-3', label: 'Air Filter', category: 'Under Hood' },
      { id: 'item-4', label: 'Brake Fluid', category: 'Under Hood' },
      { id: 'item-5', label: 'Front Brake Pads', category: 'Brakes' },
      { id: 'item-6', label: 'Rear Brake Pads', category: 'Brakes' },
      { id: 'item-7', label: 'Front Tires', category: 'Tires' },
      { id: 'item-8', label: 'Rear Tires', category: 'Tires' },
      { id: 'item-9', label: 'Wipers', category: 'Exterior' },
      { id: 'item-10', label: 'Lights', category: 'Exterior' },
    ]
  }
];

export const MOCK_INSPECTIONS: Inspection[] = [];

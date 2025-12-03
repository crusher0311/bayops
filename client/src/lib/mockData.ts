import { 
  Organization, Location, User, Customer, Vehicle, 
  InventoryItem, RepairOrder, AuditLog 
} from './types';
import { addDays, subDays } from 'date-fns';

export const MOCK_ORG: Organization = {
  id: 'org-1',
  name: 'Apex Auto Group',
  slug: 'apex-auto'
};

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
    taxRate: 0.0825
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
    taxRate: 0.0825
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
    status: 'WORK_IN_PROGRESS',
    createdAt: subDays(new Date(), 1).toISOString(),
    promisedAt: addDays(new Date(), 0).toISOString(),
    odometerIn: 45000,
    notes: 'Customer hears a rattle in the front right.',
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
  },
  {
    id: 'ro-1002',
    orgId: 'org-1',
    locationId: 'loc-1',
    roNumber: 1002,
    customerId: 'cust-2',
    vehicleId: 'veh-2',
    advisorId: 'user-4',
    status: 'ESTIMATE',
    createdAt: new Date().toISOString(),
    odometerIn: 28000,
    notes: 'Quote for 4 tires',
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
    status: 'COMPLETED',
    createdAt: subDays(new Date(), 2).toISOString(),
    completedAt: subDays(new Date(), 1).toISOString(),
    odometerIn: 44800,
    notes: 'Oil change',
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

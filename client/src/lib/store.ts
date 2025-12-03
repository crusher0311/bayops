import { create } from 'zustand';
import { 
  Organization, Location, User, Customer, Vehicle, 
  InventoryItem, RepairOrder, AuditLog, WorkflowDefinition,
  Inspection, InspectionTemplate, InspectionItemResult 
} from './types';
import { 
  MOCK_ORG, MOCK_LOCATIONS, MOCK_USERS, MOCK_CUSTOMERS, 
  MOCK_VEHICLES, MOCK_INVENTORY, MOCK_ROS, MOCK_AUDIT_LOGS,
  DEFAULT_WORKFLOWS, MOCK_INSPECTION_TEMPLATES, MOCK_INSPECTIONS 
} from './mockData';

interface ShopState {
  // Current Context
  currentUser: User | null;
  currentLocation: Location | null;
  
  // Data
  organization: Organization;
  locations: Location[];
  users: User[];
  customers: Customer[];
  vehicles: Vehicle[];
  inventory: InventoryItem[];
  ros: RepairOrder[];
  auditLogs: AuditLog[];
  
  // Settings
  workflows: WorkflowDefinition[];
  
  // DVI
  inspectionTemplates: InspectionTemplate[];
  inspections: Inspection[];

  // Actions
  login: (email: string) => void;
  logout: () => void;
  setCurrentLocation: (locationId: string) => void;
  
  addCustomer: (customer: Customer) => void;
  addVehicle: (vehicle: Vehicle) => void;
  addRO: (ro: RepairOrder) => void;
  updateROStatus: (roId: string, status: string) => void;
  updateInventoryQuantity: (itemId: string, delta: number) => void;
  
  // Workflow Actions
  updateWorkflows: (workflows: WorkflowDefinition[]) => void;

  // DVI Actions
  createInspection: (roId: string, templateId: string, techId: string) => void;
  updateInspectionItem: (inspectionId: string, result: InspectionItemResult) => void;
  completeInspection: (inspectionId: string) => void;
}

export const useShopStore = create<ShopState>((set, get) => ({
  currentUser: MOCK_USERS[0], // Default logged in as Owner for MVP demo
  currentLocation: MOCK_LOCATIONS[0],
  
  organization: MOCK_ORG,
  locations: MOCK_LOCATIONS,
  users: MOCK_USERS,
  customers: MOCK_CUSTOMERS,
  vehicles: MOCK_VEHICLES,
  inventory: MOCK_INVENTORY,
  ros: MOCK_ROS,
  auditLogs: MOCK_AUDIT_LOGS,
  workflows: DEFAULT_WORKFLOWS,
  inspectionTemplates: MOCK_INSPECTION_TEMPLATES,
  inspections: MOCK_INSPECTIONS,

  login: (email: string) => {
    const user = get().users.find(u => u.email === email);
    if (user) {
      set({ currentUser: user });
    }
  },

  logout: () => set({ currentUser: null }),

  setCurrentLocation: (locationId: string) => {
    const loc = get().locations.find(l => l.id === locationId);
    if (loc) {
      set({ currentLocation: loc });
    }
  },

  addCustomer: (customer) => set((state) => ({ customers: [...state.customers, customer] })),
  
  addVehicle: (vehicle) => set((state) => ({ vehicles: [...state.vehicles, vehicle] })),
  
  addRO: (ro) => set((state) => ({ ros: [...state.ros, ro] })),

  updateROStatus: (roId, status) => set((state) => {
    const ro = state.ros.find(r => r.id === roId);
    if (!ro) return {};

    // Create audit log
    const log: AuditLog = {
      id: `log-${Date.now()}`,
      orgId: state.organization.id,
      userId: state.currentUser?.id || 'unknown',
      action: 'RO_STATUS_CHANGE',
      targetType: 'RepairOrder',
      targetId: roId,
      details: `Status changed from ${ro.status} to ${status}`,
      timestamp: new Date().toISOString()
    };

    return {
      ros: state.ros.map(r => r.id === roId ? { ...r, status } : r),
      auditLogs: [log, ...state.auditLogs]
    };
  }),

  updateInventoryQuantity: (itemId, delta) => set((state) => ({
    inventory: state.inventory.map(i => 
      i.id === itemId ? { ...i, quantityOnHand: i.quantityOnHand + delta } : i
    )
  })),

  updateWorkflows: (workflows) => set({ workflows }),

  createInspection: (roId, templateId, techId) => set((state) => {
    const template = state.inspectionTemplates.find(t => t.id === templateId);
    if (!template) return {};

    const newInspection: Inspection = {
      id: `insp-${Date.now()}`,
      roId,
      templateId,
      technicianId: techId,
      startedAt: new Date().toISOString(),
      items: template.items.map(item => ({
        itemId: item.id,
        status: 'GREEN' // Default to green
      }))
    };

    return { inspections: [...state.inspections, newInspection] };
  }),

  updateInspectionItem: (inspectionId, result) => set((state) => ({
    inspections: state.inspections.map(insp => 
      insp.id === inspectionId 
        ? { 
            ...insp, 
            items: insp.items.map(i => i.itemId === result.itemId ? { ...i, ...result } : i) 
          }
        : insp
    )
  })),

  completeInspection: (inspectionId) => set((state) => ({
    inspections: state.inspections.map(insp =>
      insp.id === inspectionId
        ? { ...insp, completedAt: new Date().toISOString() }
        : insp
    )
  }))
}));

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import type { 
  Location, 
  Customer, 
  Vehicle, 
  RepairOrder, 
  Workflow,
  InventoryItem,
  InsertCustomer,
  InsertVehicle,
  InsertRepairOrder,
} from '@shared/schema';

// Locations
export function useLocations() {
  return useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: () => api.getLocations(),
  });
}

export function useLocation(id: string) {
  return useQuery<Location>({
    queryKey: ['locations', id],
    queryFn: () => api.getLocation(id),
    enabled: !!id,
  });
}

// Customers
export function useCustomers(search?: string) {
  return useQuery<Customer[]>({
    queryKey: ['customers', search],
    queryFn: () => api.getCustomers(search),
  });
}

export function useCustomer(id: string) {
  return useQuery<Customer>({
    queryKey: ['customers', id],
    queryFn: () => api.getCustomer(id),
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (customer: InsertCustomer) => api.createCustomer(customer),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<InsertCustomer> }) => 
      api.updateCustomer(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

// Vehicles
export function useVehicles() {
  return useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const response = await fetch('/api/vehicles', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch vehicles');
      return response.json();
    },
  });
}

export function useVehiclesByCustomer(customerId: string) {
  return useQuery<Vehicle[]>({
    queryKey: ['vehicles', 'customer', customerId],
    queryFn: () => api.getVehiclesByCustomer(customerId),
    enabled: !!customerId,
  });
}

export function useVehicle(id: string) {
  return useQuery<Vehicle>({
    queryKey: ['vehicles', id],
    queryFn: () => api.getVehicle(id),
    enabled: !!id,
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vehicle: InsertVehicle) => api.createVehicle(vehicle),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

// Workflows
export function useWorkflows() {
  return useQuery<Workflow[]>({
    queryKey: ['workflows'],
    queryFn: () => api.getWorkflows(),
  });
}

// Repair Orders
export function useRepairOrders(locationId?: string) {
  return useQuery<RepairOrder[]>({
    queryKey: ['repair-orders', locationId],
    queryFn: () => api.getRepairOrders(locationId),
  });
}

export function useRepairOrder(id: string) {
  return useQuery<RepairOrder>({
    queryKey: ['repair-orders', id],
    queryFn: () => api.getRepairOrder(id),
    enabled: !!id,
  });
}

export function useCreateRepairOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ro: InsertRepairOrder) => api.createRepairOrder(ro),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repair-orders'] });
    },
  });
}

export function useUpdateRepairOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<InsertRepairOrder> }) => 
      api.updateRepairOrder(id, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['repair-orders'] });
      queryClient.invalidateQueries({ queryKey: ['repair-orders', variables.id] });
    },
  });
}

// Inventory
export function useInventory(locationId: string, search?: string) {
  return useQuery<InventoryItem[]>({
    queryKey: ['inventory', locationId, search],
    queryFn: () => api.getInventory(locationId, search),
    enabled: !!locationId,
  });
}

// Users
export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await fetch('/api/users', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
  });
}

// Labor Guide
export interface LaborGuideRepair {
  title: string;
  description: string;
  value: string;
  costs: Array<{
    name: string;
    desc: string;
    high: number;
    low: number;
  }>;
}

export interface LaborGuideData {
  status: string;
  data?: {
    year: string;
    make: string;
    model: string;
    repair?: Array<{
      trim: string;
      repair: LaborGuideRepair[];
    }>;
  };
}

export function useLaborGuide(year: number | string, make: string, model: string) {
  return useQuery<LaborGuideData>({
    queryKey: ['labor-guide', year, make, model],
    queryFn: async () => {
      const response = await fetch(
        `/api/labor-guide?year=${year}&make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`,
        { credentials: 'include' }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch labor guide');
      }
      return response.json();
    },
    enabled: !!year && !!make && !!model,
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
  });
}

// AI Service Writer Hooks
interface VehicleInfo {
  year: number;
  make: string;
  model: string;
  mileage?: number | null;
}

interface JobInfo {
  name: string;
  description?: string;
  lineItems: Array<{
    type: string;
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export function useGenerateServiceDescription() {
  return useMutation({
    mutationFn: async ({ job, vehicle }: { job: JobInfo; vehicle: VehicleInfo }) => {
      const response = await fetch('/api/ai/service-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ job, vehicle }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate description');
      }
      return response.json();
    },
  });
}

export function useGenerateAuthorizationRequest() {
  return useMutation({
    mutationFn: async ({ 
      vehicle, 
      jobs, 
      notes, 
      customerName 
    }: { 
      vehicle: VehicleInfo; 
      jobs: JobInfo[]; 
      notes?: string; 
      customerName?: string;
    }) => {
      const response = await fetch('/api/ai/authorization-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ vehicle, jobs, notes, customerName }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate authorization request');
      }
      return response.json();
    },
  });
}

export function useGenerateDiagnosticSummary() {
  return useMutation({
    mutationFn: async ({ 
      symptoms, 
      vehicle, 
      dtcCodes 
    }: { 
      symptoms: string; 
      vehicle: VehicleInfo; 
      dtcCodes?: string[];
    }) => {
      const response = await fetch('/api/ai/diagnostic-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ symptoms, vehicle, dtcCodes }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate diagnostic summary');
      }
      return response.json();
    },
  });
}

export function useGetServiceRecommendations() {
  return useMutation({
    mutationFn: async ({ 
      vehicle, 
      serviceHistory 
    }: { 
      vehicle: VehicleInfo; 
      serviceHistory?: string[];
    }) => {
      const response = await fetch('/api/ai/service-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ vehicle, serviceHistory }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get recommendations');
      }
      return response.json();
    },
  });
}

export function useImproveJobDescription() {
  return useMutation({
    mutationFn: async ({ 
      currentDescription, 
      jobName, 
      vehicle 
    }: { 
      currentDescription: string; 
      jobName: string; 
      vehicle: VehicleInfo;
    }) => {
      const response = await fetch('/api/ai/improve-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentDescription, jobName, vehicle }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to improve description');
      }
      return response.json();
    },
  });
}

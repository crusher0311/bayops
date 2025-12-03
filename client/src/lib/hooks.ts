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

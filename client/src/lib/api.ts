import type {
  Organization,
  Location,
  User,
  Customer,
  Vehicle,
  DeferredWork,
  Workflow,
  RepairOrder,
  InventoryItem,
  StockTransaction,
  InspectionTemplate,
  Inspection,
  InsertCustomer,
  InsertVehicle,
  InsertRepairOrder,
  InsertInventoryItem,
} from "@shared/schema";

class ApiClient {
  private async request<T>(
    url: string,
    options?: RequestInit
  ): Promise<T> {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Request failed" }));
      throw new Error(error.message || `Request failed with status ${response.status}`);
    }

    return response.json();
  }

  // Auth
  async login(username: string, password: string): Promise<{ user: User }> {
    return this.request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  }

  async register(userData: { username: string; password: string; name: string; email: string; role: string; orgId: string; locationIds: string[] }): Promise<{ user: User }> {
    return this.request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  async logout(): Promise<void> {
    return this.request("/api/auth/logout", { method: "POST" });
  }

  async getCurrentUser(): Promise<{ user: User }> {
    return this.request("/api/auth/me");
  }

  // Organizations
  async getOrganization(id: string): Promise<Organization> {
    return this.request(`/api/organizations/${id}`);
  }

  // Locations
  async getLocations(): Promise<Location[]> {
    return this.request("/api/locations");
  }

  async getLocation(id: string): Promise<Location> {
    return this.request(`/api/locations/${id}`);
  }

  async createLocation(location: Omit<Location, "id" | "createdAt" | "orgId">): Promise<Location> {
    return this.request("/api/locations", {
      method: "POST",
      body: JSON.stringify(location),
    });
  }

  // Customers
  async getCustomers(search?: string): Promise<Customer[]> {
    const url = search ? `/api/customers?search=${encodeURIComponent(search)}` : "/api/customers";
    return this.request(url);
  }

  async getCustomer(id: string): Promise<Customer> {
    return this.request(`/api/customers/${id}`);
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    return this.request("/api/customers", {
      method: "POST",
      body: JSON.stringify(customer),
    });
  }

  async updateCustomer(id: string, updates: Partial<InsertCustomer>): Promise<Customer> {
    return this.request(`/api/customers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  }

  // Vehicles
  async getVehiclesByCustomer(customerId: string): Promise<Vehicle[]> {
    return this.request(`/api/vehicles/customer/${customerId}`);
  }

  async getVehicle(id: string): Promise<Vehicle> {
    return this.request(`/api/vehicles/${id}`);
  }

  async createVehicle(vehicle: InsertVehicle): Promise<Vehicle> {
    return this.request("/api/vehicles", {
      method: "POST",
      body: JSON.stringify(vehicle),
    });
  }

  async updateVehicle(id: string, updates: Partial<InsertVehicle>): Promise<Vehicle> {
    return this.request(`/api/vehicles/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  }

  // Deferred Work
  async getDeferredWorkByVehicle(vehicleId: string): Promise<DeferredWork[]> {
    return this.request(`/api/deferred-work/vehicle/${vehicleId}`);
  }

  async getDeferredWorkByCustomer(customerId: string): Promise<DeferredWork[]> {
    return this.request(`/api/deferred-work/customer/${customerId}`);
  }

  async updateDeferredWork(id: string, updates: Partial<DeferredWork>): Promise<DeferredWork> {
    return this.request(`/api/deferred-work/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  }

  // Workflows
  async getWorkflows(): Promise<Workflow[]> {
    return this.request("/api/workflows");
  }

  // Repair Orders
  async getRepairOrders(locationId?: string): Promise<RepairOrder[]> {
    const url = locationId ? `/api/repair-orders?locationId=${locationId}` : "/api/repair-orders";
    return this.request(url);
  }

  async getRepairOrder(id: string): Promise<RepairOrder> {
    return this.request(`/api/repair-orders/${id}`);
  }

  async getRepairOrdersByVehicle(vehicleId: string): Promise<RepairOrder[]> {
    return this.request(`/api/repair-orders/vehicle/${vehicleId}`);
  }

  async getDashboardRepairOrders(locationId: string, limit: number = 10): Promise<Array<RepairOrder & { customer?: { firstName: string; lastName: string } | null; vehicle?: { year: string; make: string; model: string } | null }>> {
    return this.request(`/api/repair-orders/dashboard/${locationId}?limit=${limit}`);
  }

  async createRepairOrder(ro: InsertRepairOrder): Promise<RepairOrder> {
    return this.request("/api/repair-orders", {
      method: "POST",
      body: JSON.stringify(ro),
    });
  }

  async updateRepairOrder(id: string, updates: Partial<InsertRepairOrder>): Promise<RepairOrder> {
    return this.request(`/api/repair-orders/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  }

  // Inventory
  async getInventory(locationId: string, search?: string): Promise<InventoryItem[]> {
    const url = search 
      ? `/api/inventory?locationId=${locationId}&search=${encodeURIComponent(search)}`
      : `/api/inventory?locationId=${locationId}`;
    return this.request(url);
  }

  async getInventoryItem(id: string): Promise<InventoryItem> {
    return this.request(`/api/inventory/${id}`);
  }

  async createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem> {
    return this.request("/api/inventory", {
      method: "POST",
      body: JSON.stringify(item),
    });
  }

  async updateInventoryItem(id: string, updates: Partial<InsertInventoryItem>): Promise<InventoryItem> {
    return this.request(`/api/inventory/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  }

  async deleteInventoryItem(id: string): Promise<void> {
    return this.request(`/api/inventory/${id}`, {
      method: "DELETE",
    });
  }

  async getLowStockItems(locationId: string): Promise<InventoryItem[]> {
    return this.request(`/api/inventory/low-stock/${locationId}`);
  }

  async getStockTransactions(itemId: string): Promise<StockTransaction[]> {
    return this.request(`/api/inventory/${itemId}/transactions`);
  }

  async adjustInventory(itemId: string, adjustment: { type: string; quantity: number; notes?: string }): Promise<InventoryItem> {
    return this.request(`/api/inventory/${itemId}/adjust`, {
      method: "POST",
      body: JSON.stringify(adjustment),
    });
  }

  // Inspection Templates
  async getInspectionTemplates(): Promise<InspectionTemplate[]> {
    return this.request("/api/inspection-templates");
  }

  // Inspections
  async getInspectionsByRO(roId: string): Promise<Inspection[]> {
    return this.request(`/api/inspections/ro/${roId}`);
  }
}

export const api = new ApiClient();

import crypto from "crypto";

// Protractor API Base URL
const PROTRACTOR_BASE_URL = "https://integration.protractor.com/IntegrationServices/2.0";

// Types for Protractor API responses
export interface ProtractorHeader {
  ID: string;
  CreationTime: string;
  DeletionTime: string;
  DeletionTimeSpecified: boolean;
  LastModifiedTime: string;
  LastModifiedBy: string;
}

export interface ProtractorName {
  Title?: string;
  Prefix?: string;
  FirstName?: string;
  MiddleName?: string;
  LastName?: string;
  Suffix?: string;
}

export interface ProtractorAddress {
  Title?: string;
  ID?: string;
  Street?: string;
  City?: string;
  Province?: string;
  PostalCode?: string;
  Country?: string;
}

export interface ProtractorContact {
  Header: ProtractorHeader;
  ID: string;
  FileAs?: string;
  Name?: ProtractorName;
  Address?: ProtractorAddress;
  Company?: string;
  Phone1Title?: string;
  Phone1?: string;
  Phone2Title?: string;
  Phone2?: string;
  EmailTitle?: string;
  Email?: string;
  PreferredContactMethod?: string;
  MarketingSource?: string;
  Note?: string;
  NoMessaging?: boolean;
  NoEmail?: boolean;
  NoPostCard?: boolean;
}

export interface ProtractorServiceItem {
  Header: ProtractorHeader;
  ID: string;
  OwnerID: string;
  Type: string;
  LookUp?: string;
  VIN?: string;
  Year?: number;
  Make?: string;
  Model?: string;
  SubModel?: string;
  Color?: string;
  Mileage?: number;
  LicensePlate?: string;
  EngineCode?: string;
  TransmissionCode?: string;
  Note?: string;
}

export interface ProtractorServicePackageLine {
  ID: string;
  Type: string;
  Description?: string;
  Quantity?: number;
  SellPrice?: number;
  Cost?: number;
  PartNumber?: string;
  Manufacturer?: string;
  TechnicianID?: string;
  ServiceAdvisorID?: string;
}

export interface ProtractorServicePackage {
  ID: string;
  Title?: string;
  Description?: string;
  Chapter?: string;
  Status?: string;
  Lines?: ProtractorServicePackageLine[];
}

export interface ProtractorWorkOrder {
  Header: ProtractorHeader;
  ID: string;
  Number?: number;
  Type?: string;
  Status?: string;
  ContactID?: string;
  ServiceItemID?: string;
  ServiceAdvisorID?: string;
  TechnicianID?: string;
  ServicePackages?: ProtractorServicePackage[];
  Note?: string;
  PromisedDate?: string;
  CompletedDate?: string;
  Mileage?: number;
  TotalLabor?: number;
  TotalParts?: number;
  TotalSublet?: number;
  TotalTax?: number;
  GrandTotal?: number;
}

export interface ProtractorInvoice extends ProtractorWorkOrder {
  InvoiceNumber?: number;
  InvoiceDate?: string;
  PaymentMethod?: string;
  PaidAmount?: number;
}

export interface ProtractorLocation {
  ID: string;
  Name: string;
  Address?: ProtractorAddress;
  Phone?: string;
  Email?: string;
}

// Client for Protractor API
export class ProtractorClient {
  private connectionId: string;
  private apiKey: string;
  private authentication: string;

  constructor(connectionId: string, apiKey: string, authentication?: string) {
    this.connectionId = connectionId;
    this.apiKey = apiKey;
    this.authentication = authentication || this.computeAuthentication();
  }

  // Compute HMAC-SHA1 authentication token
  private computeAuthentication(): string {
    const key = this.apiKey.toLowerCase().replace(/-/g, "");
    const data = this.connectionId.toLowerCase().replace(/-/g, "");
    const hmac = crypto.createHmac("sha1", key);
    hmac.update(data);
    return hmac.digest("base64");
  }

  // Make authenticated API request
  private async request<T>(endpoint: string, options: RequestInit = {}, locationId?: string): Promise<T> {
    // Build URL with authentication as query parameters (per Swagger docs)
    const urlObj = new URL(`${PROTRACTOR_BASE_URL}${endpoint}`);
    urlObj.searchParams.set("connectionid", this.connectionId);
    urlObj.searchParams.set("apiKey", this.apiKey);
    urlObj.searchParams.set("authentication", this.authentication);
    
    // Add locationId if provided
    if (locationId) {
      urlObj.searchParams.set("locationId", locationId);
    }

    const headers: Record<string, string> = {
      "Accept": "application/json",
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> || {}),
    };

    const response = await fetch(urlObj.toString(), {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Protractor API error ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  // Test connection by fetching locations
  async testConnection(): Promise<{ success: boolean; message: string; locations?: ProtractorLocation[] }> {
    try {
      const locations = await this.getLocations();
      return {
        success: true,
        message: `Connected successfully. Found ${locations.length} location(s).`,
        locations,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Connection failed",
      };
    }
  }

  // Get locations
  async getLocations(): Promise<ProtractorLocation[]> {
    const result = await this.request<{ Locations: ProtractorLocation[] }>("/Location/");
    return result.Locations || [];
  }

  // Search contacts (requires locationId for results)
  async searchContacts(searchString: string, locationId?: string): Promise<ProtractorContact[]> {
    const encoded = encodeURIComponent(searchString);
    const result = await this.request<{ Contacts: ProtractorContact[] }>(`/Contact/Search/?searchString=${encoded}`, {}, locationId);
    return result.Contacts || [];
  }

  // Get contact by ID
  async getContact(id: string, locationId?: string): Promise<ProtractorContact> {
    return this.request<ProtractorContact>(`/Contact/${id}`, {}, locationId);
  }

  // Get all contacts for a location - Protractor requires a search pattern, use '*' for all
  async getAllContacts(locationId?: string): Promise<ProtractorContact[]> {
    try {
      // Try wildcard search first
      const result = await this.request<{ Contacts: ProtractorContact[] }>("/Contact/Search/?searchString=*", {}, locationId);
      return result.Contacts || [];
    } catch (error) {
      // If wildcard fails, try common patterns and aggregate
      console.log("[Protractor] Wildcard search failed, trying letter-based search...");
      const allContacts: Map<string, ProtractorContact> = new Map();
      
      // Search by common starting letters
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');
      for (const letter of letters) {
        try {
          const contacts = await this.searchContacts(letter, locationId);
          for (const contact of contacts) {
            if (contact.ID && !allContacts.has(contact.ID)) {
              allContacts.set(contact.ID, contact);
            }
          }
        } catch (e) {
          // Some letters may not have results, continue
        }
      }
      
      return Array.from(allContacts.values());
    }
  }

  // Get service item (vehicle) by ID
  async getServiceItem(id: string, locationId?: string): Promise<ProtractorServiceItem> {
    return this.request<ProtractorServiceItem>(`/ServiceItem/${id}`, {}, locationId);
  }

  // Get service items by owner ID
  async getServiceItemsByOwner(ownerId: string, locationId?: string): Promise<ProtractorServiceItem[]> {
    const result = await this.request<{ ServiceItems: ProtractorServiceItem[] }>(`/ServiceItem/Search/OwnerID/${ownerId}`, {}, locationId);
    return result.ServiceItems || [];
  }

  // Search service items (vehicles)
  async searchServiceItems(searchString: string, locationId?: string): Promise<ProtractorServiceItem[]> {
    const encoded = encodeURIComponent(searchString);
    const result = await this.request<{ ServiceItems: ProtractorServiceItem[] }>(`/ServiceItem/Search/?searchString=${encoded}`, {}, locationId);
    return result.ServiceItems || [];
  }

  // Get all service items for a location
  async getAllServiceItems(locationId?: string): Promise<ProtractorServiceItem[]> {
    try {
      // Try wildcard search
      const result = await this.request<{ ServiceItems: ProtractorServiceItem[] }>("/ServiceItem/Search/?searchString=*", {}, locationId);
      return result.ServiceItems || [];
    } catch (error) {
      console.log("[Protractor] ServiceItem wildcard search failed, trying letter-based search...");
      const allItems: Map<string, ProtractorServiceItem> = new Map();
      
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');
      for (const letter of letters) {
        try {
          const items = await this.searchServiceItems(letter, locationId);
          for (const item of items) {
            if (item.ID && !allItems.has(item.ID)) {
              allItems.set(item.ID, item);
            }
          }
        } catch (e) {
          // Continue on error
        }
      }
      
      return Array.from(allItems.values());
    }
  }

  // Get active work orders
  async getActiveWorkOrders(startDate?: Date, endDate?: Date, locationId?: string): Promise<ProtractorWorkOrder[]> {
    let url = "/WorkOrder/?readInProgress=true";
    
    if (startDate) {
      url += `&startDate=${startDate.toISOString()}`;
    }
    if (endDate) {
      url += `&endDate=${endDate.toISOString()}`;
    }

    const result = await this.request<{ WorkOrders: ProtractorWorkOrder[] }>(url, {}, locationId);
    return result.WorkOrders || [];
  }

  // Get work order by ID (with full details)
  async getWorkOrder(id: string, locationId?: string): Promise<ProtractorWorkOrder> {
    return this.request<ProtractorWorkOrder>(`/WorkOrder/${id}`, {}, locationId);
  }

  // Get invoices by date range
  async getInvoices(startDate: Date, endDate: Date, locationId?: string): Promise<ProtractorInvoice[]> {
    const url = `/Invoice/?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
    const result = await this.request<{ Invoices: ProtractorInvoice[] }>(url, {}, locationId);
    return result.Invoices || [];
  }

  // Get invoice by ID
  async getInvoice(id: string, locationId?: string): Promise<ProtractorInvoice> {
    return this.request<ProtractorInvoice>(`/Invoice/${id}`, {}, locationId);
  }

  // Get employees (technicians and service advisors)
  async getEmployees(type: "All" | "ServiceAdvisor" | "Technician" = "All"): Promise<any[]> {
    const result = await this.request<{ Employees: any[] }>(`/Employee/${type}`);
    return result.Employees || [];
  }

  // Get service categories
  async getServiceCategories(): Promise<any[]> {
    const result = await this.request<{ ServiceCategories: any[] }>("/ServiceCategory/");
    return result.ServiceCategories || [];
  }

  // Get vendors
  async getVendors(): Promise<any[]> {
    const result = await this.request<{ Vendors: any[] }>("/Vendor");
    return result.Vendors || [];
  }

  // Get deferred work for a vehicle
  async getDeferredWork(serviceItemId: string, startDate: Date, endDate: Date): Promise<any[]> {
    const url = `/ServicePackage/DeferredWorks?serviceItemID=${serviceItemId}&startDate=${encodeURIComponent(startDate.toISOString())}&endDate=${encodeURIComponent(endDate.toISOString())}`;
    const result = await this.request<{ DeferredWorks: any[] }>(url);
    return result.DeferredWorks || [];
  }
}

// Factory function to create a client from environment variables
export function createProtractorClientFromEnv(): ProtractorClient | null {
  const connectionId = process.env.PRO_CONNECTION_ID;
  const apiKey = process.env.PRO_API_KEY;
  const authentication = process.env.PRO_AUTHENTICATION;

  if (!connectionId || !apiKey) {
    return null;
  }

  return new ProtractorClient(connectionId, apiKey, authentication);
}

// Factory function to create a client from credentials
export function createProtractorClient(
  connectionId: string,
  apiKey: string,
  authentication?: string
): ProtractorClient {
  return new ProtractorClient(connectionId, apiKey, authentication);
}

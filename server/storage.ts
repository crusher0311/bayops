import {
  users,
  organizations,
  locations,
  customers,
  vehicles,
  workflows,
  repairOrders,
  inventoryItems,
  inspectionTemplates,
  inspections,
  auditLogs,
  laborRates,
  shopFees,
  discounts,
  taxSettings,
  jobCategories,
  paymentTypes,
  invoiceSettings,
  roSettings,
  partsMatrices,
  laborMatrices,
  leadSources,
  customerSettings,
  transparencySettings,
  orgBranding,
  type User,
  type InsertUser,
  type Organization,
  type InsertOrganization,
  type Location,
  type InsertLocation,
  type Customer,
  type InsertCustomer,
  type Vehicle,
  type InsertVehicle,
  type Workflow,
  type InsertWorkflow,
  type RepairOrder,
  type InsertRepairOrder,
  type InventoryItem,
  type InsertInventoryItem,
  type InspectionTemplate,
  type InsertInspectionTemplate,
  type Inspection,
  type InsertInspection,
  type AuditLog,
  type InsertAuditLog,
  type LaborRate,
  type InsertLaborRate,
  type ShopFee,
  type InsertShopFee,
  type Discount,
  type InsertDiscount,
  type TaxSettings,
  type InsertTaxSettings,
  type JobCategory,
  type InsertJobCategory,
  type PaymentType,
  type InsertPaymentType,
  type InvoiceSettings,
  type InsertInvoiceSettings,
  type RoSettings,
  type InsertRoSettings,
  type PartsMatrix,
  type InsertPartsMatrix,
  type LaborMatrix,
  type InsertLaborMatrix,
  type LeadSource,
  type InsertLeadSource,
  type CustomerSettings,
  type InsertCustomerSettings,
  type TransparencySettings,
  type InsertTransparencySettings,
  type OrgBranding,
  type InsertOrgBranding,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, inArray, desc, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsersByOrg(orgId: string): Promise<User[]>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined>;

  // Organizations
  getOrganization(id: string): Promise<Organization | undefined>;
  getOrganizationBySlug(slug: string): Promise<Organization | undefined>;
  createOrganization(org: InsertOrganization): Promise<Organization>;
  updateOrganization(id: string, updates: Partial<InsertOrganization>): Promise<Organization | undefined>;

  // Locations
  getLocation(id: string): Promise<Location | undefined>;
  getLocationsByOrg(orgId: string): Promise<Location[]>;
  createLocation(location: InsertLocation): Promise<Location>;
  updateLocation(id: string, updates: Partial<InsertLocation>): Promise<Location | undefined>;

  // Customers
  getCustomer(id: string, orgId: string): Promise<Customer | undefined>;
  getCustomersByOrg(orgId: string): Promise<Customer[]>;
  searchCustomers(orgId: string, query: string): Promise<Customer[]>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, orgId: string, updates: Partial<InsertCustomer>): Promise<Customer | undefined>;

  // Vehicles
  getVehicle(id: string): Promise<Vehicle | undefined>;
  getVehiclesByOrg(orgId: string): Promise<Vehicle[]>;
  getVehiclesByCustomer(customerId: string): Promise<Vehicle[]>;
  searchVehiclesByVin(vin: string, orgId: string): Promise<Vehicle[]>;
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  updateVehicle(id: string, updates: Partial<InsertVehicle>): Promise<Vehicle | undefined>;

  // Workflows
  getWorkflow(id: string, orgId: string): Promise<Workflow | undefined>;
  getWorkflowsByOrg(orgId: string): Promise<Workflow[]>;
  getDefaultWorkflow(orgId: string): Promise<Workflow | undefined>;
  createWorkflow(workflow: InsertWorkflow): Promise<Workflow>;
  updateWorkflow(id: string, orgId: string, updates: Partial<InsertWorkflow>): Promise<Workflow | undefined>;

  // Repair Orders
  getRepairOrder(id: string, orgId: string): Promise<RepairOrder | undefined>;
  getRepairOrdersByLocation(locationId: string, orgId: string): Promise<RepairOrder[]>;
  getRepairOrdersByOrg(orgId: string): Promise<RepairOrder[]>;
  createRepairOrder(ro: InsertRepairOrder): Promise<RepairOrder>;
  updateRepairOrder(id: string, orgId: string, updates: Partial<InsertRepairOrder>): Promise<RepairOrder | undefined>;

  // Inventory
  getInventoryItem(id: string, orgId: string): Promise<InventoryItem | undefined>;
  getInventoryByLocation(locationId: string, orgId: string): Promise<InventoryItem[]>;
  searchInventory(locationId: string, orgId: string, query: string): Promise<InventoryItem[]>;
  createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem>;
  updateInventoryItem(id: string, orgId: string, updates: Partial<InsertInventoryItem>): Promise<InventoryItem | undefined>;

  // Inspection Templates
  getInspectionTemplate(id: string, orgId: string): Promise<InspectionTemplate | undefined>;
  getInspectionTemplatesByOrg(orgId: string): Promise<InspectionTemplate[]>;
  createInspectionTemplate(template: InsertInspectionTemplate): Promise<InspectionTemplate>;

  // Inspections
  getInspection(id: string): Promise<Inspection | undefined>;
  getInspectionsByRO(roId: string): Promise<Inspection[]>;
  createInspection(inspection: InsertInspection): Promise<Inspection>;
  updateInspection(id: string, updates: Partial<InsertInspection>): Promise<Inspection | undefined>;

  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogsByOrg(orgId: string, limit?: number): Promise<AuditLog[]>;

  // ==========================================
  // PHASE 1: CONFIGURATION SETTINGS
  // ==========================================

  // Labor Rates
  getLaborRatesByLocation(locationId: string): Promise<LaborRate[]>;
  createLaborRate(rate: InsertLaborRate): Promise<LaborRate>;
  updateLaborRate(id: string, updates: Partial<InsertLaborRate>): Promise<LaborRate | undefined>;
  deleteLaborRate(id: string): Promise<boolean>;

  // Shop Fees
  getShopFeesByLocation(locationId: string): Promise<ShopFee[]>;
  createShopFee(fee: InsertShopFee): Promise<ShopFee>;
  updateShopFee(id: string, updates: Partial<InsertShopFee>): Promise<ShopFee | undefined>;
  deleteShopFee(id: string): Promise<boolean>;

  // Discounts
  getDiscountsByLocation(locationId: string): Promise<Discount[]>;
  createDiscount(discount: InsertDiscount): Promise<Discount>;
  updateDiscount(id: string, updates: Partial<InsertDiscount>): Promise<Discount | undefined>;
  deleteDiscount(id: string): Promise<boolean>;

  // Tax Settings
  getTaxSettingsByLocation(locationId: string): Promise<TaxSettings | undefined>;
  upsertTaxSettings(settings: InsertTaxSettings): Promise<TaxSettings>;

  // Job Categories
  getJobCategoriesByLocation(locationId: string): Promise<JobCategory[]>;
  createJobCategory(category: InsertJobCategory): Promise<JobCategory>;
  updateJobCategory(id: string, updates: Partial<InsertJobCategory>): Promise<JobCategory | undefined>;
  deleteJobCategory(id: string): Promise<boolean>;

  // Payment Types
  getPaymentTypesByLocation(locationId: string): Promise<PaymentType[]>;
  createPaymentType(type: InsertPaymentType): Promise<PaymentType>;
  updatePaymentType(id: string, updates: Partial<InsertPaymentType>): Promise<PaymentType | undefined>;
  deletePaymentType(id: string): Promise<boolean>;

  // Invoice Settings
  getInvoiceSettingsByLocation(locationId: string): Promise<InvoiceSettings | undefined>;
  upsertInvoiceSettings(settings: InsertInvoiceSettings): Promise<InvoiceSettings>;

  // RO Settings
  getRoSettingsByLocation(locationId: string): Promise<RoSettings | undefined>;
  upsertRoSettings(settings: InsertRoSettings): Promise<RoSettings>;

  // Parts Matrix
  getPartsMatricesByLocation(locationId: string): Promise<PartsMatrix[]>;
  createPartsMatrix(matrix: InsertPartsMatrix): Promise<PartsMatrix>;
  updatePartsMatrix(id: string, updates: Partial<InsertPartsMatrix>): Promise<PartsMatrix | undefined>;
  deletePartsMatrix(id: string): Promise<boolean>;

  // Labor Matrix
  getLaborMatricesByLocation(locationId: string): Promise<LaborMatrix[]>;
  createLaborMatrix(matrix: InsertLaborMatrix): Promise<LaborMatrix>;
  updateLaborMatrix(id: string, updates: Partial<InsertLaborMatrix>): Promise<LaborMatrix | undefined>;
  deleteLaborMatrix(id: string): Promise<boolean>;

  // Lead Sources
  getLeadSourcesByLocation(locationId: string): Promise<LeadSource[]>;
  createLeadSource(source: InsertLeadSource): Promise<LeadSource>;
  updateLeadSource(id: string, updates: Partial<InsertLeadSource>): Promise<LeadSource | undefined>;
  deleteLeadSource(id: string): Promise<boolean>;

  // Customer Settings
  getCustomerSettingsByLocation(locationId: string): Promise<CustomerSettings | undefined>;
  upsertCustomerSettings(settings: InsertCustomerSettings): Promise<CustomerSettings>;

  // Transparency Settings
  getTransparencySettingsByLocation(locationId: string): Promise<TransparencySettings | undefined>;
  upsertTransparencySettings(settings: InsertTransparencySettings): Promise<TransparencySettings>;

  // Org Branding
  getOrgBranding(orgId: string): Promise<OrgBranding | undefined>;
  upsertOrgBranding(branding: InsertOrgBranding): Promise<OrgBranding>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getUsersByOrg(orgId: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.orgId, orgId));
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  // Organizations
  async getOrganization(id: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    return org || undefined;
  }

  async getOrganizationBySlug(slug: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.slug, slug));
    return org || undefined;
  }

  async createOrganization(insertOrg: InsertOrganization): Promise<Organization> {
    const [org] = await db.insert(organizations).values(insertOrg).returning();
    return org;
  }

  async updateOrganization(id: string, updates: Partial<InsertOrganization>): Promise<Organization | undefined> {
    const [org] = await db.update(organizations).set(updates).where(eq(organizations.id, id)).returning();
    return org || undefined;
  }

  // Locations
  async getLocation(id: string): Promise<Location | undefined> {
    const [location] = await db.select().from(locations).where(eq(locations.id, id));
    return location || undefined;
  }

  async getLocationsByOrg(orgId: string): Promise<Location[]> {
    return db.select().from(locations).where(eq(locations.orgId, orgId));
  }

  async createLocation(insertLocation: InsertLocation): Promise<Location> {
    const [location] = await db.insert(locations).values(insertLocation).returning();
    return location;
  }

  async updateLocation(id: string, updates: Partial<InsertLocation>): Promise<Location | undefined> {
    const [location] = await db.update(locations).set(updates).where(eq(locations.id, id)).returning();
    return location || undefined;
  }

  // Customers
  async getCustomer(id: string, orgId: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(
      and(eq(customers.id, id), eq(customers.orgId, orgId))
    );
    return customer || undefined;
  }

  async getCustomersByOrg(orgId: string): Promise<Customer[]> {
    return db.select().from(customers).where(eq(customers.orgId, orgId)).orderBy(desc(customers.createdAt));
  }

  async searchCustomers(orgId: string, query: string): Promise<Customer[]> {
    const searchPattern = `%${query}%`;
    return db.select().from(customers).where(
      and(
        eq(customers.orgId, orgId),
        sql`(${customers.firstName} ILIKE ${searchPattern} OR ${customers.lastName} ILIKE ${searchPattern} OR ${customers.email} ILIKE ${searchPattern} OR ${customers.phone} ILIKE ${searchPattern})`
      )
    ).limit(20);
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const [customer] = await db.insert(customers).values(insertCustomer).returning();
    return customer;
  }

  async updateCustomer(id: string, orgId: string, updates: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const [customer] = await db.update(customers).set(updates).where(
      and(eq(customers.id, id), eq(customers.orgId, orgId))
    ).returning();
    return customer || undefined;
  }

  // Vehicles
  async getVehicle(id: string): Promise<Vehicle | undefined> {
    const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, id));
    return vehicle || undefined;
  }

  async getVehiclesByOrg(orgId: string): Promise<Vehicle[]> {
    return db.select()
      .from(vehicles)
      .innerJoin(customers, eq(vehicles.customerId, customers.id))
      .where(eq(customers.orgId, orgId))
      .then(rows => rows.map(r => r.vehicles));
  }

  async getVehiclesByCustomer(customerId: string): Promise<Vehicle[]> {
    return db.select().from(vehicles).where(eq(vehicles.customerId, customerId));
  }

  async searchVehiclesByVin(vin: string, orgId: string): Promise<Vehicle[]> {
    const vehiclesWithCustomers = await db
      .select({
        vehicle: vehicles,
        customer: customers,
      })
      .from(vehicles)
      .innerJoin(customers, eq(vehicles.customerId, customers.id))
      .where(
        and(
          eq(customers.orgId, orgId),
          sql`${vehicles.vin} ILIKE ${`%${vin}%`}`
        )
      )
      .limit(10);
    
    return vehiclesWithCustomers.map(v => v.vehicle);
  }

  async createVehicle(insertVehicle: InsertVehicle): Promise<Vehicle> {
    const [vehicle] = await db.insert(vehicles).values(insertVehicle).returning();
    return vehicle;
  }

  async updateVehicle(id: string, updates: Partial<InsertVehicle>): Promise<Vehicle | undefined> {
    const [vehicle] = await db.update(vehicles).set(updates).where(eq(vehicles.id, id)).returning();
    return vehicle || undefined;
  }

  // Workflows
  async getWorkflow(id: string, orgId: string): Promise<Workflow | undefined> {
    const [workflow] = await db.select().from(workflows).where(
      and(eq(workflows.id, id), eq(workflows.orgId, orgId))
    );
    return workflow || undefined;
  }

  async getWorkflowsByOrg(orgId: string): Promise<Workflow[]> {
    return db.select().from(workflows).where(eq(workflows.orgId, orgId));
  }

  async getDefaultWorkflow(orgId: string): Promise<Workflow | undefined> {
    const [workflow] = await db.select().from(workflows).where(
      and(eq(workflows.orgId, orgId), eq(workflows.isDefault, true))
    );
    return workflow || undefined;
  }

  async createWorkflow(insertWorkflow: InsertWorkflow): Promise<Workflow> {
    const [workflow] = await db.insert(workflows).values(insertWorkflow).returning();
    return workflow;
  }

  async updateWorkflow(id: string, orgId: string, updates: Partial<InsertWorkflow>): Promise<Workflow | undefined> {
    const [workflow] = await db.update(workflows).set(updates).where(
      and(eq(workflows.id, id), eq(workflows.orgId, orgId))
    ).returning();
    return workflow || undefined;
  }

  // Repair Orders
  async getRepairOrder(id: string, orgId: string): Promise<RepairOrder | undefined> {
    const [ro] = await db.select().from(repairOrders).where(
      and(eq(repairOrders.id, id), eq(repairOrders.orgId, orgId))
    );
    return ro || undefined;
  }

  async getRepairOrdersByLocation(locationId: string, orgId: string): Promise<RepairOrder[]> {
    return db.select().from(repairOrders).where(
      and(eq(repairOrders.locationId, locationId), eq(repairOrders.orgId, orgId))
    ).orderBy(desc(repairOrders.createdAt));
  }

  async getRepairOrdersByOrg(orgId: string): Promise<RepairOrder[]> {
    return db.select().from(repairOrders).where(eq(repairOrders.orgId, orgId)).orderBy(desc(repairOrders.createdAt));
  }

  async createRepairOrder(insertRO: InsertRepairOrder): Promise<RepairOrder> {
    const [ro] = await db.insert(repairOrders).values(insertRO).returning();
    return ro;
  }

  async updateRepairOrder(id: string, orgId: string, updates: Partial<InsertRepairOrder>): Promise<RepairOrder | undefined> {
    const [ro] = await db.update(repairOrders).set(updates).where(
      and(eq(repairOrders.id, id), eq(repairOrders.orgId, orgId))
    ).returning();
    return ro || undefined;
  }

  // Inventory
  async getInventoryItem(id: string, orgId: string): Promise<InventoryItem | undefined> {
    const [item] = await db.select().from(inventoryItems).where(
      and(eq(inventoryItems.id, id), eq(inventoryItems.orgId, orgId))
    );
    return item || undefined;
  }

  async getInventoryByLocation(locationId: string, orgId: string): Promise<InventoryItem[]> {
    return db.select().from(inventoryItems).where(
      and(eq(inventoryItems.locationId, locationId), eq(inventoryItems.orgId, orgId))
    ).orderBy(inventoryItems.name);
  }

  async searchInventory(locationId: string, orgId: string, query: string): Promise<InventoryItem[]> {
    const searchPattern = `%${query}%`;
    return db.select().from(inventoryItems).where(
      and(
        eq(inventoryItems.locationId, locationId),
        eq(inventoryItems.orgId, orgId),
        sql`(${inventoryItems.name} ILIKE ${searchPattern} OR ${inventoryItems.sku} ILIKE ${searchPattern} OR ${inventoryItems.brand} ILIKE ${searchPattern})`
      )
    ).limit(20);
  }

  async createInventoryItem(insertItem: InsertInventoryItem): Promise<InventoryItem> {
    const [item] = await db.insert(inventoryItems).values(insertItem).returning();
    return item;
  }

  async updateInventoryItem(id: string, orgId: string, updates: Partial<InsertInventoryItem>): Promise<InventoryItem | undefined> {
    const [item] = await db.update(inventoryItems).set(updates).where(
      and(eq(inventoryItems.id, id), eq(inventoryItems.orgId, orgId))
    ).returning();
    return item || undefined;
  }

  // Inspection Templates
  async getInspectionTemplate(id: string, orgId: string): Promise<InspectionTemplate | undefined> {
    const [template] = await db.select().from(inspectionTemplates).where(
      and(eq(inspectionTemplates.id, id), eq(inspectionTemplates.orgId, orgId))
    );
    return template || undefined;
  }

  async getInspectionTemplatesByOrg(orgId: string): Promise<InspectionTemplate[]> {
    return db.select().from(inspectionTemplates).where(eq(inspectionTemplates.orgId, orgId));
  }

  async createInspectionTemplate(insertTemplate: InsertInspectionTemplate): Promise<InspectionTemplate> {
    const [template] = await db.insert(inspectionTemplates).values(insertTemplate).returning();
    return template;
  }

  // Inspections
  async getInspection(id: string): Promise<Inspection | undefined> {
    const [inspection] = await db.select().from(inspections).where(eq(inspections.id, id));
    return inspection || undefined;
  }

  async getInspectionsByRO(roId: string): Promise<Inspection[]> {
    return db.select().from(inspections).where(eq(inspections.roId, roId));
  }

  async createInspection(insertInspection: InsertInspection): Promise<Inspection> {
    const [inspection] = await db.insert(inspections).values(insertInspection).returning();
    return inspection;
  }

  async updateInspection(id: string, updates: Partial<InsertInspection>): Promise<Inspection | undefined> {
    const [inspection] = await db.update(inspections).set(updates).where(eq(inspections.id, id)).returning();
    return inspection || undefined;
  }

  // Audit Logs
  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(auditLogs).values(insertLog).returning();
    return log;
  }

  async getAuditLogsByOrg(orgId: string, limit: number = 100): Promise<AuditLog[]> {
    return db.select().from(auditLogs).where(eq(auditLogs.orgId, orgId)).orderBy(desc(auditLogs.timestamp)).limit(limit);
  }

  // ==========================================
  // PHASE 1: CONFIGURATION SETTINGS IMPLEMENTATIONS
  // ==========================================

  // Labor Rates
  async getLaborRatesByLocation(locationId: string): Promise<LaborRate[]> {
    return db.select().from(laborRates).where(eq(laborRates.locationId, locationId)).orderBy(laborRates.sortOrder);
  }

  async createLaborRate(rate: InsertLaborRate): Promise<LaborRate> {
    const [created] = await db.insert(laborRates).values(rate).returning();
    return created;
  }

  async updateLaborRate(id: string, updates: Partial<InsertLaborRate>): Promise<LaborRate | undefined> {
    const [updated] = await db.update(laborRates).set(updates).where(eq(laborRates.id, id)).returning();
    return updated || undefined;
  }

  async deleteLaborRate(id: string): Promise<boolean> {
    const result = await db.delete(laborRates).where(eq(laborRates.id, id));
    return true;
  }

  // Shop Fees
  async getShopFeesByLocation(locationId: string): Promise<ShopFee[]> {
    return db.select().from(shopFees).where(eq(shopFees.locationId, locationId)).orderBy(shopFees.sortOrder);
  }

  async createShopFee(fee: InsertShopFee): Promise<ShopFee> {
    const [created] = await db.insert(shopFees).values(fee).returning();
    return created;
  }

  async updateShopFee(id: string, updates: Partial<InsertShopFee>): Promise<ShopFee | undefined> {
    const [updated] = await db.update(shopFees).set(updates).where(eq(shopFees.id, id)).returning();
    return updated || undefined;
  }

  async deleteShopFee(id: string): Promise<boolean> {
    await db.delete(shopFees).where(eq(shopFees.id, id));
    return true;
  }

  // Discounts
  async getDiscountsByLocation(locationId: string): Promise<Discount[]> {
    return db.select().from(discounts).where(eq(discounts.locationId, locationId)).orderBy(discounts.sortOrder);
  }

  async createDiscount(discount: InsertDiscount): Promise<Discount> {
    const [created] = await db.insert(discounts).values(discount).returning();
    return created;
  }

  async updateDiscount(id: string, updates: Partial<InsertDiscount>): Promise<Discount | undefined> {
    const [updated] = await db.update(discounts).set(updates).where(eq(discounts.id, id)).returning();
    return updated || undefined;
  }

  async deleteDiscount(id: string): Promise<boolean> {
    await db.delete(discounts).where(eq(discounts.id, id));
    return true;
  }

  // Tax Settings
  async getTaxSettingsByLocation(locationId: string): Promise<TaxSettings | undefined> {
    const [settings] = await db.select().from(taxSettings).where(eq(taxSettings.locationId, locationId));
    return settings || undefined;
  }

  async upsertTaxSettings(settings: InsertTaxSettings): Promise<TaxSettings> {
    const existing = await this.getTaxSettingsByLocation(settings.locationId);
    if (existing) {
      const [updated] = await db.update(taxSettings).set(settings).where(eq(taxSettings.locationId, settings.locationId)).returning();
      return updated;
    }
    const [created] = await db.insert(taxSettings).values(settings).returning();
    return created;
  }

  // Job Categories
  async getJobCategoriesByLocation(locationId: string): Promise<JobCategory[]> {
    return db.select().from(jobCategories).where(eq(jobCategories.locationId, locationId)).orderBy(jobCategories.sortOrder);
  }

  async createJobCategory(category: InsertJobCategory): Promise<JobCategory> {
    const [created] = await db.insert(jobCategories).values(category).returning();
    return created;
  }

  async updateJobCategory(id: string, updates: Partial<InsertJobCategory>): Promise<JobCategory | undefined> {
    const [updated] = await db.update(jobCategories).set(updates).where(eq(jobCategories.id, id)).returning();
    return updated || undefined;
  }

  async deleteJobCategory(id: string): Promise<boolean> {
    await db.delete(jobCategories).where(eq(jobCategories.id, id));
    return true;
  }

  // Payment Types
  async getPaymentTypesByLocation(locationId: string): Promise<PaymentType[]> {
    return db.select().from(paymentTypes).where(eq(paymentTypes.locationId, locationId)).orderBy(paymentTypes.sortOrder);
  }

  async createPaymentType(type: InsertPaymentType): Promise<PaymentType> {
    const [created] = await db.insert(paymentTypes).values(type).returning();
    return created;
  }

  async updatePaymentType(id: string, updates: Partial<InsertPaymentType>): Promise<PaymentType | undefined> {
    const [updated] = await db.update(paymentTypes).set(updates).where(eq(paymentTypes.id, id)).returning();
    return updated || undefined;
  }

  async deletePaymentType(id: string): Promise<boolean> {
    await db.delete(paymentTypes).where(eq(paymentTypes.id, id));
    return true;
  }

  // Invoice Settings
  async getInvoiceSettingsByLocation(locationId: string): Promise<InvoiceSettings | undefined> {
    const [settings] = await db.select().from(invoiceSettings).where(eq(invoiceSettings.locationId, locationId));
    return settings || undefined;
  }

  async upsertInvoiceSettings(settings: InsertInvoiceSettings): Promise<InvoiceSettings> {
    const existing = await this.getInvoiceSettingsByLocation(settings.locationId);
    if (existing) {
      const [updated] = await db.update(invoiceSettings).set(settings).where(eq(invoiceSettings.locationId, settings.locationId)).returning();
      return updated;
    }
    const [created] = await db.insert(invoiceSettings).values(settings).returning();
    return created;
  }

  // RO Settings
  async getRoSettingsByLocation(locationId: string): Promise<RoSettings | undefined> {
    const [settings] = await db.select().from(roSettings).where(eq(roSettings.locationId, locationId));
    return settings || undefined;
  }

  async upsertRoSettings(settings: InsertRoSettings): Promise<RoSettings> {
    const existing = await this.getRoSettingsByLocation(settings.locationId);
    if (existing) {
      const [updated] = await db.update(roSettings).set(settings).where(eq(roSettings.locationId, settings.locationId)).returning();
      return updated;
    }
    const [created] = await db.insert(roSettings).values(settings).returning();
    return created;
  }

  // Parts Matrix
  async getPartsMatricesByLocation(locationId: string): Promise<PartsMatrix[]> {
    return db.select().from(partsMatrices).where(eq(partsMatrices.locationId, locationId));
  }

  async createPartsMatrix(matrix: InsertPartsMatrix): Promise<PartsMatrix> {
    const [created] = await db.insert(partsMatrices).values(matrix).returning();
    return created;
  }

  async updatePartsMatrix(id: string, updates: Partial<InsertPartsMatrix>): Promise<PartsMatrix | undefined> {
    const [updated] = await db.update(partsMatrices).set(updates).where(eq(partsMatrices.id, id)).returning();
    return updated || undefined;
  }

  async deletePartsMatrix(id: string): Promise<boolean> {
    await db.delete(partsMatrices).where(eq(partsMatrices.id, id));
    return true;
  }

  // Labor Matrix
  async getLaborMatricesByLocation(locationId: string): Promise<LaborMatrix[]> {
    return db.select().from(laborMatrices).where(eq(laborMatrices.locationId, locationId));
  }

  async createLaborMatrix(matrix: InsertLaborMatrix): Promise<LaborMatrix> {
    const [created] = await db.insert(laborMatrices).values(matrix).returning();
    return created;
  }

  async updateLaborMatrix(id: string, updates: Partial<InsertLaborMatrix>): Promise<LaborMatrix | undefined> {
    const [updated] = await db.update(laborMatrices).set(updates).where(eq(laborMatrices.id, id)).returning();
    return updated || undefined;
  }

  async deleteLaborMatrix(id: string): Promise<boolean> {
    await db.delete(laborMatrices).where(eq(laborMatrices.id, id));
    return true;
  }

  // Lead Sources
  async getLeadSourcesByLocation(locationId: string): Promise<LeadSource[]> {
    return db.select().from(leadSources).where(eq(leadSources.locationId, locationId)).orderBy(leadSources.sortOrder);
  }

  async createLeadSource(source: InsertLeadSource): Promise<LeadSource> {
    const [created] = await db.insert(leadSources).values(source).returning();
    return created;
  }

  async updateLeadSource(id: string, updates: Partial<InsertLeadSource>): Promise<LeadSource | undefined> {
    const [updated] = await db.update(leadSources).set(updates).where(eq(leadSources.id, id)).returning();
    return updated || undefined;
  }

  async deleteLeadSource(id: string): Promise<boolean> {
    await db.delete(leadSources).where(eq(leadSources.id, id));
    return true;
  }

  // Customer Settings
  async getCustomerSettingsByLocation(locationId: string): Promise<CustomerSettings | undefined> {
    const [settings] = await db.select().from(customerSettings).where(eq(customerSettings.locationId, locationId));
    return settings || undefined;
  }

  async upsertCustomerSettings(settings: InsertCustomerSettings): Promise<CustomerSettings> {
    const existing = await this.getCustomerSettingsByLocation(settings.locationId);
    if (existing) {
      const [updated] = await db.update(customerSettings).set(settings).where(eq(customerSettings.locationId, settings.locationId)).returning();
      return updated;
    }
    const [created] = await db.insert(customerSettings).values(settings).returning();
    return created;
  }

  // Transparency Settings
  async getTransparencySettingsByLocation(locationId: string): Promise<TransparencySettings | undefined> {
    const [settings] = await db.select().from(transparencySettings).where(eq(transparencySettings.locationId, locationId));
    return settings || undefined;
  }

  async upsertTransparencySettings(settings: InsertTransparencySettings): Promise<TransparencySettings> {
    const existing = await this.getTransparencySettingsByLocation(settings.locationId);
    if (existing) {
      const [updated] = await db.update(transparencySettings).set(settings).where(eq(transparencySettings.locationId, settings.locationId)).returning();
      return updated;
    }
    const [created] = await db.insert(transparencySettings).values(settings).returning();
    return created;
  }

  // Org Branding
  async getOrgBranding(orgId: string): Promise<OrgBranding | undefined> {
    const [branding] = await db.select().from(orgBranding).where(eq(orgBranding.orgId, orgId));
    return branding || undefined;
  }

  async upsertOrgBranding(branding: InsertOrgBranding): Promise<OrgBranding> {
    const existing = await this.getOrgBranding(branding.orgId);
    if (existing) {
      const [updated] = await db.update(orgBranding).set(branding).where(eq(orgBranding.orgId, branding.orgId)).returning();
      return updated;
    }
    const [created] = await db.insert(orgBranding).values(branding).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();

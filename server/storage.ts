import {
  users,
  organizations,
  locations,
  customers,
  vehicles,
  workflows,
  repairOrders,
  inventoryItems,
  stockTransactions,
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
  serviceBays,
  appointments,
  appointmentServices,
  technicianTimeLogs,
  vendors,
  partOrders,
  partOrderItems,
  invoices,
  payments,
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
  type StockTransaction,
  type InsertStockTransaction,
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
  type ServiceBay,
  type InsertServiceBay,
  type Appointment,
  type InsertAppointment,
  type AppointmentService,
  type InsertAppointmentService,
  type TechnicianTimeLog,
  type InsertTechnicianTimeLog,
  type Vendor,
  type InsertVendor,
  type PartOrder,
  type InsertPartOrder,
  type PartOrderItem,
  type InsertPartOrderItem,
  type Invoice,
  type InsertInvoice,
  type Payment,
  type InsertPayment,
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
  getRepairOrderById(id: string): Promise<RepairOrder | undefined>;
  getRepairOrdersByLocation(locationId: string, orgId: string): Promise<RepairOrder[]>;
  getRepairOrdersByOrg(orgId: string): Promise<RepairOrder[]>;
  createRepairOrder(ro: InsertRepairOrder): Promise<RepairOrder>;
  updateRepairOrder(id: string, orgId: string, updates: Partial<InsertRepairOrder>): Promise<RepairOrder | undefined>;

  // Inventory
  getInventoryItem(id: string, orgId: string): Promise<InventoryItem | undefined>;
  getInventoryByLocation(locationId: string, orgId: string): Promise<InventoryItem[]>;
  searchInventory(locationId: string, orgId: string, query: string): Promise<InventoryItem[]>;
  getLowStockItems(locationId: string, orgId: string): Promise<InventoryItem[]>;
  createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem>;
  updateInventoryItem(id: string, orgId: string, updates: Partial<InsertInventoryItem>): Promise<InventoryItem | undefined>;
  deleteInventoryItem(id: string, orgId: string): Promise<boolean>;

  // Stock Transactions
  getStockTransactions(inventoryItemId: string): Promise<StockTransaction[]>;
  createStockTransaction(transaction: InsertStockTransaction): Promise<StockTransaction>;
  adjustInventoryQuantity(itemId: string, orgId: string, adjustment: { type: string; quantity: number; notes?: string; userId?: string }): Promise<InventoryItem | undefined>;

  // Inspection Templates
  getInspectionTemplate(id: string, orgId: string): Promise<InspectionTemplate | undefined>;
  getInspectionTemplateById(id: string): Promise<InspectionTemplate | undefined>;
  getInspectionTemplatesByOrg(orgId: string): Promise<InspectionTemplate[]>;
  createInspectionTemplate(template: InsertInspectionTemplate): Promise<InspectionTemplate>;
  deleteInspectionTemplate(id: string, orgId: string): Promise<boolean>;

  // Inspections
  getInspection(id: string): Promise<Inspection | undefined>;
  getInspectionForOrg(id: string, orgId: string): Promise<Inspection | undefined>;
  getInspectionsByRO(roId: string): Promise<Inspection[]>;
  createInspection(inspection: InsertInspection): Promise<Inspection>;
  updateInspection(id: string, updates: Partial<InsertInspection>): Promise<Inspection | undefined>;
  updateInspectionForOrg(id: string, orgId: string, updates: Partial<InsertInspection>): Promise<Inspection | undefined>;
  deleteInspection(id: string): Promise<boolean>;
  deleteInspectionForOrg(id: string, orgId: string): Promise<boolean>;
  getInspectionByShareToken(token: string): Promise<Inspection | undefined>;

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

  // ==========================================
  // PHASE 2: OPERATIONAL WORKFLOWS
  // ==========================================

  // Service Bays
  getServiceBaysByLocation(locationId: string): Promise<ServiceBay[]>;
  createServiceBay(bay: InsertServiceBay): Promise<ServiceBay>;
  updateServiceBay(id: string, updates: Partial<InsertServiceBay>): Promise<ServiceBay | undefined>;
  deleteServiceBay(id: string): Promise<boolean>;

  // Appointments
  getAppointment(id: string): Promise<Appointment | undefined>;
  getAppointmentsByLocation(locationId: string, startDate?: Date, endDate?: Date): Promise<Appointment[]>;
  getAppointmentsByCustomer(customerId: string): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: string, updates: Partial<InsertAppointment>): Promise<Appointment | undefined>;
  deleteAppointment(id: string): Promise<boolean>;

  // Appointment Services
  getAppointmentServices(appointmentId: string): Promise<AppointmentService[]>;
  createAppointmentService(service: InsertAppointmentService): Promise<AppointmentService>;
  deleteAppointmentServices(appointmentId: string): Promise<boolean>;

  // Technician Time Logs
  getTechnicianTimeLogs(userId: string, startDate?: Date, endDate?: Date): Promise<TechnicianTimeLog[]>;
  getTimeLogsByLocation(locationId: string, startDate?: Date, endDate?: Date): Promise<TechnicianTimeLog[]>;
  getTimeLogsByRepairOrder(repairOrderId: string): Promise<TechnicianTimeLog[]>;
  createTimeLog(log: InsertTechnicianTimeLog): Promise<TechnicianTimeLog>;
  updateTimeLog(id: string, updates: Partial<InsertTechnicianTimeLog>): Promise<TechnicianTimeLog | undefined>;
  getActiveTimeLog(userId: string): Promise<TechnicianTimeLog | undefined>;

  // Vendors
  getVendorsByOrg(orgId: string): Promise<Vendor[]>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  updateVendor(id: string, updates: Partial<InsertVendor>): Promise<Vendor | undefined>;
  deleteVendor(id: string): Promise<boolean>;

  // Part Orders
  getPartOrder(id: string): Promise<PartOrder | undefined>;
  getPartOrdersByLocation(locationId: string): Promise<PartOrder[]>;
  getPartOrdersByRepairOrder(repairOrderId: string): Promise<PartOrder[]>;
  createPartOrder(order: InsertPartOrder): Promise<PartOrder>;
  updatePartOrder(id: string, updates: Partial<InsertPartOrder>): Promise<PartOrder | undefined>;

  // Part Order Items
  getPartOrderItems(partOrderId: string): Promise<PartOrderItem[]>;
  createPartOrderItem(item: InsertPartOrderItem): Promise<PartOrderItem>;
  updatePartOrderItem(id: string, updates: Partial<InsertPartOrderItem>): Promise<PartOrderItem | undefined>;
  deletePartOrderItem(id: string): Promise<boolean>;

  // Invoices
  getInvoice(id: string): Promise<Invoice | undefined>;
  getInvoicesByLocation(locationId: string): Promise<Invoice[]>;
  getInvoiceByRepairOrder(repairOrderId: string): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, updates: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  getNextInvoiceNumber(locationId: string): Promise<string>;

  // Payments
  getPaymentsByInvoice(invoiceId: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
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

  async getRepairOrderById(id: string): Promise<RepairOrder | undefined> {
    const [ro] = await db.select().from(repairOrders).where(eq(repairOrders.id, id));
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
    const [item] = await db.update(inventoryItems).set({
      ...updates,
      updatedAt: new Date(),
    }).where(
      and(eq(inventoryItems.id, id), eq(inventoryItems.orgId, orgId))
    ).returning();
    return item || undefined;
  }

  async deleteInventoryItem(id: string, orgId: string): Promise<boolean> {
    const result = await db.delete(inventoryItems).where(
      and(eq(inventoryItems.id, id), eq(inventoryItems.orgId, orgId))
    ).returning();
    return result.length > 0;
  }

  async getLowStockItems(locationId: string, orgId: string): Promise<InventoryItem[]> {
    return db.select().from(inventoryItems).where(
      and(
        eq(inventoryItems.locationId, locationId),
        eq(inventoryItems.orgId, orgId),
        eq(inventoryItems.isActive, true),
        sql`${inventoryItems.quantityOnHand} <= ${inventoryItems.minQuantity}`
      )
    ).orderBy(inventoryItems.name);
  }

  // Stock Transactions
  async getStockTransactions(inventoryItemId: string): Promise<StockTransaction[]> {
    return db.select().from(stockTransactions)
      .where(eq(stockTransactions.inventoryItemId, inventoryItemId))
      .orderBy(desc(stockTransactions.createdAt));
  }

  async createStockTransaction(transaction: InsertStockTransaction): Promise<StockTransaction> {
    const [result] = await db.insert(stockTransactions).values(transaction).returning();
    return result;
  }

  async adjustInventoryQuantity(itemId: string, orgId: string, adjustment: { type: string; quantity: number; notes?: string; userId?: string }): Promise<InventoryItem | undefined> {
    const item = await this.getInventoryItem(itemId, orgId);
    if (!item) return undefined;

    const previousQuantity = item.quantityOnHand;
    let newQuantity: number;

    if (adjustment.type === 'RECEIVE' || adjustment.type === 'RETURN' || adjustment.type === 'TRANSFER_IN') {
      newQuantity = previousQuantity + adjustment.quantity;
    } else if (adjustment.type === 'SALE' || adjustment.type === 'TRANSFER_OUT') {
      newQuantity = previousQuantity - adjustment.quantity;
    } else if (adjustment.type === 'COUNT' || adjustment.type === 'ADJUST') {
      newQuantity = adjustment.quantity;
    } else {
      newQuantity = previousQuantity + adjustment.quantity;
    }

    await this.createStockTransaction({
      inventoryItemId: itemId,
      locationId: item.locationId,
      type: adjustment.type as any,
      quantity: adjustment.quantity,
      previousQuantity,
      newQuantity,
      notes: adjustment.notes,
      userId: adjustment.userId,
    });

    const [updated] = await db.update(inventoryItems).set({
      quantityOnHand: newQuantity,
      updatedAt: new Date(),
    }).where(
      and(eq(inventoryItems.id, itemId), eq(inventoryItems.orgId, orgId))
    ).returning();

    return updated || undefined;
  }

  // Inspection Templates
  async getInspectionTemplate(id: string, orgId: string): Promise<InspectionTemplate | undefined> {
    const [template] = await db.select().from(inspectionTemplates).where(
      and(eq(inspectionTemplates.id, id), eq(inspectionTemplates.orgId, orgId))
    );
    return template || undefined;
  }

  async getInspectionTemplateById(id: string): Promise<InspectionTemplate | undefined> {
    const [template] = await db.select().from(inspectionTemplates).where(eq(inspectionTemplates.id, id));
    return template || undefined;
  }

  async getInspectionTemplatesByOrg(orgId: string): Promise<InspectionTemplate[]> {
    return db.select().from(inspectionTemplates).where(eq(inspectionTemplates.orgId, orgId));
  }

  async createInspectionTemplate(insertTemplate: InsertInspectionTemplate): Promise<InspectionTemplate> {
    const [template] = await db.insert(inspectionTemplates).values(insertTemplate).returning();
    return template;
  }

  async deleteInspectionTemplate(id: string, orgId: string): Promise<boolean> {
    const result = await db.delete(inspectionTemplates).where(
      and(eq(inspectionTemplates.id, id), eq(inspectionTemplates.orgId, orgId))
    ).returning();
    return result.length > 0;
  }

  // Inspections
  async getInspection(id: string): Promise<Inspection | undefined> {
    const [inspection] = await db.select().from(inspections).where(eq(inspections.id, id));
    return inspection || undefined;
  }

  async getInspectionForOrg(id: string, orgId: string): Promise<Inspection | undefined> {
    const [result] = await db.select({ inspection: inspections })
      .from(inspections)
      .innerJoin(repairOrders, eq(inspections.roId, repairOrders.id))
      .where(and(eq(inspections.id, id), eq(repairOrders.orgId, orgId)));
    return result?.inspection || undefined;
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

  async updateInspectionForOrg(id: string, orgId: string, updates: Partial<InsertInspection>): Promise<Inspection | undefined> {
    const inspection = await this.getInspectionForOrg(id, orgId);
    if (!inspection) return undefined;
    const [updated] = await db.update(inspections).set(updates).where(eq(inspections.id, id)).returning();
    return updated || undefined;
  }

  async deleteInspection(id: string): Promise<boolean> {
    await db.delete(inspections).where(eq(inspections.id, id));
    return true;
  }

  async deleteInspectionForOrg(id: string, orgId: string): Promise<boolean> {
    const inspection = await this.getInspectionForOrg(id, orgId);
    if (!inspection) return false;
    await db.delete(inspections).where(eq(inspections.id, id));
    return true;
  }

  async getInspectionByShareToken(token: string): Promise<Inspection | undefined> {
    const [inspection] = await db.select().from(inspections).where(eq(inspections.shareToken, token));
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

  // ==========================================
  // PHASE 2: OPERATIONAL WORKFLOWS
  // ==========================================

  // Service Bays
  async getServiceBaysByLocation(locationId: string): Promise<ServiceBay[]> {
    return db.select().from(serviceBays).where(eq(serviceBays.locationId, locationId)).orderBy(serviceBays.sortOrder);
  }

  async createServiceBay(bay: InsertServiceBay): Promise<ServiceBay> {
    const [created] = await db.insert(serviceBays).values(bay).returning();
    return created;
  }

  async updateServiceBay(id: string, updates: Partial<InsertServiceBay>): Promise<ServiceBay | undefined> {
    const [updated] = await db.update(serviceBays).set(updates).where(eq(serviceBays.id, id)).returning();
    return updated || undefined;
  }

  async deleteServiceBay(id: string): Promise<boolean> {
    await db.delete(serviceBays).where(eq(serviceBays.id, id));
    return true;
  }

  // Appointments
  async getAppointment(id: string): Promise<Appointment | undefined> {
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
    return appointment || undefined;
  }

  async getAppointmentsByLocation(locationId: string, startDate?: Date, endDate?: Date): Promise<Appointment[]> {
    if (startDate && endDate) {
      return db.select().from(appointments)
        .where(and(
          eq(appointments.locationId, locationId),
          sql`${appointments.startTime} >= ${startDate}`,
          sql`${appointments.startTime} <= ${endDate}`
        ))
        .orderBy(appointments.startTime);
    }
    return db.select().from(appointments)
      .where(eq(appointments.locationId, locationId))
      .orderBy(appointments.startTime);
  }

  async getAppointmentsByCustomer(customerId: string): Promise<Appointment[]> {
    return db.select().from(appointments)
      .where(eq(appointments.customerId, customerId))
      .orderBy(desc(appointments.startTime));
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const [created] = await db.insert(appointments).values(appointment).returning();
    return created;
  }

  async updateAppointment(id: string, updates: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    const [updated] = await db.update(appointments).set(updates).where(eq(appointments.id, id)).returning();
    return updated || undefined;
  }

  async deleteAppointment(id: string): Promise<boolean> {
    await db.delete(appointmentServices).where(eq(appointmentServices.appointmentId, id));
    await db.delete(appointments).where(eq(appointments.id, id));
    return true;
  }

  // Appointment Services
  async getAppointmentServices(appointmentId: string): Promise<AppointmentService[]> {
    return db.select().from(appointmentServices).where(eq(appointmentServices.appointmentId, appointmentId));
  }

  async createAppointmentService(service: InsertAppointmentService): Promise<AppointmentService> {
    const [created] = await db.insert(appointmentServices).values(service).returning();
    return created;
  }

  async deleteAppointmentServices(appointmentId: string): Promise<boolean> {
    await db.delete(appointmentServices).where(eq(appointmentServices.appointmentId, appointmentId));
    return true;
  }

  // Technician Time Logs
  async getTechnicianTimeLogs(userId: string, startDate?: Date, endDate?: Date): Promise<TechnicianTimeLog[]> {
    if (startDate && endDate) {
      return db.select().from(technicianTimeLogs)
        .where(and(
          eq(technicianTimeLogs.userId, userId),
          sql`${technicianTimeLogs.clockIn} >= ${startDate}`,
          sql`${technicianTimeLogs.clockIn} <= ${endDate}`
        ))
        .orderBy(desc(technicianTimeLogs.clockIn));
    }
    return db.select().from(technicianTimeLogs)
      .where(eq(technicianTimeLogs.userId, userId))
      .orderBy(desc(technicianTimeLogs.clockIn));
  }

  async getTimeLogsByLocation(locationId: string, startDate?: Date, endDate?: Date): Promise<TechnicianTimeLog[]> {
    if (startDate && endDate) {
      return db.select().from(technicianTimeLogs)
        .where(and(
          eq(technicianTimeLogs.locationId, locationId),
          sql`${technicianTimeLogs.clockIn} >= ${startDate}`,
          sql`${technicianTimeLogs.clockIn} <= ${endDate}`
        ))
        .orderBy(desc(technicianTimeLogs.clockIn));
    }
    return db.select().from(technicianTimeLogs)
      .where(eq(technicianTimeLogs.locationId, locationId))
      .orderBy(desc(technicianTimeLogs.clockIn));
  }

  async getTimeLogsByRepairOrder(repairOrderId: string): Promise<TechnicianTimeLog[]> {
    return db.select().from(technicianTimeLogs)
      .where(eq(technicianTimeLogs.repairOrderId, repairOrderId))
      .orderBy(technicianTimeLogs.clockIn);
  }

  async createTimeLog(log: InsertTechnicianTimeLog): Promise<TechnicianTimeLog> {
    const [created] = await db.insert(technicianTimeLogs).values(log).returning();
    return created;
  }

  async updateTimeLog(id: string, updates: Partial<InsertTechnicianTimeLog>): Promise<TechnicianTimeLog | undefined> {
    const [updated] = await db.update(technicianTimeLogs).set(updates).where(eq(technicianTimeLogs.id, id)).returning();
    return updated || undefined;
  }

  async getActiveTimeLog(userId: string): Promise<TechnicianTimeLog | undefined> {
    const [log] = await db.select().from(technicianTimeLogs)
      .where(and(
        eq(technicianTimeLogs.userId, userId),
        sql`${technicianTimeLogs.clockOut} IS NULL`
      ))
      .orderBy(desc(technicianTimeLogs.clockIn))
      .limit(1);
    return log || undefined;
  }

  // Vendors
  async getVendorsByOrg(orgId: string): Promise<Vendor[]> {
    return db.select().from(vendors).where(eq(vendors.orgId, orgId)).orderBy(vendors.name);
  }

  async createVendor(vendor: InsertVendor): Promise<Vendor> {
    const [created] = await db.insert(vendors).values(vendor).returning();
    return created;
  }

  async updateVendor(id: string, updates: Partial<InsertVendor>): Promise<Vendor | undefined> {
    const [updated] = await db.update(vendors).set(updates).where(eq(vendors.id, id)).returning();
    return updated || undefined;
  }

  async deleteVendor(id: string): Promise<boolean> {
    await db.delete(vendors).where(eq(vendors.id, id));
    return true;
  }

  // Part Orders
  async getPartOrder(id: string): Promise<PartOrder | undefined> {
    const [order] = await db.select().from(partOrders).where(eq(partOrders.id, id));
    return order || undefined;
  }

  async getPartOrdersByLocation(locationId: string): Promise<PartOrder[]> {
    return db.select().from(partOrders)
      .where(eq(partOrders.locationId, locationId))
      .orderBy(desc(partOrders.createdAt));
  }

  async getPartOrdersByRepairOrder(repairOrderId: string): Promise<PartOrder[]> {
    const items = await db.select().from(partOrderItems)
      .where(eq(partOrderItems.repairOrderId, repairOrderId));
    if (items.length === 0) return [];
    const orderIds = [...new Set(items.map(i => i.partOrderId))];
    return db.select().from(partOrders).where(inArray(partOrders.id, orderIds));
  }

  async createPartOrder(order: InsertPartOrder): Promise<PartOrder> {
    const [created] = await db.insert(partOrders).values(order).returning();
    return created;
  }

  async updatePartOrder(id: string, updates: Partial<InsertPartOrder>): Promise<PartOrder | undefined> {
    const [updated] = await db.update(partOrders).set(updates).where(eq(partOrders.id, id)).returning();
    return updated || undefined;
  }

  // Part Order Items
  async getPartOrderItems(partOrderId: string): Promise<PartOrderItem[]> {
    return db.select().from(partOrderItems).where(eq(partOrderItems.partOrderId, partOrderId));
  }

  async createPartOrderItem(item: InsertPartOrderItem): Promise<PartOrderItem> {
    const [created] = await db.insert(partOrderItems).values(item).returning();
    return created;
  }

  async updatePartOrderItem(id: string, updates: Partial<InsertPartOrderItem>): Promise<PartOrderItem | undefined> {
    const [updated] = await db.update(partOrderItems).set(updates).where(eq(partOrderItems.id, id)).returning();
    return updated || undefined;
  }

  async deletePartOrderItem(id: string): Promise<boolean> {
    await db.delete(partOrderItems).where(eq(partOrderItems.id, id));
    return true;
  }

  // Invoices
  async getInvoice(id: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice || undefined;
  }

  async getInvoicesByLocation(locationId: string): Promise<Invoice[]> {
    return db.select().from(invoices)
      .where(eq(invoices.locationId, locationId))
      .orderBy(desc(invoices.createdAt));
  }

  async getInvoiceByRepairOrder(repairOrderId: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices)
      .where(eq(invoices.repairOrderId, repairOrderId));
    return invoice || undefined;
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [created] = await db.insert(invoices).values(invoice).returning();
    return created;
  }

  async updateInvoice(id: string, updates: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const [updated] = await db.update(invoices).set(updates).where(eq(invoices.id, id)).returning();
    return updated || undefined;
  }

  async getNextInvoiceNumber(locationId: string): Promise<string> {
    const settings = await this.getInvoiceSettingsByLocation(locationId);
    const nextNumber = settings?.nextInvoiceNumber || 1;
    const prefix = settings?.invoicePrefix || 'INV';
    if (settings) {
      await db.update(invoiceSettings)
        .set({ nextInvoiceNumber: nextNumber + 1 })
        .where(eq(invoiceSettings.locationId, locationId));
    }
    return `${prefix}-${String(nextNumber).padStart(6, '0')}`;
  }

  // Payments
  async getPaymentsByInvoice(invoiceId: string): Promise<Payment[]> {
    return db.select().from(payments)
      .where(eq(payments.invoiceId, invoiceId))
      .orderBy(payments.processedAt);
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [created] = await db.insert(payments).values(payment).returning();
    const invoice = await this.getInvoice(payment.invoiceId);
    if (invoice) {
      const allPayments = await this.getPaymentsByInvoice(payment.invoiceId);
      const totalPaid = allPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const amountDue = parseFloat(invoice.total) - totalPaid;
      await this.updateInvoice(invoice.id, {
        amountPaid: String(totalPaid),
        amountDue: String(Math.max(0, amountDue)),
        status: amountDue <= 0 ? 'PAID' : totalPaid > 0 ? 'PARTIAL' : invoice.status,
        paidAt: amountDue <= 0 ? new Date() : undefined,
      });
    }
    return created;
  }
}

export const storage = new DatabaseStorage();

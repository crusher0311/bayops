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
}

export const storage = new DatabaseStorage();

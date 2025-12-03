import { sql, relations } from "drizzle-orm";
import { 
  pgTable, 
  text, 
  varchar, 
  integer, 
  boolean, 
  timestamp, 
  decimal,
  jsonb,
  serial,
  pgEnum
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const roleEnum = pgEnum('role', ['OWNER', 'MANAGER', 'ADVISOR', 'TECHNICIAN']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['ACTIVE', 'PAST_DUE', 'CANCELED']);
export const subscriptionPlanEnum = pgEnum('subscription_plan', ['STARTER', 'GROWTH', 'ENTERPRISE']);
export const lineItemTypeEnum = pgEnum('line_item_type', ['LABOR', 'PART', 'TIRE', 'FEE']);
export const inventoryTypeEnum = pgEnum('inventory_type', ['TIRE', 'PART', 'OTHER']);
export const tireCategoryEnum = pgEnum('tire_category', ['ALL_SEASON', 'WINTER', 'PERFORMANCE', 'LT', 'AT']);
export const inspectionStatusEnum = pgEnum('inspection_status', ['GREEN', 'YELLOW', 'RED']);
export const workflowStageTypeEnum = pgEnum('workflow_stage_type', ['SYSTEM', 'CUSTOM']);

// Organizations
export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  subscriptionStatus: subscriptionStatusEnum("subscription_status").notNull().default('ACTIVE'),
  subscriptionPlan: subscriptionPlanEnum("subscription_plan").notNull().default('STARTER'),
  billingEmail: text("billing_email").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const organizationsRelations = relations(organizations, ({ many }) => ({
  locations: many(locations),
  users: many(users),
  customers: many(customers),
  workflows: many(workflows),
}));

// Locations
export const locations = pgTable("locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zip: text("zip").notNull(),
  phone: text("phone").notNull(),
  taxRate: decimal("tax_rate", { precision: 5, scale: 4 }).notNull().default('0.0'),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const locationsRelations = relations(locations, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [locations.orgId],
    references: [organizations.id],
  }),
  repairOrders: many(repairOrders),
  inventoryItems: many(inventoryItems),
}));

// Users
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: roleEnum("role").notNull(),
  locationIds: text("location_ids").array().notNull().default(sql`ARRAY[]::text[]`),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.orgId],
    references: [organizations.id],
  }),
  assignedRepairOrders: many(repairOrders, { relationName: 'advisor' }),
  techRepairOrders: many(repairOrders, { relationName: 'technician' }),
}));

// Customers
export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  marketingConsent: boolean("marketing_consent").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const customersRelations = relations(customers, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [customers.orgId],
    references: [organizations.id],
  }),
  vehicles: many(vehicles),
}));

// Vehicles
export const vehicles = pgTable("vehicles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customers.id, { onDelete: 'cascade' }),
  vin: text("vin").notNull(),
  year: integer("year").notNull(),
  make: text("make").notNull(),
  model: text("model").notNull(),
  trim: text("trim"),
  licensePlate: text("license_plate").notNull(),
  mileage: integer("mileage").notNull(),
  color: text("color"),
  bodyClass: text("body_class"),
  engineCylinders: text("engine_cylinders"),
  engineDisplacement: text("engine_displacement"),
  fuelType: text("fuel_type"),
  driveType: text("drive_type"),
  transmission: text("transmission"),
  doors: integer("doors"),
  tireSizeFront: text("tire_size_front"),
  tireSizeRear: text("tire_size_rear"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  customer: one(customers, {
    fields: [vehicles.customerId],
    references: [customers.id],
  }),
  repairOrders: many(repairOrders),
}));

// Workflows
export const workflows = pgTable("workflows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  description: text("description"),
  isDefault: boolean("is_default").notNull().default(false),
  stages: jsonb("stages").notNull().$type<Array<{
    id: string;
    label: string;
    color: string;
    type: 'SYSTEM' | 'CUSTOM';
    order: number;
    isEnabled?: boolean;
  }>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const workflowsRelations = relations(workflows, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [workflows.orgId],
    references: [organizations.id],
  }),
  repairOrders: many(repairOrders),
}));

// Repair Orders
export const repairOrders = pgTable("repair_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  locationId: varchar("location_id").notNull().references(() => locations.id, { onDelete: 'cascade' }),
  roNumber: serial("ro_number"),
  customerId: varchar("customer_id").notNull().references(() => customers.id, { onDelete: 'cascade' }),
  vehicleId: varchar("vehicle_id").notNull().references(() => vehicles.id, { onDelete: 'cascade' }),
  advisorId: varchar("advisor_id").notNull().references(() => users.id),
  technicianId: varchar("technician_id").references(() => users.id),
  workflowId: varchar("workflow_id").notNull().references(() => workflows.id),
  status: text("status").notNull(),
  jobs: jsonb("jobs").notNull().$type<Array<{
    id: string;
    name: string;
    description?: string;
    lineItems: Array<{
      id: string;
      type: 'LABOR' | 'PART' | 'TIRE' | 'FEE';
      description: string;
      quantity: number;
      unitCost: number;
      unitPrice: number;
      inventoryItemId?: string;
      technicianId?: string;
      approved: boolean;
    }>;
  }>>(),
  notes: text("notes").notNull().default(''),
  odometerIn: integer("odometer_in").notNull(),
  promisedAt: timestamp("promised_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const repairOrdersRelations = relations(repairOrders, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [repairOrders.orgId],
    references: [organizations.id],
  }),
  location: one(locations, {
    fields: [repairOrders.locationId],
    references: [locations.id],
  }),
  customer: one(customers, {
    fields: [repairOrders.customerId],
    references: [customers.id],
  }),
  vehicle: one(vehicles, {
    fields: [repairOrders.vehicleId],
    references: [vehicles.id],
  }),
  advisor: one(users, {
    fields: [repairOrders.advisorId],
    references: [users.id],
    relationName: 'advisor',
  }),
  technician: one(users, {
    fields: [repairOrders.technicianId],
    references: [users.id],
    relationName: 'technician',
  }),
  workflow: one(workflows, {
    fields: [repairOrders.workflowId],
    references: [workflows.id],
  }),
  inspections: many(inspections),
}));

// Inventory Items
export const inventoryItems = pgTable("inventory_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  locationId: varchar("location_id").notNull().references(() => locations.id, { onDelete: 'cascade' }),
  type: inventoryTypeEnum("type").notNull(),
  sku: text("sku").notNull(),
  brand: text("brand").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  tireSize: text("tire_size"),
  speedRating: text("speed_rating"),
  loadIndex: text("load_index"),
  category: tireCategoryEnum("category"),
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  quantityOnHand: integer("quantity_on_hand").notNull().default(0),
  binLocation: text("bin_location"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const inventoryItemsRelations = relations(inventoryItems, ({ one }) => ({
  organization: one(organizations, {
    fields: [inventoryItems.orgId],
    references: [organizations.id],
  }),
  location: one(locations, {
    fields: [inventoryItems.locationId],
    references: [locations.id],
  }),
}));

// Inspection Templates
export const inspectionTemplates = pgTable("inspection_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  items: jsonb("items").notNull().$type<Array<{
    id: string;
    label: string;
    category: string;
  }>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const inspectionTemplatesRelations = relations(inspectionTemplates, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [inspectionTemplates.orgId],
    references: [organizations.id],
  }),
  inspections: many(inspections),
}));

// Inspections
export const inspections = pgTable("inspections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roId: varchar("ro_id").notNull().references(() => repairOrders.id, { onDelete: 'cascade' }),
  templateId: varchar("template_id").notNull().references(() => inspectionTemplates.id),
  technicianId: varchar("technician_id").notNull().references(() => users.id),
  items: jsonb("items").notNull().$type<Array<{
    itemId: string;
    status: 'GREEN' | 'YELLOW' | 'RED';
    notes?: string;
    imageUrl?: string;
  }>>(),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const inspectionsRelations = relations(inspections, ({ one }) => ({
  repairOrder: one(repairOrders, {
    fields: [inspections.roId],
    references: [repairOrders.id],
  }),
  template: one(inspectionTemplates, {
    fields: [inspections.templateId],
    references: [inspectionTemplates.id],
  }),
  technician: one(users, {
    fields: [inspections.technicianId],
    references: [users.id],
  }),
}));

// Audit Logs
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  details: text("details").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  organization: one(organizations, {
    fields: [auditLogs.orgId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// Insert Schemas
export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
});

export const insertLocationSchema = createInsertSchema(locations).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
});

export const insertVehicleSchema = createInsertSchema(vehicles).omit({
  id: true,
  createdAt: true,
});

export const insertWorkflowSchema = createInsertSchema(workflows).omit({
  id: true,
  createdAt: true,
});

export const insertRepairOrderSchema = createInsertSchema(repairOrders).omit({
  id: true,
  roNumber: true,
  createdAt: true,
});

export const insertInventoryItemSchema = createInsertSchema(inventoryItems).omit({
  id: true,
  createdAt: true,
});

export const insertInspectionTemplateSchema = createInsertSchema(inspectionTemplates).omit({
  id: true,
  createdAt: true,
});

export const insertInspectionSchema = createInsertSchema(inspections).omit({
  id: true,
  startedAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});

// Types
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;

export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export type Vehicle = typeof vehicles.$inferSelect;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;

export type Workflow = typeof workflows.$inferSelect;
export type InsertWorkflow = z.infer<typeof insertWorkflowSchema>;

export type RepairOrder = typeof repairOrders.$inferSelect;
export type InsertRepairOrder = z.infer<typeof insertRepairOrderSchema>;

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;

export type InspectionTemplate = typeof inspectionTemplates.$inferSelect;
export type InsertInspectionTemplate = z.infer<typeof insertInspectionTemplateSchema>;

export type Inspection = typeof inspections.$inferSelect;
export type InsertInspection = z.infer<typeof insertInspectionSchema>;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

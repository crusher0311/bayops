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
  pgEnum,
  real
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const roleEnum = pgEnum('role', ['OWNER', 'MANAGER', 'ADVISOR', 'TECHNICIAN']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['ACTIVE', 'PAST_DUE', 'CANCELED']);
export const subscriptionPlanEnum = pgEnum('subscription_plan', ['STARTER', 'GROWTH', 'ENTERPRISE']);
export const lineItemTypeEnum = pgEnum('line_item_type', ['LABOR', 'PART', 'TIRE', 'FEE', 'SUBLET']);
export const inventoryTypeEnum = pgEnum('inventory_type', ['TIRE', 'PART', 'OTHER']);
export const tireCategoryEnum = pgEnum('tire_category', ['ALL_SEASON', 'WINTER', 'PERFORMANCE', 'LT', 'AT']);
export const inspectionStatusEnum = pgEnum('inspection_status', ['GREEN', 'YELLOW', 'RED']);
export const workflowStageTypeEnum = pgEnum('workflow_stage_type', ['SYSTEM', 'CUSTOM']);
export const feeMethodEnum = pgEnum('fee_method', ['PERCENTAGE', 'FIXED']);
export const feeCalculateOnEnum = pgEnum('fee_calculate_on', ['LABOR', 'PARTS', 'LABOR_PARTS', 'SUBTOTAL']);
export const discountMethodEnum = pgEnum('discount_method', ['PERCENTAGE', 'FIXED']);

// Wholesale/B2B Enums
export const locationTypeEnum = pgEnum('location_type', ['RETAIL', 'WHOLESALE', 'DISTRIBUTION']);
export const customerAccountTypeEnum = pgEnum('customer_account_type', ['RETAIL', 'WHOLESALE', 'DEALER', 'FLEET']);
export const paymentTermsEnum = pgEnum('payment_terms', ['DUE_ON_RECEIPT', 'NET_15', 'NET_30', 'NET_45', 'NET_60', 'NET_90']);

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

// Locations (Shop Profile)
export const locations = pgTable("locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  locationType: locationTypeEnum("location_type").notNull().default('RETAIL'),
  parentLocationId: varchar("parent_location_id"),
  address: text("address").notNull(),
  addressLine2: text("address_line_2"),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zip: text("zip").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  website: text("website"),
  licenseNumber: text("license_number"),
  taxId: text("tax_id"),
  logoUrl: text("logo_url"),
  hoursOfOperation: text("hours_of_operation"),
  taxRate: decimal("tax_rate", { precision: 5, scale: 4 }).notNull().default('0.0'),
  isActive: boolean("is_active").notNull().default(true),
  checkInToken: varchar("check_in_token").default(sql`gen_random_uuid()`),
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
  homeLocationId: varchar("home_location_id").references(() => locations.id, { onDelete: 'set null' }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  marketingConsent: boolean("marketing_consent").notNull().default(false),
  accountType: customerAccountTypeEnum("account_type").notNull().default('RETAIL'),
  companyName: text("company_name"),
  taxExempt: boolean("tax_exempt").notNull().default(false),
  resaleCertNumber: text("resale_cert_number"),
  paymentTerms: paymentTermsEnum("payment_terms").notNull().default('DUE_ON_RECEIPT'),
  creditLimit: decimal("credit_limit", { precision: 10, scale: 2 }),
  currentBalance: decimal("current_balance", { precision: 10, scale: 2 }).notNull().default('0.00'),
  pricingTierId: varchar("pricing_tier_id"),
  accountNumber: text("account_number"),
  notes: text("notes"),
  legacySystem: text("legacy_system"),
  legacyId: text("legacy_id"),
  protractorId: varchar("protractor_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const customersRelations = relations(customers, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [customers.orgId],
    references: [organizations.id],
  }),
  homeLocation: one(locations, {
    fields: [customers.homeLocationId],
    references: [locations.id],
  }),
  vehicles: many(vehicles),
}));

// Vehicles
export const vehicles = pgTable("vehicles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").references(() => organizations.id, { onDelete: 'cascade' }),
  homeLocationId: varchar("home_location_id").references(() => locations.id, { onDelete: 'set null' }),
  customerId: varchar("customer_id").notNull().references(() => customers.id, { onDelete: 'cascade' }),
  vin: text("vin").notNull(),
  year: integer("year").notNull(),
  make: text("make").notNull(),
  model: text("model").notNull(),
  trim: text("trim"),
  licensePlate: text("license_plate").notNull(),
  mileage: integer("mileage"),
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
  legacySystem: text("legacy_system"),
  legacyId: text("legacy_id"),
  protractorId: varchar("protractor_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [vehicles.orgId],
    references: [organizations.id],
  }),
  homeLocation: one(locations, {
    fields: [vehicles.homeLocationId],
    references: [locations.id],
  }),
  customer: one(customers, {
    fields: [vehicles.customerId],
    references: [customers.id],
  }),
  repairOrders: many(repairOrders),
  deferredWork: many(deferredWork),
}));

// Deferred Work Status Enum
export const deferredWorkStatusEnum = pgEnum('deferred_work_status', ['PENDING', 'CONTACTED', 'SCHEDULED', 'CONVERTED', 'DISMISSED']);

// Deferred Work (Declined Recommendations)
export const deferredWork = pgTable("deferred_work", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  locationId: varchar("location_id").references(() => locations.id, { onDelete: 'cascade' }),
  vehicleId: varchar("vehicle_id").notNull().references(() => vehicles.id, { onDelete: 'cascade' }),
  customerId: varchar("customer_id").notNull().references(() => customers.id, { onDelete: 'cascade' }),
  originalRoId: varchar("original_ro_id").references(() => repairOrders.id, { onDelete: 'set null' }),
  serviceName: text("service_name").notNull(),
  serviceDescription: text("service_description"),
  estimatedPrice: decimal("estimated_price", { precision: 10, scale: 2 }),
  laborHours: decimal("labor_hours", { precision: 5, scale: 2 }),
  priority: text("priority").default('NORMAL'),
  reason: text("reason"),
  notes: text("notes"),
  status: deferredWorkStatusEnum("status").notNull().default('PENDING'),
  followUpDate: timestamp("follow_up_date"),
  contactedAt: timestamp("contacted_at"),
  convertedRoId: varchar("converted_ro_id"),
  legacySystem: text("legacy_system"),
  legacyId: text("legacy_id"),
  protractorId: varchar("protractor_id"),
  protractorInvoiceId: varchar("protractor_invoice_id"),
  declinedAt: timestamp("declined_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const deferredWorkRelations = relations(deferredWork, ({ one }) => ({
  organization: one(organizations, {
    fields: [deferredWork.orgId],
    references: [organizations.id],
  }),
  location: one(locations, {
    fields: [deferredWork.locationId],
    references: [locations.id],
  }),
  vehicle: one(vehicles, {
    fields: [deferredWork.vehicleId],
    references: [vehicles.id],
  }),
  customer: one(customers, {
    fields: [deferredWork.customerId],
    references: [customers.id],
  }),
  originalRepairOrder: one(repairOrders, {
    fields: [deferredWork.originalRoId],
    references: [repairOrders.id],
  }),
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
      manufacturer?: string;
      supplier?: string;
      partNumber?: string;
    }>;
  }>>(),
  notes: text("notes").notNull().default(''),
  odometerIn: integer("odometer_in").notNull(),
  promisedAt: timestamp("promised_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  authorizationToken: varchar("authorization_token"),
  authorizationStatus: text("authorization_status").notNull().default('PENDING'),
  authorizedAt: timestamp("authorized_at"),
  customerSignature: text("customer_signature"),
  authorizationSentAt: timestamp("authorization_sent_at"),
  authorizationSentVia: text("authorization_sent_via"),
  legacySystem: text("legacy_system"),
  legacyId: text("legacy_id"),
  legacyInvoiceNumber: integer("legacy_invoice_number"),
  protractorId: varchar("protractor_id"),
  protractorInvoiceNumber: integer("protractor_invoice_number"),
  totalLabor: real("total_labor"),
  totalParts: real("total_parts"),
  totalSublet: real("total_sublet"),
  totalTax: real("total_tax"),
  grandTotal: real("grand_total"),
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
  roJobs: many(roJobs),
}));

// RO Jobs (Normalized replacement for jobs JSONB)
export const roJobs = pgTable("ro_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  locationId: varchar("location_id").notNull().references(() => locations.id, { onDelete: 'cascade' }),
  repairOrderId: varchar("repair_order_id").notNull().references(() => repairOrders.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  description: text("description"),
  chapter: text("chapter"),
  code: text("code"),
  title: text("title"),
  sortOrder: integer("sort_order").notNull().default(0),
  laborHours: decimal("labor_hours", { precision: 5, scale: 2 }),
  approved: boolean("approved").notNull().default(false),
  isDeferred: boolean("is_deferred").notNull().default(false),
  legacySystem: text("legacy_system"),
  legacyId: text("legacy_id"),
  inspectionId: varchar("inspection_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const roJobsRelations = relations(roJobs, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [roJobs.orgId],
    references: [organizations.id],
  }),
  location: one(locations, {
    fields: [roJobs.locationId],
    references: [locations.id],
  }),
  repairOrder: one(repairOrders, {
    fields: [roJobs.repairOrderId],
    references: [repairOrders.id],
  }),
  lineItems: many(roJobLines),
}));

// RO Job Lines (Normalized replacement for lineItems in jobs JSONB)
export const roJobLines = pgTable("ro_job_lines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => roJobs.id, { onDelete: 'cascade' }),
  type: lineItemTypeEnum("type").notNull(),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull().default('1'),
  unitCost: decimal("unit_cost", { precision: 10, scale: 2 }).notNull().default('0'),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull().default('0'),
  approved: boolean("approved").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  inventoryItemId: varchar("inventory_item_id"),
  technicianId: varchar("technician_id").references(() => users.id, { onDelete: 'set null' }),
  manufacturer: text("manufacturer"),
  supplier: text("supplier"),
  partNumber: text("part_number"),
  legacySystem: text("legacy_system"),
  legacyId: text("legacy_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const roJobLinesRelations = relations(roJobLines, ({ one }) => ({
  job: one(roJobs, {
    fields: [roJobLines.jobId],
    references: [roJobs.id],
  }),
  technician: one(users, {
    fields: [roJobLines.technicianId],
    references: [users.id],
  }),
}));

// Insert schemas for new normalized tables
export const insertRoJobSchema = createInsertSchema(roJobs).omit({
  id: true,
  createdAt: true,
});

export const insertRoJobLineSchema = createInsertSchema(roJobLines).omit({
  id: true,
  createdAt: true,
});

export type InsertRoJob = z.infer<typeof insertRoJobSchema>;
export type RoJob = typeof roJobs.$inferSelect;
export type InsertRoJobLine = z.infer<typeof insertRoJobLineSchema>;
export type RoJobLine = typeof roJobLines.$inferSelect;

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
  minQuantity: integer("min_quantity").notNull().default(0),
  maxQuantity: integer("max_quantity"),
  binLocation: text("bin_location"),
  vendorPartNumber: text("vendor_part_number"),
  upc: text("upc"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const inventoryItemsRelations = relations(inventoryItems, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [inventoryItems.orgId],
    references: [organizations.id],
  }),
  location: one(locations, {
    fields: [inventoryItems.locationId],
    references: [locations.id],
  }),
  transactions: many(stockTransactions),
}));

// Stock Transaction Types
export const stockTransactionTypeEnum = pgEnum('stock_transaction_type', [
  'RECEIVE',
  'ADJUST',
  'SALE',
  'RETURN',
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'COUNT'
]);

// Stock Transactions - Audit trail for inventory movements
export const stockTransactions = pgTable("stock_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  inventoryItemId: varchar("inventory_item_id").notNull().references(() => inventoryItems.id, { onDelete: 'cascade' }),
  locationId: varchar("location_id").notNull().references(() => locations.id, { onDelete: 'cascade' }),
  type: stockTransactionTypeEnum("type").notNull(),
  quantity: integer("quantity").notNull(),
  previousQuantity: integer("previous_quantity").notNull(),
  newQuantity: integer("new_quantity").notNull(),
  unitCost: decimal("unit_cost", { precision: 10, scale: 2 }),
  referenceType: text("reference_type"),
  referenceId: text("reference_id"),
  notes: text("notes"),
  userId: varchar("user_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const stockTransactionsRelations = relations(stockTransactions, ({ one }) => ({
  inventoryItem: one(inventoryItems, {
    fields: [stockTransactions.inventoryItemId],
    references: [inventoryItems.id],
  }),
  location: one(locations, {
    fields: [stockTransactions.locationId],
    references: [locations.id],
  }),
  user: one(users, {
    fields: [stockTransactions.userId],
    references: [users.id],
  }),
}));

// Inspection Template Item Type
export interface InspectionTemplateItem {
  id: string;
  label: string;
  category: string;
  sortOrder: number;
}

// Inspection Result Item Type  
export interface InspectionResultItem {
  itemId: string;
  status: 'GREEN' | 'YELLOW' | 'RED' | null;
  finding?: string;
  recommendation?: string;
  photos?: string[];
}

// Inspection Templates
export const inspectionTemplates = pgTable("inspection_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  description: text("description"),
  items: jsonb("items").notNull().$type<InspectionTemplateItem[]>(),
  isActive: boolean("is_active").notNull().default(true),
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
  vehicleId: varchar("vehicle_id").references(() => vehicles.id),
  items: jsonb("items").notNull().$type<InspectionResultItem[]>(),
  notes: text("notes"),
  customerViewable: boolean("customer_viewable").notNull().default(false),
  shareToken: varchar("share_token"),
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

// ==========================================
// PHASE 1: CONFIGURATION TABLES
// ==========================================

// Labor Rates (multiple tiers per location)
export const laborRates = pgTable("labor_rates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locationId: varchar("location_id").notNull().references(() => locations.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  rate: decimal("rate", { precision: 10, scale: 2 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const laborRatesRelations = relations(laborRates, ({ one }) => ({
  location: one(locations, {
    fields: [laborRates.locationId],
    references: [locations.id],
  }),
}));

// Shop Fees (auto-apply fees)
export const shopFees = pgTable("shop_fees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locationId: varchar("location_id").notNull().references(() => locations.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  method: feeMethodEnum("method").notNull(),
  calculateOn: feeCalculateOnEnum("calculate_on").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  cap: decimal("cap", { precision: 10, scale: 2 }),
  isTaxable: boolean("is_taxable").notNull().default(false),
  autoApply: boolean("auto_apply").notNull().default(true),
  applyTo: text("apply_to").notNull().default('RO'),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const shopFeesRelations = relations(shopFees, ({ one }) => ({
  location: one(locations, {
    fields: [shopFees.locationId],
    references: [locations.id],
  }),
}));

// Discounts
export const discounts = pgTable("discounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locationId: varchar("location_id").notNull().references(() => locations.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  method: discountMethodEnum("method").notNull(),
  calculateOn: feeCalculateOnEnum("calculate_on").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  cap: decimal("cap", { precision: 10, scale: 2 }),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const discountsRelations = relations(discounts, ({ one }) => ({
  location: one(locations, {
    fields: [discounts.locationId],
    references: [locations.id],
  }),
}));

// Tax Settings
export const taxSettings = pgTable("tax_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locationId: varchar("location_id").notNull().references(() => locations.id, { onDelete: 'cascade' }).unique(),
  salesTaxRate: decimal("sales_tax_rate", { precision: 5, scale: 4 }).notNull().default('0.0'),
  taxOnLabor: boolean("tax_on_labor").notNull().default(false),
  taxOnParts: boolean("tax_on_parts").notNull().default(true),
  taxOnFees: boolean("tax_on_fees").notNull().default(false),
  salesTaxCap: decimal("sales_tax_cap", { precision: 10, scale: 2 }),
  tireTaxEnabled: boolean("tire_tax_enabled").notNull().default(false),
  tireTaxRate: decimal("tire_tax_rate", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const taxSettingsRelations = relations(taxSettings, ({ one }) => ({
  location: one(locations, {
    fields: [taxSettings.locationId],
    references: [locations.id],
  }),
}));

// Job Categories
export const jobCategories = pgTable("job_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locationId: varchar("location_id").notNull().references(() => locations.id, { onDelete: 'cascade' }),
  code: text("code").notNull(),
  description: text("description").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const jobCategoriesRelations = relations(jobCategories, ({ one }) => ({
  location: one(locations, {
    fields: [jobCategories.locationId],
    references: [locations.id],
  }),
}));

// Payment Types
export const paymentTypes = pgTable("payment_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locationId: varchar("location_id").notNull().references(() => locations.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const paymentTypesRelations = relations(paymentTypes, ({ one }) => ({
  location: one(locations, {
    fields: [paymentTypes.locationId],
    references: [locations.id],
  }),
}));

// Invoice Settings
export const invoiceSettings = pgTable("invoice_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locationId: varchar("location_id").notNull().references(() => locations.id, { onDelete: 'cascade' }).unique(),
  nextInvoiceNumber: integer("next_invoice_number").notNull().default(1),
  gpHrMinThreshold: decimal("gp_hr_min_threshold", { precision: 10, scale: 2 }),
  gpHrMaxThreshold: decimal("gp_hr_max_threshold", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const invoiceSettingsRelations = relations(invoiceSettings, ({ one }) => ({
  location: one(locations, {
    fields: [invoiceSettings.locationId],
    references: [locations.id],
  }),
}));

// RO Settings (Advanced Settings - required fields, tech hours display, etc.)
export const roSettings = pgTable("ro_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locationId: varchar("location_id").notNull().references(() => locations.id, { onDelete: 'cascade' }).unique(),
  requireOdometerInOut: boolean("require_odometer_in_out").notNull().default(false),
  requireMarketingSource: boolean("require_marketing_source").notNull().default(false),
  requireTechOnLabor: boolean("require_tech_on_labor").notNull().default(false),
  requireJobCategory: boolean("require_job_category").notNull().default(false),
  requirePurchaseOrders: boolean("require_purchase_orders").notNull().default(false),
  requireBillingForParts: boolean("require_billing_for_parts").notNull().default(false),
  requirePaymentCardType: boolean("require_payment_card_type").notNull().default(false),
  requireDotCodesForTires: boolean("require_dot_codes_for_tires").notNull().default(false),
  requireDigitalSignature: boolean("require_digital_signature").notNull().default(false),
  techHoursDisplayOn: text("tech_hours_display_on").notNull().default('RO_POSTED'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const roSettingsRelations = relations(roSettings, ({ one }) => ({
  location: one(locations, {
    fields: [roSettings.locationId],
    references: [locations.id],
  }),
}));

// Parts Markup Matrix
export const partsMatrices = pgTable("parts_matrices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locationId: varchar("location_id").notNull().references(() => locations.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  autoApplyToPartTypes: text("auto_apply_to_part_types").notNull().default('ALL'),
  tiers: jsonb("tiers").notNull().$type<Array<{
    minCost: number;
    maxCost: number | null;
    multiplier: number;
    grossProfit: number;
    markup: number;
  }>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const partsMatricesRelations = relations(partsMatrices, ({ one }) => ({
  location: one(locations, {
    fields: [partsMatrices.locationId],
    references: [locations.id],
  }),
}));

// Labor Markup Matrix
export const laborMatrices = pgTable("labor_matrices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locationId: varchar("location_id").notNull().references(() => locations.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  tiers: jsonb("tiers").notNull().$type<Array<{
    minHours: number;
    maxHours: number | null;
    multiplier: number;
    markup: number;
  }>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const laborMatricesRelations = relations(laborMatrices, ({ one }) => ({
  location: one(locations, {
    fields: [laborMatrices.locationId],
    references: [locations.id],
  }),
}));

// ==========================================
// WHOLESALE / B2B PRICING
// ==========================================

// Pricing Tiers (for wholesale/dealer accounts)
export const pricingTiers = pgTable("pricing_tiers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  description: text("description"),
  discountType: discountMethodEnum("discount_type").notNull().default('PERCENTAGE'),
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
  applyToTires: boolean("apply_to_tires").notNull().default(true),
  applyToParts: boolean("apply_to_parts").notNull().default(true),
  applyToLabor: boolean("apply_to_labor").notNull().default(false),
  minOrderAmount: decimal("min_order_amount", { precision: 10, scale: 2 }),
  volumeTiers: jsonb("volume_tiers").$type<Array<{
    minQuantity: number;
    discountMultiplier: number;
  }>>(),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const pricingTiersRelations = relations(pricingTiers, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [pricingTiers.orgId],
    references: [organizations.id],
  }),
  customers: many(customers),
}));

// Wholesale Orders (B2B bulk orders separate from retail ROs)
export const wholesaleOrders = pgTable("wholesale_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  locationId: varchar("location_id").notNull().references(() => locations.id, { onDelete: 'cascade' }),
  orderNumber: serial("order_number"),
  customerId: varchar("customer_id").notNull().references(() => customers.id, { onDelete: 'cascade' }),
  poNumber: text("po_number"),
  status: text("status").notNull().default('DRAFT'),
  lineItems: jsonb("line_items").notNull().$type<Array<{
    id: string;
    inventoryItemId: string;
    sku: string;
    description: string;
    quantity: number;
    unitCost: number;
    unitPrice: number;
    discount: number;
    lineTotal: number;
  }>>(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull().default('0.00'),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).notNull().default('0.00'),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).notNull().default('0.00'),
  total: decimal("total", { precision: 10, scale: 2 }).notNull().default('0.00'),
  notes: text("notes"),
  shippingAddress: text("shipping_address"),
  requestedDate: timestamp("requested_date"),
  promisedDate: timestamp("promised_date"),
  shippedDate: timestamp("shipped_date"),
  deliveredDate: timestamp("delivered_date"),
  salesRepId: varchar("sales_rep_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const wholesaleOrdersRelations = relations(wholesaleOrders, ({ one }) => ({
  organization: one(organizations, {
    fields: [wholesaleOrders.orgId],
    references: [organizations.id],
  }),
  location: one(locations, {
    fields: [wholesaleOrders.locationId],
    references: [locations.id],
  }),
  customer: one(customers, {
    fields: [wholesaleOrders.customerId],
    references: [customers.id],
  }),
  salesRep: one(users, {
    fields: [wholesaleOrders.salesRepId],
    references: [users.id],
  }),
}));

// Customer Statements (for tracking A/R aging)
export const customerStatements = pgTable("customer_statements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  customerId: varchar("customer_id").notNull().references(() => customers.id, { onDelete: 'cascade' }),
  statementDate: timestamp("statement_date").notNull().defaultNow(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  openingBalance: decimal("opening_balance", { precision: 10, scale: 2 }).notNull().default('0.00'),
  totalCharges: decimal("total_charges", { precision: 10, scale: 2 }).notNull().default('0.00'),
  totalPayments: decimal("total_payments", { precision: 10, scale: 2 }).notNull().default('0.00'),
  closingBalance: decimal("closing_balance", { precision: 10, scale: 2 }).notNull().default('0.00'),
  current: decimal("current", { precision: 10, scale: 2 }).notNull().default('0.00'),
  days30: decimal("days_30", { precision: 10, scale: 2 }).notNull().default('0.00'),
  days60: decimal("days_60", { precision: 10, scale: 2 }).notNull().default('0.00'),
  days90: decimal("days_90", { precision: 10, scale: 2 }).notNull().default('0.00'),
  days90Plus: decimal("days_90_plus", { precision: 10, scale: 2 }).notNull().default('0.00'),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const customerStatementsRelations = relations(customerStatements, ({ one }) => ({
  organization: one(organizations, {
    fields: [customerStatements.orgId],
    references: [organizations.id],
  }),
  customer: one(customers, {
    fields: [customerStatements.customerId],
    references: [customers.id],
  }),
}));

// Customer Transactions (ledger for A/R tracking)
export const customerTransactions = pgTable("customer_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  customerId: varchar("customer_id").notNull().references(() => customers.id, { onDelete: 'cascade' }),
  type: text("type").notNull(),
  referenceType: text("reference_type"),
  referenceId: varchar("reference_id"),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  runningBalance: decimal("running_balance", { precision: 10, scale: 2 }).notNull(),
  dueDate: timestamp("due_date"),
  paidDate: timestamp("paid_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const customerTransactionsRelations = relations(customerTransactions, ({ one }) => ({
  organization: one(organizations, {
    fields: [customerTransactions.orgId],
    references: [organizations.id],
  }),
  customer: one(customers, {
    fields: [customerTransactions.customerId],
    references: [customers.id],
  }),
}));

// Lead Sources (Marketing)
export const leadSources = pgTable("lead_sources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locationId: varchar("location_id").notNull().references(() => locations.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const leadSourcesRelations = relations(leadSources, ({ one }) => ({
  location: one(locations, {
    fields: [leadSources.locationId],
    references: [locations.id],
  }),
}));

// Customer Settings (Required fields configuration)
export const customerSettings = pgTable("customer_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locationId: varchar("location_id").notNull().references(() => locations.id, { onDelete: 'cascade' }).unique(),
  requireAddress: boolean("require_address").notNull().default(false),
  requirePhone: boolean("require_phone").notNull().default(false),
  requireEmail: boolean("require_email").notNull().default(false),
  requireCustomerSource: boolean("require_customer_source").notNull().default(false),
  requireBirthday: boolean("require_birthday").notNull().default(false),
  requireAuthorizedContact: boolean("require_authorized_contact").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const customerSettingsRelations = relations(customerSettings, ({ one }) => ({
  location: one(locations, {
    fields: [customerSettings.locationId],
    references: [locations.id],
  }),
}));

// Estimate/Invoice Transparency Settings
export const transparencySettings = pgTable("transparency_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locationId: varchar("location_id").notNull().references(() => locations.id, { onDelete: 'cascade' }).unique(),
  estimateTerms: text("estimate_terms"),
  invoiceTerms: text("invoice_terms"),
  settings: jsonb("settings").notNull().$type<{
    estimate: {
      showLaborDescription: boolean;
      showLaborHours: boolean;
      showLaborRate: boolean;
      showLaborTotal: boolean;
      showPartName: boolean;
      showPartBrand: boolean;
      showPartNumber: boolean;
      showPartQuantity: boolean;
      showPartRetailPrice: boolean;
      showPartLineTotal: boolean;
      showSubletDescription: boolean;
      showSubletTotal: boolean;
      showItemizedFees: boolean;
      showItemizedDiscounts: boolean;
      showTireTax: boolean;
      showDeclinedJobs: boolean;
      showPurposeOfVisit: boolean;
      showCustomerConcern: boolean;
      showTimeIn: boolean;
      showPromisedTime: boolean;
      showTechnicianOnJobs: boolean;
      showServiceWriter: boolean;
    };
    invoice: {
      showLaborDescription: boolean;
      showLaborHours: boolean;
      showLaborRate: boolean;
      showLaborTotal: boolean;
      showPartName: boolean;
      showPartBrand: boolean;
      showPartNumber: boolean;
      showPartQuantity: boolean;
      showPartRetailPrice: boolean;
      showPartLineTotal: boolean;
      showSubletDescription: boolean;
      showSubletTotal: boolean;
      showItemizedFees: boolean;
      showItemizedDiscounts: boolean;
      showTireTax: boolean;
      showDeclinedJobs: boolean;
      showPurposeOfVisit: boolean;
      showCustomerConcern: boolean;
      showTimeIn: boolean;
      showPromisedTime: boolean;
      showTechnicianOnJobs: boolean;
      showServiceWriter: boolean;
    };
  }>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const transparencySettingsRelations = relations(transparencySettings, ({ one }) => ({
  location: one(locations, {
    fields: [transparencySettings.locationId],
    references: [locations.id],
  }),
}));

// Organization Branding (White-label)
export const orgBranding = pgTable("org_branding", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }).unique(),
  logoUrl: text("logo_url"),
  faviconUrl: text("favicon_url"),
  primaryColor: text("primary_color").default('#2563EB'),
  secondaryColor: text("secondary_color").default('#0f172a'),
  accentColor: text("accent_color").default('#8B5CF6'),
  customDomain: text("custom_domain"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orgBrandingRelations = relations(orgBranding, ({ one }) => ({
  organization: one(organizations, {
    fields: [orgBranding.orgId],
    references: [organizations.id],
  }),
}));

// ============================================
// PHASE 2: OPERATIONAL WORKFLOWS
// ============================================

// Appointment Status Enum
export const appointmentStatusEnum = pgEnum('appointment_status', ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW', 'CANCELLED']);

// Service Bays - Physical work bays at each location
export const serviceBays = pgTable("service_bays", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locationId: varchar("location_id").notNull().references(() => locations.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const serviceBaysRelations = relations(serviceBays, ({ one, many }) => ({
  location: one(locations, {
    fields: [serviceBays.locationId],
    references: [locations.id],
  }),
  appointments: many(appointments),
}));

// Appointments - Main scheduling table
export const appointments = pgTable("appointments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locationId: varchar("location_id").notNull().references(() => locations.id, { onDelete: 'cascade' }),
  customerId: varchar("customer_id").notNull().references(() => customers.id, { onDelete: 'cascade' }),
  vehicleId: varchar("vehicle_id").notNull().references(() => vehicles.id, { onDelete: 'cascade' }),
  advisorId: varchar("advisor_id").references(() => users.id),
  technicianId: varchar("technician_id").references(() => users.id),
  bayId: varchar("bay_id").references(() => serviceBays.id),
  repairOrderId: varchar("repair_order_id").references(() => repairOrders.id),
  title: text("title").notNull(),
  notes: text("notes"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  estimatedDuration: integer("estimated_duration").notNull().default(60),
  status: appointmentStatusEnum("status").notNull().default('SCHEDULED'),
  reminderSent: boolean("reminder_sent").notNull().default(false),
  confirmedAt: timestamp("confirmed_at"),
  checkedInAt: timestamp("checked_in_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const appointmentsRelations = relations(appointments, ({ one, many }) => ({
  location: one(locations, {
    fields: [appointments.locationId],
    references: [locations.id],
  }),
  customer: one(customers, {
    fields: [appointments.customerId],
    references: [customers.id],
  }),
  vehicle: one(vehicles, {
    fields: [appointments.vehicleId],
    references: [vehicles.id],
  }),
  advisor: one(users, {
    fields: [appointments.advisorId],
    references: [users.id],
    relationName: 'appointmentAdvisor',
  }),
  technician: one(users, {
    fields: [appointments.technicianId],
    references: [users.id],
    relationName: 'appointmentTechnician',
  }),
  bay: one(serviceBays, {
    fields: [appointments.bayId],
    references: [serviceBays.id],
  }),
  repairOrder: one(repairOrders, {
    fields: [appointments.repairOrderId],
    references: [repairOrders.id],
  }),
  services: many(appointmentServices),
}));

// Appointment Services - Services requested for an appointment
export const appointmentServices = pgTable("appointment_services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  appointmentId: varchar("appointment_id").notNull().references(() => appointments.id, { onDelete: 'cascade' }),
  serviceName: text("service_name").notNull(),
  estimatedHours: decimal("estimated_hours", { precision: 5, scale: 2 }),
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const appointmentServicesRelations = relations(appointmentServices, ({ one }) => ({
  appointment: one(appointments, {
    fields: [appointmentServices.appointmentId],
    references: [appointments.id],
  }),
}));

// Technician Time Logs - Clock in/out and job time tracking
export const technicianTimeLogs = pgTable("technician_time_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  locationId: varchar("location_id").notNull().references(() => locations.id, { onDelete: 'cascade' }),
  repairOrderId: varchar("repair_order_id").references(() => repairOrders.id),
  jobId: text("job_id"),
  clockIn: timestamp("clock_in").notNull(),
  clockOut: timestamp("clock_out"),
  breakMinutes: integer("break_minutes").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const technicianTimeLogsRelations = relations(technicianTimeLogs, ({ one }) => ({
  user: one(users, {
    fields: [technicianTimeLogs.userId],
    references: [users.id],
  }),
  location: one(locations, {
    fields: [technicianTimeLogs.locationId],
    references: [locations.id],
  }),
  repairOrder: one(repairOrders, {
    fields: [technicianTimeLogs.repairOrderId],
    references: [repairOrders.id],
  }),
}));

// Vendors - Parts suppliers
export const vendors = pgTable("vendors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  code: text("code"),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  accountNumber: text("account_number"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const vendorsRelations = relations(vendors, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [vendors.orgId],
    references: [organizations.id],
  }),
  partOrders: many(partOrders),
}));

// Part Order Status Enum
export const partOrderStatusEnum = pgEnum('part_order_status', ['DRAFT', 'ORDERED', 'PARTIAL', 'RECEIVED', 'CANCELLED']);

// Part Orders - Orders placed with vendors
export const partOrders = pgTable("part_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locationId: varchar("location_id").notNull().references(() => locations.id, { onDelete: 'cascade' }),
  vendorId: varchar("vendor_id").notNull().references(() => vendors.id, { onDelete: 'cascade' }),
  orderNumber: text("order_number"),
  poNumber: text("po_number"),
  status: partOrderStatusEnum("status").notNull().default('DRAFT'),
  orderedAt: timestamp("ordered_at"),
  expectedAt: timestamp("expected_at"),
  receivedAt: timestamp("received_at"),
  notes: text("notes"),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const partOrdersRelations = relations(partOrders, ({ one, many }) => ({
  location: one(locations, {
    fields: [partOrders.locationId],
    references: [locations.id],
  }),
  vendor: one(vendors, {
    fields: [partOrders.vendorId],
    references: [vendors.id],
  }),
  items: many(partOrderItems),
}));

// Part Order Items - Individual parts on an order
export const partOrderItems = pgTable("part_order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partOrderId: varchar("part_order_id").notNull().references(() => partOrders.id, { onDelete: 'cascade' }),
  repairOrderId: varchar("repair_order_id").references(() => repairOrders.id),
  jobId: text("job_id"),
  partNumber: text("part_number").notNull(),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitCost: decimal("unit_cost", { precision: 10, scale: 2 }),
  quantityReceived: integer("quantity_received").notNull().default(0),
  receivedAt: timestamp("received_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const partOrderItemsRelations = relations(partOrderItems, ({ one }) => ({
  partOrder: one(partOrders, {
    fields: [partOrderItems.partOrderId],
    references: [partOrders.id],
  }),
  repairOrder: one(repairOrders, {
    fields: [partOrderItems.repairOrderId],
    references: [repairOrders.id],
  }),
}));

// Invoice Status Enum
export const invoiceStatusEnum = pgEnum('invoice_status', ['DRAFT', 'SENT', 'VIEWED', 'PARTIAL', 'PAID', 'OVERDUE', 'VOID']);

// Invoices - Generated from repair orders
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locationId: varchar("location_id").notNull().references(() => locations.id, { onDelete: 'cascade' }),
  repairOrderId: varchar("repair_order_id").notNull().references(() => repairOrders.id, { onDelete: 'cascade' }),
  customerId: varchar("customer_id").notNull().references(() => customers.id, { onDelete: 'cascade' }),
  invoiceNumber: text("invoice_number").notNull(),
  status: invoiceStatusEnum("status").notNull().default('DRAFT'),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).notNull().default('0'),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).notNull().default('0'),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  amountPaid: decimal("amount_paid", { precision: 10, scale: 2 }).notNull().default('0'),
  amountDue: decimal("amount_due", { precision: 10, scale: 2 }).notNull(),
  dueDate: timestamp("due_date"),
  sentAt: timestamp("sent_at"),
  viewedAt: timestamp("viewed_at"),
  paidAt: timestamp("paid_at"),
  notes: text("notes"),
  termsAndConditions: text("terms_and_conditions"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  location: one(locations, {
    fields: [invoices.locationId],
    references: [locations.id],
  }),
  repairOrder: one(repairOrders, {
    fields: [invoices.repairOrderId],
    references: [repairOrders.id],
  }),
  customer: one(customers, {
    fields: [invoices.customerId],
    references: [customers.id],
  }),
  payments: many(payments),
}));

// Payment Method Enum
export const paymentMethodEnum = pgEnum('payment_method', ['CASH', 'CHECK', 'CREDIT_CARD', 'DEBIT_CARD', 'ACH', 'FINANCING', 'OTHER']);

// Payments - Payment records for invoices
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  method: paymentMethodEnum("method").notNull(),
  referenceNumber: text("reference_number"),
  notes: text("notes"),
  processedBy: varchar("processed_by").references(() => users.id),
  processedAt: timestamp("processed_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const paymentsRelations = relations(payments, ({ one }) => ({
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
  processedByUser: one(users, {
    fields: [payments.processedBy],
    references: [users.id],
  }),
}));

// Service Queue Status Enum
export const queueStatusEnum = pgEnum('queue_status', ['WAITING', 'IN_PROGRESS', 'COMPLETE']);
export const checkInSourceEnum = pgEnum('check_in_source', ['SELF_CHECKIN', 'WALK_IN', 'APPOINTMENT', 'DROP_OFF']);

// Canned Job Templates - Pre-built service packages
export const cannedJobTemplates = pgTable("canned_job_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locationId: varchar("location_id").notNull().references(() => locations.id, { onDelete: 'cascade' }),
  categoryId: varchar("category_id").references(() => jobCategories.id, { onDelete: 'set null' }),
  name: text("name").notNull(),
  description: text("description"),
  laborHours: decimal("labor_hours", { precision: 6, scale: 2 }).notNull().default('1.0'),
  laborRate: decimal("labor_rate", { precision: 10, scale: 2 }),
  defaultNotes: text("default_notes"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const cannedJobTemplatesRelations = relations(cannedJobTemplates, ({ one, many }) => ({
  location: one(locations, {
    fields: [cannedJobTemplates.locationId],
    references: [locations.id],
  }),
  category: one(jobCategories, {
    fields: [cannedJobTemplates.categoryId],
    references: [jobCategories.id],
  }),
  parts: many(cannedJobParts),
}));

// Canned Job Parts - Default parts for a canned job template
export const cannedJobParts = pgTable("canned_job_parts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").notNull().references(() => cannedJobTemplates.id, { onDelete: 'cascade' }),
  inventoryItemId: varchar("inventory_item_id").references(() => inventoryItems.id, { onDelete: 'set null' }),
  description: text("description").notNull(),
  partNumber: text("part_number"),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull().default('1'),
  unitCost: decimal("unit_cost", { precision: 10, scale: 2 }),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }),
  isRequired: boolean("is_required").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const cannedJobPartsRelations = relations(cannedJobParts, ({ one }) => ({
  template: one(cannedJobTemplates, {
    fields: [cannedJobParts.templateId],
    references: [cannedJobTemplates.id],
  }),
  inventoryItem: one(inventoryItems, {
    fields: [cannedJobParts.inventoryItemId],
    references: [inventoryItems.id],
  }),
}));

// Service Queue - Waitlist/Queue management
export const serviceQueueEntries = pgTable("service_queue_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locationId: varchar("location_id").notNull().references(() => locations.id, { onDelete: 'cascade' }),
  customerId: varchar("customer_id").references(() => customers.id, { onDelete: 'set null' }),
  vehicleId: varchar("vehicle_id").references(() => vehicles.id, { onDelete: 'set null' }),
  repairOrderId: varchar("repair_order_id").references(() => repairOrders.id, { onDelete: 'set null' }),
  checkInSource: checkInSourceEnum("check_in_source").notNull().default('WALK_IN'),
  status: queueStatusEnum("status").notNull().default('WAITING'),
  position: integer("position").notNull().default(0),
  customerName: text("customer_name"),
  vehicleInfo: text("vehicle_info"),
  serviceDescription: text("service_description"),
  estimatedMinutes: integer("estimated_minutes"),
  assignedBayId: varchar("assigned_bay_id").references(() => serviceBays.id, { onDelete: 'set null' }),
  assignedTechId: varchar("assigned_tech_id").references(() => users.id, { onDelete: 'set null' }),
  notes: text("notes"),
  checkInTime: timestamp("check_in_time").notNull().defaultNow(),
  startTime: timestamp("start_time"),
  completedTime: timestamp("completed_time"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const serviceQueueEntriesRelations = relations(serviceQueueEntries, ({ one }) => ({
  location: one(locations, {
    fields: [serviceQueueEntries.locationId],
    references: [locations.id],
  }),
  customer: one(customers, {
    fields: [serviceQueueEntries.customerId],
    references: [customers.id],
  }),
  vehicle: one(vehicles, {
    fields: [serviceQueueEntries.vehicleId],
    references: [vehicles.id],
  }),
  repairOrder: one(repairOrders, {
    fields: [serviceQueueEntries.repairOrderId],
    references: [repairOrders.id],
  }),
  assignedBay: one(serviceBays, {
    fields: [serviceQueueEntries.assignedBayId],
    references: [serviceBays.id],
  }),
  assignedTech: one(users, {
    fields: [serviceQueueEntries.assignedTechId],
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

export const insertDeferredWorkSchema = createInsertSchema(deferredWork).omit({
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
  updatedAt: true,
});

export const insertStockTransactionSchema = createInsertSchema(stockTransactions).omit({
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

// Phase 1: Configuration Insert Schemas
export const insertLaborRateSchema = createInsertSchema(laborRates).omit({
  id: true,
  createdAt: true,
});

export const insertShopFeeSchema = createInsertSchema(shopFees).omit({
  id: true,
  createdAt: true,
});

export const insertDiscountSchema = createInsertSchema(discounts).omit({
  id: true,
  createdAt: true,
});

export const insertTaxSettingsSchema = createInsertSchema(taxSettings).omit({
  id: true,
  createdAt: true,
});

export const insertJobCategorySchema = createInsertSchema(jobCategories).omit({
  id: true,
  createdAt: true,
});

export const insertPaymentTypeSchema = createInsertSchema(paymentTypes).omit({
  id: true,
  createdAt: true,
});

export const insertInvoiceSettingsSchema = createInsertSchema(invoiceSettings).omit({
  id: true,
  createdAt: true,
});

export const insertRoSettingsSchema = createInsertSchema(roSettings).omit({
  id: true,
  createdAt: true,
});

export const insertPartsMatrixSchema = createInsertSchema(partsMatrices).omit({
  id: true,
  createdAt: true,
});

export const insertLaborMatrixSchema = createInsertSchema(laborMatrices).omit({
  id: true,
  createdAt: true,
});

export const insertLeadSourceSchema = createInsertSchema(leadSources).omit({
  id: true,
  createdAt: true,
});

export const insertCustomerSettingsSchema = createInsertSchema(customerSettings).omit({
  id: true,
  createdAt: true,
});

export const insertTransparencySettingsSchema = createInsertSchema(transparencySettings).omit({
  id: true,
  createdAt: true,
});

export const insertOrgBrandingSchema = createInsertSchema(orgBranding).omit({
  id: true,
  createdAt: true,
});

// Wholesale / B2B Insert Schemas
export const insertPricingTierSchema = createInsertSchema(pricingTiers).omit({
  id: true,
  createdAt: true,
});

export const insertWholesaleOrderSchema = createInsertSchema(wholesaleOrders).omit({
  id: true,
  orderNumber: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCustomerStatementSchema = createInsertSchema(customerStatements).omit({
  id: true,
  createdAt: true,
});

export const insertCustomerTransactionSchema = createInsertSchema(customerTransactions).omit({
  id: true,
  createdAt: true,
});

// Phase 2: Operational Workflows Insert Schemas
export const insertServiceBaySchema = createInsertSchema(serviceBays).omit({
  id: true,
  createdAt: true,
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
});

export const insertAppointmentServiceSchema = createInsertSchema(appointmentServices).omit({
  id: true,
  createdAt: true,
});

export const insertTechnicianTimeLogSchema = createInsertSchema(technicianTimeLogs).omit({
  id: true,
  createdAt: true,
});

export const insertVendorSchema = createInsertSchema(vendors).omit({
  id: true,
  createdAt: true,
});

export const insertPartOrderSchema = createInsertSchema(partOrders).omit({
  id: true,
  createdAt: true,
});

export const insertPartOrderItemSchema = createInsertSchema(partOrderItems).omit({
  id: true,
  createdAt: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

// Canned Jobs & Service Queue Insert Schemas
export const insertCannedJobTemplateSchema = createInsertSchema(cannedJobTemplates).omit({
  id: true,
  createdAt: true,
});

export const insertCannedJobPartSchema = createInsertSchema(cannedJobParts).omit({
  id: true,
  createdAt: true,
});

export const insertServiceQueueEntrySchema = createInsertSchema(serviceQueueEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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

export type DeferredWork = typeof deferredWork.$inferSelect;
export type InsertDeferredWork = z.infer<typeof insertDeferredWorkSchema>;

export type Workflow = typeof workflows.$inferSelect;
export type InsertWorkflow = z.infer<typeof insertWorkflowSchema>;

export type RepairOrder = typeof repairOrders.$inferSelect;
export type InsertRepairOrder = z.infer<typeof insertRepairOrderSchema>;

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;

export type StockTransaction = typeof stockTransactions.$inferSelect;
export type InsertStockTransaction = z.infer<typeof insertStockTransactionSchema>;

export type InspectionTemplate = typeof inspectionTemplates.$inferSelect;
export type InsertInspectionTemplate = z.infer<typeof insertInspectionTemplateSchema>;

export type Inspection = typeof inspections.$inferSelect;
export type InsertInspection = z.infer<typeof insertInspectionSchema>;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

// Phase 1: Configuration Types
export type LaborRate = typeof laborRates.$inferSelect;
export type InsertLaborRate = z.infer<typeof insertLaborRateSchema>;

export type ShopFee = typeof shopFees.$inferSelect;
export type InsertShopFee = z.infer<typeof insertShopFeeSchema>;

export type Discount = typeof discounts.$inferSelect;
export type InsertDiscount = z.infer<typeof insertDiscountSchema>;

export type TaxSettings = typeof taxSettings.$inferSelect;
export type InsertTaxSettings = z.infer<typeof insertTaxSettingsSchema>;

export type JobCategory = typeof jobCategories.$inferSelect;
export type InsertJobCategory = z.infer<typeof insertJobCategorySchema>;

export type PaymentType = typeof paymentTypes.$inferSelect;
export type InsertPaymentType = z.infer<typeof insertPaymentTypeSchema>;

export type InvoiceSettings = typeof invoiceSettings.$inferSelect;
export type InsertInvoiceSettings = z.infer<typeof insertInvoiceSettingsSchema>;

export type RoSettings = typeof roSettings.$inferSelect;
export type InsertRoSettings = z.infer<typeof insertRoSettingsSchema>;

export type PartsMatrix = typeof partsMatrices.$inferSelect;
export type InsertPartsMatrix = z.infer<typeof insertPartsMatrixSchema>;

export type LaborMatrix = typeof laborMatrices.$inferSelect;
export type InsertLaborMatrix = z.infer<typeof insertLaborMatrixSchema>;

export type LeadSource = typeof leadSources.$inferSelect;
export type InsertLeadSource = z.infer<typeof insertLeadSourceSchema>;

export type CustomerSettings = typeof customerSettings.$inferSelect;
export type InsertCustomerSettings = z.infer<typeof insertCustomerSettingsSchema>;

export type TransparencySettings = typeof transparencySettings.$inferSelect;
export type InsertTransparencySettings = z.infer<typeof insertTransparencySettingsSchema>;

export type OrgBranding = typeof orgBranding.$inferSelect;
export type InsertOrgBranding = z.infer<typeof insertOrgBrandingSchema>;

// Phase 2: Operational Workflows Types
export type ServiceBay = typeof serviceBays.$inferSelect;
export type InsertServiceBay = z.infer<typeof insertServiceBaySchema>;

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

export type AppointmentService = typeof appointmentServices.$inferSelect;
export type InsertAppointmentService = z.infer<typeof insertAppointmentServiceSchema>;

export type TechnicianTimeLog = typeof technicianTimeLogs.$inferSelect;
export type InsertTechnicianTimeLog = z.infer<typeof insertTechnicianTimeLogSchema>;

export type Vendor = typeof vendors.$inferSelect;
export type InsertVendor = z.infer<typeof insertVendorSchema>;

export type PartOrder = typeof partOrders.$inferSelect;
export type InsertPartOrder = z.infer<typeof insertPartOrderSchema>;

export type PartOrderItem = typeof partOrderItems.$inferSelect;
export type InsertPartOrderItem = z.infer<typeof insertPartOrderItemSchema>;

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

// Wholesale / B2B Types
export type PricingTier = typeof pricingTiers.$inferSelect;
export type InsertPricingTier = z.infer<typeof insertPricingTierSchema>;

export type WholesaleOrder = typeof wholesaleOrders.$inferSelect;
export type InsertWholesaleOrder = z.infer<typeof insertWholesaleOrderSchema>;

export type CustomerStatement = typeof customerStatements.$inferSelect;
export type InsertCustomerStatement = z.infer<typeof insertCustomerStatementSchema>;

export type CustomerTransaction = typeof customerTransactions.$inferSelect;
export type InsertCustomerTransaction = z.infer<typeof insertCustomerTransactionSchema>;

// Canned Jobs & Service Queue Types
export type CannedJobTemplate = typeof cannedJobTemplates.$inferSelect;
export type InsertCannedJobTemplate = z.infer<typeof insertCannedJobTemplateSchema>;

export type CannedJobPart = typeof cannedJobParts.$inferSelect;
export type InsertCannedJobPart = z.infer<typeof insertCannedJobPartSchema>;

export type ServiceQueueEntry = typeof serviceQueueEntries.$inferSelect;
export type InsertServiceQueueEntry = z.infer<typeof insertServiceQueueEntrySchema>;

// ==========================================
// PROTRACTOR INTEGRATION
// ==========================================

// Import Job Status Enum
export const protractorImportStatusEnum = pgEnum('protractor_import_status', [
  'PENDING',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'CANCELLED'
]);

// Import Job Type Enum
export const protractorImportTypeEnum = pgEnum('protractor_import_type', [
  'FULL',
  'CUSTOMERS',
  'VEHICLES',
  'WORK_ORDERS',
  'INVOICES'
]);

// Protractor Connections - Store API credentials per location
export const protractorConnections = pgTable("protractor_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locationId: varchar("location_id").notNull().references(() => locations.id, { onDelete: 'cascade' }).unique(),
  connectionId: text("connection_id").notNull(),
  apiKey: text("api_key").notNull(),
  authentication: text("authentication").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  lastSyncAt: timestamp("last_sync_at"),
  lastError: text("last_error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const protractorConnectionsRelations = relations(protractorConnections, ({ one, many }) => ({
  location: one(locations, {
    fields: [protractorConnections.locationId],
    references: [locations.id],
  }),
  importJobs: many(protractorImportJobs),
}));

// Protractor Import Jobs - Track import progress
export const protractorImportJobs = pgTable("protractor_import_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  connectionId: varchar("connection_id").notNull().references(() => protractorConnections.id, { onDelete: 'cascade' }),
  locationId: varchar("location_id").notNull().references(() => locations.id, { onDelete: 'cascade' }),
  importType: protractorImportTypeEnum("import_type").notNull(),
  status: protractorImportStatusEnum("status").notNull().default('PENDING'),
  totalRecords: integer("total_records").notNull().default(0),
  processedRecords: integer("processed_records").notNull().default(0),
  failedRecords: integer("failed_records").notNull().default(0),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  errorLog: jsonb("error_log").$type<Array<{ record: string; error: string; timestamp: string }>>(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const protractorImportJobsRelations = relations(protractorImportJobs, ({ one }) => ({
  connection: one(protractorConnections, {
    fields: [protractorImportJobs.connectionId],
    references: [protractorConnections.id],
  }),
  location: one(locations, {
    fields: [protractorImportJobs.locationId],
    references: [locations.id],
  }),
}));

// Insert schemas
export const insertProtractorConnectionSchema = createInsertSchema(protractorConnections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProtractorImportJobSchema = createInsertSchema(protractorImportJobs).omit({
  id: true,
  createdAt: true,
});

// Types
export type ProtractorConnection = typeof protractorConnections.$inferSelect;
export type InsertProtractorConnection = z.infer<typeof insertProtractorConnectionSchema>;

export type ProtractorImportJob = typeof protractorImportJobs.$inferSelect;
export type InsertProtractorImportJob = z.infer<typeof insertProtractorImportJobSchema>;

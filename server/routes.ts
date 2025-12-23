import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth, hashPassword } from "./auth";
import passport from "passport";
import { 
  generateInspectionFinding, 
  generateInspectionSummary,
  generateServiceDescription,
  generateAuthorizationRequest,
  improveJobDescription,
  generateJobsFromDVI,
  findEngineCompatibleJobs,
} from "./ai";
import {
  sendSMS,
  sendEmail,
  generateInspectionSMS,
  generateInspectionEmail,
  isMessagingConfigured,
} from "./messaging";
import { createProtractorClient, createProtractorClientFromEnv } from "./protractor";
import { 
  getMaintenanceScheduleCached, 
  triageMaintenanceItems,
  decodeVin,
  invalidateCache,
} from "./services/dataone";
import {
  getServiceHistoryCached as getCarfaxServiceHistory,
  getCarfaxStatus,
  matchServiceToOemMaintenance,
} from "./services/carfax";
import { generateRecommendations } from "./services/recommendations";
import { 
  insertUserSchema,
  insertOrganizationSchema,
  insertLocationSchema,
  insertCustomerSchema,
  insertVehicleSchema,
  insertDeferredWorkSchema,
  insertWorkflowSchema,
  insertRepairOrderSchema,
  insertInventoryItemSchema,
  insertInspectionTemplateSchema,
  insertInspectionSchema,
  insertLaborRateSchema,
  insertShopFeeSchema,
  insertDiscountSchema,
  insertTaxSettingsSchema,
  insertJobCategorySchema,
  insertPaymentTypeSchema,
  insertInvoiceSettingsSchema,
  insertRoSettingsSchema,
  insertPartsMatrixSchema,
  insertLaborMatrixSchema,
  insertLeadSourceSchema,
  insertCustomerSettingsSchema,
  insertTransparencySettingsSchema,
  insertOrgBrandingSchema,
  insertServiceBaySchema,
  insertAppointmentSchema,
  insertAppointmentServiceSchema,
  insertTechnicianTimeLogSchema,
  insertVendorSchema,
  insertPartOrderSchema,
  insertPartOrderItemSchema,
  insertInvoiceSchema,
  insertPaymentSchema,
  insertCannedJobTemplateSchema,
  insertCannedJobPartSchema,
  insertServiceQueueEntrySchema,
} from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { z } from "zod";
import { db } from "./db";
import { and, eq, sql, or, gte, lte, isNotNull } from "drizzle-orm";
import { 
  organizations, 
  locations, 
  users, 
  workflows, 
  laborRates, 
  taxSettings,
  vehicles,
  repairOrders
} from "@shared/schema";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);

  // Auth routes
  app.post("/api/auth/register", async (req, res, next) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: fromZodError(result.error).toString() 
        });
      }

      const existingUser = await storage.getUserByUsername(result.data.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await hashPassword(result.data.password);
      const user = await storage.createUser({
        ...result.data,
        password: hashedPassword,
      });

      const { password: _, ...userWithoutPassword } = user;

      req.login(userWithoutPassword, (err) => {
        if (err) return next(err);
        return res.json({ user: userWithoutPassword });
      });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Login failed" });
      }
      req.login(user, (err) => {
        if (err) return next(err);
        return res.json({ user });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json({ user: req.user });
  });

  // ============================================================================
  // Self-Service Shop Onboarding API
  // ============================================================================
  
  // Zod schema for onboarding validation
  const onboardingSchema = z.object({
    // Account info
    username: z.string().min(3, "Username must be at least 3 characters").max(50),
    password: z.string().min(6, "Password must be at least 6 characters").max(100),
    email: z.string().email("Invalid email address"),
    name: z.string().min(1, "Name is required").max(100),
    // Organization info
    shopName: z.string().min(1, "Shop name is required").max(200),
    // Location info
    locationName: z.string().min(1, "Location name is required").max(200),
    address: z.string().min(1, "Address is required").max(500),
    city: z.string().min(1, "City is required").max(100),
    state: z.string().min(2, "State is required").max(50),
    zip: z.string().min(1, "ZIP code is required").max(20),
    phone: z.string().min(1, "Phone is required").max(50),
    // Optional settings
    laborRate: z.string().optional(),
    salesTaxRate: z.string().optional(),
  });
  
  app.post("/api/onboarding/register", async (req, res, next) => {
    try {
      // Validate request body with Zod schema
      const validationResult = onboardingSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: fromZodError(validationResult.error).toString() 
        });
      }
      
      const { 
        username, password, email, name, shopName,
        locationName, address, city, state, zip, phone,
        laborRate, salesTaxRate,
      } = validationResult.data;

      // Check if username already exists (before transaction)
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists. Please choose a different username." });
      }

      // Generate unique slug from shop name with timestamp suffix for uniqueness
      const baseSlug = shopName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      const timestamp = Date.now().toString(36);
      let slug = baseSlug;
      let slugCounter = 1;
      while (await storage.getOrganizationBySlug(slug)) {
        slug = `${baseSlug}-${timestamp}-${slugCounter}`;
        slugCounter++;
      }

      // Hash password before transaction
      const hashedPassword = await hashPassword(password);
      
      // Use transaction to ensure atomic creation of all entities
      const result = await db.transaction(async (tx) => {
        // 1. Create Organization
        const [org] = await tx.insert(organizations).values({
          name: shopName,
          slug,
          billingEmail: email,
          subscriptionPlan: 'STARTER',
          subscriptionStatus: 'ACTIVE',
        }).returning();

        // 2. Create Location
        const [location] = await tx.insert(locations).values({
          orgId: org.id,
          name: locationName,
          locationType: 'RETAIL',
          address,
          city,
          state,
          zip,
          phone,
          email,
        }).returning();

        // 3. Create Admin User
        const [user] = await tx.insert(users).values({
          orgId: org.id,
          username,
          password: hashedPassword,
          name,
          email,
          role: 'OWNER',
          locationIds: [location.id],
        }).returning();

        // 4. Create Default Workflow
        await tx.insert(workflows).values({
          orgId: org.id,
          name: 'Standard Workflow',
          description: 'Default repair order workflow',
          isDefault: true,
          stages: [
            { id: 'estimate', label: 'Estimate', color: '#6366f1', type: 'SYSTEM', order: 0, isEnabled: true },
            { id: 'waiting_auth', label: 'Waiting Authorization', color: '#f59e0b', type: 'SYSTEM', order: 1, isEnabled: true },
            { id: 'authorized', label: 'Authorized', color: '#22c55e', type: 'SYSTEM', order: 2, isEnabled: true },
            { id: 'in_progress', label: 'In Progress', color: '#3b82f6', type: 'SYSTEM', order: 3, isEnabled: true },
            { id: 'completed', label: 'Completed', color: '#10b981', type: 'SYSTEM', order: 4, isEnabled: true },
            { id: 'invoiced', label: 'Invoiced', color: '#8b5cf6', type: 'SYSTEM', order: 5, isEnabled: true },
          ],
        });

        // 5. Create Default Labor Rate
        const defaultLaborRate = parseFloat(laborRate || '125.00') || 125.00;
        await tx.insert(laborRates).values({
          locationId: location.id,
          name: 'Standard Labor',
          rate: defaultLaborRate.toString(),
          sortOrder: 0,
          isDefault: true,
        });

        // 6. Create Default Tax Settings
        const defaultTaxRate = parseFloat(salesTaxRate || '0') || 0.0;
        await tx.insert(taxSettings).values({
          locationId: location.id,
          salesTaxRate: defaultTaxRate.toString(),
          taxOnLabor: false,
          taxOnParts: true,
          taxOnFees: false,
        });

        return { org, location, user };
      });

      // Log the user in (handle gracefully if session fails)
      const { password: _, ...userWithoutPassword } = result.user;
      
      req.login(userWithoutPassword, (loginErr) => {
        if (loginErr) {
          // Account was created but auto-login failed
          // Still return success, user can log in manually
          console.error('Auto-login failed after signup:', loginErr);
          return res.status(201).json({ 
            success: true,
            message: 'Your shop has been created! Please log in with your credentials.',
            requiresManualLogin: true,
            organization: result.org,
            location: result.location,
          });
        }
        return res.status(201).json({ 
          success: true,
          message: 'Your shop has been created successfully!',
          user: userWithoutPassword,
          organization: result.org,
          location: result.location,
        });
      });
    } catch (error: any) {
      console.error('Onboarding error:', error);
      // Handle unique constraint violations with user-friendly messages
      if (error.code === '23505') { // PostgreSQL unique violation
        if (error.constraint?.includes('username')) {
          return res.status(409).json({ message: "Username already exists. Please choose a different username." });
        }
        if (error.constraint?.includes('slug')) {
          return res.status(409).json({ message: "Shop name conflict. Please try a slightly different name." });
        }
        return res.status(409).json({ message: "A conflict occurred. Please try again." });
      }
      return res.status(500).json({ message: error.message || 'Failed to create shop. Please try again.' });
    }
  });

  // Check if slug is available
  app.get("/api/onboarding/check-slug/:slug", async (req, res) => {
    try {
      const existing = await storage.getOrganizationBySlug(req.params.slug);
      res.json({ available: !existing });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Check if username is available
  app.get("/api/onboarding/check-username/:username", async (req, res) => {
    try {
      const existing = await storage.getUserByUsername(req.params.username);
      res.json({ available: !existing });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Organizations
  app.get("/api/organizations/:id", requireAuth, async (req, res) => {
    try {
      const org = await storage.getOrganization(req.params.id);
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }
      if (req.user!.orgId !== org.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      res.json(org);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/organizations", async (req, res) => {
    try {
      const result = insertOrganizationSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: fromZodError(result.error).toString() 
        });
      }
      const org = await storage.createOrganization(result.data);
      res.status(201).json(org);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/organizations/:id", requireAuth, async (req, res) => {
    try {
      if (req.user!.orgId !== req.params.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      const org = await storage.updateOrganization(req.params.id, req.body);
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }
      res.json(org);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Locations
  app.get("/api/locations", requireAuth, async (req, res) => {
    try {
      const locations = await storage.getLocationsByOrg(req.user!.orgId);
      res.json(locations);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/locations/:id", requireAuth, async (req, res) => {
    try {
      const location = await storage.getLocation(req.params.id);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(404).json({ message: "Location not found" });
      }
      res.json(location);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/locations", requireAuth, async (req, res) => {
    try {
      const result = insertLocationSchema.safeParse({
        ...req.body,
        orgId: req.user!.orgId,
      });
      if (!result.success) {
        return res.status(400).json({ 
          message: fromZodError(result.error).toString() 
        });
      }
      const location = await storage.createLocation(result.data);
      res.status(201).json(location);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/locations/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getLocation(req.params.id);
      if (!existing || existing.orgId !== req.user!.orgId) {
        return res.status(404).json({ message: "Location not found" });
      }
      const location = await storage.updateLocation(req.params.id, req.body);
      res.json(location);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Users
  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      const users = await storage.getUsersByOrg(req.user!.orgId);
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Customers
  app.get("/api/customers", requireAuth, async (req, res) => {
    try {
      const { search } = req.query;
      let customers;
      if (search && typeof search === 'string') {
        customers = await storage.searchCustomers(req.user!.orgId, search);
      } else {
        customers = await storage.getCustomersByOrg(req.user!.orgId);
      }
      res.json(customers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/customers/:id", requireAuth, async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.params.id, req.user!.orgId);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/customers", requireAuth, async (req, res) => {
    try {
      const result = insertCustomerSchema.safeParse({
        ...req.body,
        orgId: req.user!.orgId,
      });
      if (!result.success) {
        return res.status(400).json({ 
          message: fromZodError(result.error).toString() 
        });
      }
      const customer = await storage.createCustomer(result.data);
      res.status(201).json(customer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/customers/:id", requireAuth, async (req, res) => {
    try {
      const customer = await storage.updateCustomer(req.params.id, req.user!.orgId, req.body);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Vehicles
  app.get("/api/vehicles", requireAuth, async (req, res) => {
    try {
      const vehicles = await storage.getVehiclesByOrg(req.user!.orgId);
      res.json(vehicles);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/vehicles/customer/:customerId", requireAuth, async (req, res) => {
    try {
      const vehicles = await storage.getVehiclesByCustomer(req.params.customerId);
      res.json(vehicles);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/vehicles/:id", requireAuth, async (req, res) => {
    try {
      const vehicle = await storage.getVehicle(req.params.id);
      if (!vehicle) {
        return res.status(404).json({ message: "Vehicle not found" });
      }
      res.json(vehicle);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/vehicles", requireAuth, async (req, res) => {
    try {
      const result = insertVehicleSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: fromZodError(result.error).toString() 
        });
      }
      const vehicle = await storage.createVehicle(result.data);
      res.status(201).json(vehicle);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/vehicles/:id", requireAuth, async (req, res) => {
    try {
      const vehicle = await storage.updateVehicle(req.params.id, req.body);
      if (!vehicle) {
        return res.status(404).json({ message: "Vehicle not found" });
      }
      res.json(vehicle);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Deferred Work
  app.get("/api/deferred-work", requireAuth, async (req, res) => {
    try {
      const deferredWork = await storage.getDeferredWorkByOrg(req.user!.orgId);
      res.json(deferredWork);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/deferred-work/vehicle/:vehicleId", requireAuth, async (req, res) => {
    try {
      const deferredWork = await storage.getDeferredWorkByVehicle(req.params.vehicleId);
      res.json(deferredWork);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/deferred-work/customer/:customerId", requireAuth, async (req, res) => {
    try {
      const deferredWork = await storage.getDeferredWorkByCustomer(req.params.customerId);
      res.json(deferredWork);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/deferred-work/:id", requireAuth, async (req, res) => {
    try {
      const dw = await storage.getDeferredWork(req.params.id);
      if (!dw) {
        return res.status(404).json({ message: "Deferred work not found" });
      }
      res.json(dw);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/deferred-work", requireAuth, async (req, res) => {
    try {
      const result = insertDeferredWorkSchema.safeParse({
        ...req.body,
        orgId: req.user!.orgId,
      });
      if (!result.success) {
        return res.status(400).json({ 
          message: fromZodError(result.error).toString() 
        });
      }
      const dw = await storage.createDeferredWork(result.data);
      res.status(201).json(dw);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/deferred-work/:id", requireAuth, async (req, res) => {
    try {
      const dw = await storage.updateDeferredWork(req.params.id, req.body);
      if (!dw) {
        return res.status(404).json({ message: "Deferred work not found" });
      }
      res.json(dw);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/deferred-work/:id", requireAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteDeferredWork(req.params.id);
      res.json({ success: deleted });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Workflows
  app.get("/api/workflows", requireAuth, async (req, res) => {
    try {
      const workflows = await storage.getWorkflowsByOrg(req.user!.orgId);
      res.json(workflows);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/workflows/:id", requireAuth, async (req, res) => {
    try {
      const workflow = await storage.getWorkflow(req.params.id, req.user!.orgId);
      if (!workflow) {
        return res.status(404).json({ message: "Workflow not found" });
      }
      res.json(workflow);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/workflows", requireAuth, async (req, res) => {
    try {
      const result = insertWorkflowSchema.safeParse({
        ...req.body,
        orgId: req.user!.orgId,
      });
      if (!result.success) {
        return res.status(400).json({ 
          message: fromZodError(result.error).toString() 
        });
      }
      const workflow = await storage.createWorkflow(result.data);
      res.status(201).json(workflow);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/workflows/:id", requireAuth, async (req, res) => {
    try {
      const workflow = await storage.updateWorkflow(req.params.id, req.user!.orgId, req.body);
      if (!workflow) {
        return res.status(404).json({ message: "Workflow not found" });
      }
      res.json(workflow);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Repair Orders
  app.get("/api/repair-orders", requireAuth, async (req, res) => {
    try {
      const { locationId } = req.query;
      let repairOrders;
      if (locationId && typeof locationId === 'string') {
        repairOrders = await storage.getRepairOrdersByLocation(locationId, req.user!.orgId);
      } else {
        repairOrders = await storage.getRepairOrdersByOrg(req.user!.orgId);
      }
      res.json(repairOrders);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/repair-orders/vehicle/:vehicleId", requireAuth, async (req, res) => {
    try {
      const ros = await storage.getRepairOrdersByVehicle(req.params.vehicleId, req.user!.orgId);
      res.json(ros);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/repair-orders/dashboard/:locationId", requireAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const ros = await storage.getDashboardRepairOrders(req.params.locationId, req.user!.orgId, limit);
      res.json(ros);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Search historical jobs by year/make/model and job name with AI similarity scoring
  // IMPORTANT: This route must come BEFORE /api/repair-orders/:id to avoid matching "similar-jobs" as an :id
  app.get("/api/repair-orders/similar-jobs", requireAuth, async (req, res) => {
    try {
      const { year, make, model, engine, jobName } = req.query;
      
      if (!year || !make || !model) {
        return res.status(400).json({ message: "year, make, and model are required" });
      }
      
      const targetYear = parseInt(year as string);
      const targetMake = (make as string).toLowerCase();
      const targetModel = (model as string).toLowerCase();
      const targetEngine = engine ? (engine as string).toLowerCase() : null;
      const searchTerm = (jobName as string || '').toLowerCase();
      
      // Query ROs with vehicle data using a proper join - get similar vehicles (same make/model, year within 5 years)
      const rosWithVehicles = await db
        .select({
          ro: repairOrders,
          vehicle: {
            year: vehicles.year,
            make: vehicles.make,
            model: vehicles.model,
            engineDisplacement: vehicles.engineDisplacement,
          },
        })
        .from(repairOrders)
        .innerJoin(vehicles, eq(repairOrders.vehicleId, vehicles.id))
        .where(
          and(
            eq(repairOrders.orgId, req.user!.orgId),
            sql`LOWER(${vehicles.make}) = ${targetMake}`,
            sql`LOWER(${vehicles.model}) = ${targetModel}`,
            gte(vehicles.year, targetYear - 5),
            lte(vehicles.year, targetYear + 5)
          )
        )
        .orderBy(sql`ABS(${vehicles.year} - ${targetYear})`);
      
      // Extract jobs and calculate similarity scores
      const jobsMap = new Map<string, {
        name: string;
        description?: string;
        lineItems: any[];
        roNumber: number;
        roId: string;
        createdAt: Date;
        count: number;
        similarity: number;
        vehicleScore: number;
        jobNameScore: number;
        vehicleYear: number;
        vehicleMake: string;
        vehicleModel: string;
        vehicleEngine: string | null;
        exactYearMatch: boolean;
        engineMatch: boolean | null;
        exactJobNameMatch: boolean;
      }>();
      
      // Split search term into words for flexible matching (filter out short/common words)
      const searchWords = searchTerm.split(/\s+/).filter(word => word.length > 2 && !['the', 'and', 'for', 'with'].includes(word));
      
      for (const { ro, vehicle } of rosWithVehicles) {
        const jobs = (ro.jobs as any[]) || [];
        for (const job of jobs) {
          const jobNameLower = (job.name || '').toLowerCase();
          
          // Skip empty jobs
          if (!job.name || !job.lineItems?.length) {
            continue;
          }
          
          // If search term provided, filter by word match (at least one significant word must match)
          if (searchWords.length > 0) {
            const hasWordMatch = searchWords.some(word => jobNameLower.includes(word));
            if (!hasWordMatch) {
              continue;
            }
          }
          
          // Calculate VEHICLE similarity score (up to 50 points)
          let vehicleScore = 25; // Base score for make/model match
          
          // Year matching (up to 15 more points)
          const yearDiff = Math.abs(vehicle.year - targetYear);
          if (yearDiff === 0) {
            vehicleScore += 15; // Exact year match
          } else if (yearDiff <= 2) {
            vehicleScore += 10; // Close year
          } else if (yearDiff <= 5) {
            vehicleScore += 5; // Within range
          }
          
          // Engine matching (up to 10 more points)
          let engineMatch: boolean | null = null;
          if (targetEngine && vehicle.engineDisplacement) {
            const vehicleEngine = vehicle.engineDisplacement.toLowerCase();
            if (vehicleEngine.includes(targetEngine) || targetEngine.includes(vehicleEngine)) {
              vehicleScore += 10;
              engineMatch = true;
            } else {
              vehicleScore -= 5;
              engineMatch = false;
            }
          }
          
          // Calculate JOB NAME similarity score (up to 50 points)
          let jobNameScore = 0;
          const exactJobNameMatch = jobNameLower === searchTerm;
          
          if (exactJobNameMatch) {
            // Exact match gets full points
            jobNameScore = 50;
          } else if (searchWords.length > 0) {
            // Calculate word overlap percentage
            const jobWords = jobNameLower.split(/\s+/).filter(word => word.length > 2 && !['the', 'and', 'for', 'with'].includes(word));
            const matchingWords = searchWords.filter(word => jobNameLower.includes(word));
            const overlapPercent = matchingWords.length / searchWords.length;
            jobNameScore = Math.round(overlapPercent * 40); // Up to 40 points for partial match
            
            // Bonus if job name contains search term as substring
            if (jobNameLower.includes(searchTerm) || searchTerm.includes(jobNameLower)) {
              jobNameScore = Math.min(jobNameScore + 10, 45);
            }
          }
          
          // Total similarity is vehicle + job name
          let similarity = vehicleScore + jobNameScore;
          
          // Use job name as key, keep the highest similarity version
          const existing = jobsMap.get(jobNameLower);
          if (!existing || similarity > existing.similarity || 
              (similarity === existing.similarity && new Date(ro.createdAt) > new Date(existing.createdAt))) {
            jobsMap.set(jobNameLower, {
              name: job.name,
              description: job.description,
              lineItems: job.lineItems || [],
              roNumber: ro.roNumber,
              roId: ro.id,
              createdAt: ro.createdAt,
              count: (existing?.count || 0) + 1,
              similarity,
              vehicleScore,
              jobNameScore,
              vehicleYear: vehicle.year,
              vehicleMake: vehicle.make,
              vehicleModel: vehicle.model,
              vehicleEngine: vehicle.engineDisplacement,
              exactYearMatch: yearDiff === 0,
              engineMatch,
              exactJobNameMatch,
            });
          } else {
            existing.count++;
          }
        }
      }
      
      // Convert to array and sort by similarity (highest first), then by count
      const results = Array.from(jobsMap.values())
        .sort((a, b) => b.similarity - a.similarity || b.count - a.count)
        .slice(0, 20);
      
      // AI Engine Fallback: If few/no direct matches and engine info available, search by engine
      let aiEngineMatches: Array<{
        name: string;
        description?: string;
        lineItems: any[];
        roNumber: number;
        roId: string;
        vehicleYear: number;
        vehicleMake: string;
        vehicleModel: string;
        vehicleEngine: string | null;
        aiRelevanceScore: number;
        aiReason: string;
        isAiMatch: boolean;
      }> = [];
      
      // AI Engine Fallback: runs when few results and search term provided
      // Works with or without engine data - AI will find relevant jobs based on job type
      if (results.length < 3 && searchTerm) {
        // Query ROs that have jobs matching the search term directly in SQL
        // This is more efficient than fetching 200 random ROs and filtering
        const searchPattern = `%${searchTerm.toLowerCase()}%`;
        const engineCandidates = await db
          .select({
            ro: repairOrders,
            vehicle: {
              year: vehicles.year,
              make: vehicles.make,
              model: vehicles.model,
              engineDisplacement: vehicles.engineDisplacement,
            },
          })
          .from(repairOrders)
          .innerJoin(vehicles, eq(repairOrders.vehicleId, vehicles.id))
          .where(
            and(
              eq(repairOrders.orgId, req.user!.orgId),
              // Exclude already-matched make/model to find jobs from different vehicles
              sql`NOT (LOWER(${vehicles.make}) = ${targetMake} AND LOWER(${vehicles.model}) = ${targetModel})`,
              // Filter to ROs that have at least one job matching the search term
              sql`EXISTS (
                SELECT 1 FROM jsonb_array_elements(${repairOrders.jobs}) AS j
                WHERE LOWER(j->>'name') LIKE ${searchPattern}
                AND jsonb_array_length(j->'lineItems') > 0
              )`
            )
          )
          .limit(50);
        
        // Extract jobs that match the search term
        const candidateJobs: Array<{
          name: string;
          description?: string;
          vehicleYear: number;
          vehicleMake: string;
          vehicleModel: string;
          vehicleEngine: string | null;
          roId: string;
          roNumber: number;
          lineItems: any[];
        }> = [];
        
        for (const { ro, vehicle } of engineCandidates) {
          const jobs = (ro.jobs as any[]) || [];
          for (const job of jobs) {
            const jobNameLower = (job.name || '').toLowerCase();
            if (!job.name || !job.lineItems?.length) continue;
            
            // Check if job name matches search term
            if (searchWords.length > 0) {
              const hasWordMatch = searchWords.some(word => jobNameLower.includes(word));
              if (!hasWordMatch) continue;
            }
            
            candidateJobs.push({
              name: job.name,
              description: job.description,
              vehicleYear: vehicle.year,
              vehicleMake: vehicle.make,
              vehicleModel: vehicle.model,
              vehicleEngine: vehicle.engineDisplacement,
              roId: ro.id,
              roNumber: ro.roNumber,
              lineItems: job.lineItems || [],
            });
          }
        }
        
        // Use AI to find engine-compatible jobs
        if (candidateJobs.length > 0) {
          try {
            const aiMatches = await findEngineCompatibleJobs(
              { 
                year: targetYear, 
                make: make as string, 
                model: model as string, 
                engine: (engine as string) || '' 
              },
              searchTerm,
              candidateJobs
            );
            
            // Map AI results back to full job data, normalizing fields for UI compatibility
            const seenJobKeys = new Set<string>();
            for (const match of aiMatches) {
              const candidate = candidateJobs.find(j => j.roId === match.roId && j.name === match.jobName);
              if (candidate) {
                // Prevent duplicates
                const jobKey = `${candidate.name.toLowerCase()}-${candidate.roId}`;
                if (seenJobKeys.has(jobKey)) continue;
                seenJobKeys.add(jobKey);
                
                aiEngineMatches.push({
                  name: candidate.name,
                  description: candidate.description,
                  lineItems: candidate.lineItems,
                  roNumber: candidate.roNumber,
                  roId: candidate.roId,
                  vehicleYear: candidate.vehicleYear,
                  vehicleMake: candidate.vehicleMake,
                  vehicleModel: candidate.vehicleModel,
                  vehicleEngine: candidate.vehicleEngine,
                  aiRelevanceScore: match.relevanceScore,
                  aiReason: match.reason,
                  isAiMatch: true,
                });
              }
            }
          } catch (err) {
            console.error('AI engine matching failed:', err);
          }
        }
      }
      
      res.json({
        vehicleMatch: `${year} ${make} ${model}`,
        matchingROs: rosWithVehicles.length,
        jobs: results,
        aiEngineMatches,
      });
    } catch (error: any) {
      console.error('Similar jobs error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/repair-orders/:id", requireAuth, async (req, res) => {
    try {
      const ro = await storage.getRepairOrder(req.params.id, req.user!.orgId);
      if (!ro) {
        return res.status(404).json({ message: "Repair order not found" });
      }
      res.json(ro);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/repair-orders", requireAuth, async (req, res) => {
    try {
      const result = insertRepairOrderSchema.safeParse({
        ...req.body,
        orgId: req.user!.orgId,
      });
      if (!result.success) {
        return res.status(400).json({ 
          message: fromZodError(result.error).toString() 
        });
      }
      const ro = await storage.createRepairOrder(result.data);
      res.status(201).json(ro);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/repair-orders/:id", requireAuth, async (req, res) => {
    try {
      const updates = { ...req.body };
      
      // Auto-set completedAt when status changes to 'completed'
      if (updates.status === 'completed' && !updates.completedAt) {
        updates.completedAt = new Date();
      }
      
      const ro = await storage.updateRepairOrder(req.params.id, req.user!.orgId, updates);
      if (!ro) {
        return res.status(404).json({ message: "Repair order not found" });
      }
      res.json(ro);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==========================================
  // JOB APPROVALS
  // ==========================================
  
  // Get all approvals for a repair order
  app.get("/api/repair-orders/:id/approvals", requireAuth, async (req, res) => {
    try {
      const ro = await storage.getRepairOrder(req.params.id, req.user!.orgId);
      if (!ro) {
        return res.status(404).json({ message: "Repair order not found" });
      }
      const approvals = await storage.getJobApprovalsByRO(req.params.id);
      res.json(approvals);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Approve or decline a job
  app.post("/api/repair-orders/:id/jobs/:jobId/approval", requireAuth, async (req, res) => {
    try {
      const { status, method, declinedReason, notes } = req.body;
      
      if (!status || !['APPROVED', 'DECLINED'].includes(status)) {
        return res.status(400).json({ message: "status must be 'APPROVED' or 'DECLINED'" });
      }
      
      if (status === 'APPROVED' && !method) {
        return res.status(400).json({ message: "method is required for approval" });
      }
      
      const ro = await storage.getRepairOrder(req.params.id, req.user!.orgId);
      if (!ro) {
        return res.status(404).json({ message: "Repair order not found" });
      }
      
      // Check if job exists in the RO
      const jobs = (ro.jobs as any[]) || [];
      const job = jobs.find(j => j.id === req.params.jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found in repair order" });
      }
      
      // Check for existing approval
      let approval = await storage.getJobApprovalByJob(req.params.id, req.params.jobId);
      
      if (approval) {
        // Update existing approval
        approval = await storage.updateJobApproval(approval.id, {
          status,
          method: status === 'APPROVED' ? method : null,
          approvedAt: status === 'APPROVED' ? new Date() : null,
          declinedReason: status === 'DECLINED' ? declinedReason : null,
          approvedByUserId: req.user!.id,
          notes,
        });
      } else {
        // Create new approval
        approval = await storage.createJobApproval({
          orgId: req.user!.orgId,
          repairOrderId: req.params.id,
          jobId: req.params.jobId,
          status,
          method: status === 'APPROVED' ? method : null,
          approvedAt: status === 'APPROVED' ? new Date() : null,
          declinedReason: status === 'DECLINED' ? declinedReason : null,
          approvedByUserId: req.user!.id,
          notes,
        });
      }
      
      // Also update the lineItems.approved flag in the RO jobs array
      const updatedJobs = jobs.map(j => {
        if (j.id === req.params.jobId) {
          return {
            ...j,
            lineItems: (j.lineItems || []).map((li: any) => ({
              ...li,
              approved: status === 'APPROVED',
            })),
          };
        }
        return j;
      });
      
      await storage.updateRepairOrder(req.params.id, req.user!.orgId, { jobs: updatedJobs as any });
      
      // If job was declined, create deferred work for future follow-up
      if (status === 'DECLINED') {
        try {
          // Calculate totals from job line items
          const lineItems = job.lineItems || [];
          let estimatedPrice = 0;
          let laborHours = 0;
          
          for (const li of lineItems) {
            const qty = parseFloat(li.quantity) || 1;
            const price = parseFloat(li.unitPrice) || 0;
            estimatedPrice += qty * price;
            
            if (li.type === 'LABOR') {
              laborHours += qty;
            }
          }
          
          // Check if deferred work already exists for this job on this vehicle
          const existingDeferred = await storage.getDeferredWorkByVehicle(ro.vehicleId, req.user!.orgId);
          const existingEntry = existingDeferred.find(d => 
            d.originalRoId === ro.id && 
            d.serviceName.toLowerCase() === (job.name || '').toLowerCase() &&
            d.status === 'PENDING'
          );
          
          if (existingEntry) {
            // Update existing deferred work
            await storage.updateDeferredWork(existingEntry.id, req.user!.orgId, {
              reason: declinedReason || 'Customer declined',
              estimatedPrice: estimatedPrice.toFixed(2),
              laborHours: laborHours.toFixed(2),
              declinedAt: new Date(),
              notes: notes || existingEntry.notes,
            });
          } else {
            // Create new deferred work entry
            await storage.createDeferredWork({
              orgId: req.user!.orgId,
              locationId: ro.locationId,
              vehicleId: ro.vehicleId,
              customerId: ro.customerId,
              originalRoId: ro.id,
              serviceName: job.name || 'Service',
              serviceDescription: job.description || `Declined from RO #${ro.roNumber}`,
              estimatedPrice: estimatedPrice.toFixed(2),
              laborHours: laborHours > 0 ? laborHours.toFixed(2) : null,
              priority: 'NORMAL',
              reason: declinedReason || 'Customer declined',
              notes: notes || null,
              status: 'PENDING',
              declinedAt: new Date(),
            });
          }
        } catch (deferredError: any) {
          console.error('Failed to create deferred work:', deferredError);
          // Don't fail the main approval - deferred work is secondary
        }
      }
      
      res.json(approval);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Send virtual signature request via SMS
  app.post("/api/repair-orders/:id/jobs/:jobId/send-signature-request", requireAuth, async (req, res) => {
    try {
      const { phoneNumber, customerName } = req.body;
      
      if (!phoneNumber) {
        return res.status(400).json({ message: "phoneNumber is required" });
      }
      
      const ro = await storage.getRepairOrder(req.params.id, req.user!.orgId);
      if (!ro) {
        return res.status(404).json({ message: "Repair order not found" });
      }
      
      const jobs = (ro.jobs as any[]) || [];
      const job = jobs.find(j => j.id === req.params.jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Generate unique token
      const token = `sig_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      // Create signature token
      const sigToken = await storage.createSignatureToken({
        orgId: req.user!.orgId,
        repairOrderId: req.params.id,
        jobId: req.params.jobId,
        token,
        expiresAt,
        signerName: customerName,
        signerContact: phoneNumber,
      });
      
      // Create or update job approval as pending signature
      let approval = await storage.getJobApprovalByJob(req.params.id, req.params.jobId);
      if (approval) {
        await storage.updateJobApproval(approval.id, {
          status: 'PENDING',
          method: 'VIRTUAL_SIGNATURE',
          signatureTokenId: sigToken.id,
        });
      } else {
        await storage.createJobApproval({
          orgId: req.user!.orgId,
          repairOrderId: req.params.id,
          jobId: req.params.jobId,
          status: 'PENDING',
          method: 'VIRTUAL_SIGNATURE',
          signatureTokenId: sigToken.id,
          approvedByUserId: req.user!.id,
        });
      }
      
      // Build the signature URL
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
      const signatureUrl = `${baseUrl}/sign/${token}`;
      
      // Calculate job total for the message
      const jobTotal = (job.lineItems || []).reduce((sum: number, li: any) => 
        sum + (parseFloat(li.quantity) || 1) * (parseFloat(li.unitPrice) || 0), 0
      );
      
      // Try to send SMS via Telnyx
      if (process.env.TELNYX_API_KEY && process.env.TELNYX_PHONE_NUMBER) {
        try {
          const Telnyx = require('telnyx');
          const telnyx = Telnyx(process.env.TELNYX_API_KEY);
          
          await telnyx.messages.create({
            from: process.env.TELNYX_PHONE_NUMBER,
            to: phoneNumber,
            text: `Please approve your repair: ${job.name} ($${jobTotal.toFixed(2)}). Click to sign: ${signatureUrl}`,
          });
          
          res.json({ 
            success: true, 
            message: "Signature request sent via SMS",
            signatureUrl,
            tokenId: sigToken.id,
          });
        } catch (smsError: any) {
          console.error('SMS send error:', smsError);
          res.json({
            success: true,
            message: "Signature link created but SMS failed to send",
            signatureUrl,
            tokenId: sigToken.id,
            smsError: smsError.message,
          });
        }
      } else {
        res.json({
          success: true,
          message: "Signature link created (SMS not configured)",
          signatureUrl,
          tokenId: sigToken.id,
        });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Public endpoint - get signature page data (no auth required)
  app.get("/api/public/signature/:token", async (req, res) => {
    try {
      const sigToken = await storage.getSignatureTokenByToken(req.params.token);
      if (!sigToken) {
        return res.status(404).json({ message: "Signature link not found or expired" });
      }
      
      if (new Date() > sigToken.expiresAt) {
        return res.status(410).json({ message: "Signature link has expired" });
      }
      
      if (sigToken.signedAt) {
        return res.status(410).json({ message: "This authorization has already been signed" });
      }
      
      // Get RO and job details
      const ro = await storage.getRepairOrderById(sigToken.repairOrderId);
      if (!ro) {
        return res.status(404).json({ message: "Repair order not found" });
      }
      
      const jobs = (ro.jobs as any[]) || [];
      const job = jobs.find(j => j.id === sigToken.jobId);
      
      // Get customer and vehicle info
      const customer = await storage.getCustomerById(ro.customerId);
      const vehicle = await storage.getVehicleById(ro.vehicleId);
      
      // Get organization for branding
      const org = await storage.getOrganization(sigToken.orgId);
      
      res.json({
        jobName: job?.name || 'Service',
        jobDescription: job?.description,
        lineItems: job?.lineItems || [],
        total: (job?.lineItems || []).reduce((sum: number, li: any) => 
          sum + (parseFloat(li.quantity) || 1) * (parseFloat(li.unitPrice) || 0), 0
        ),
        customerName: customer ? `${customer.firstName} ${customer.lastName}` : sigToken.signerName,
        vehicleInfo: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : null,
        roNumber: ro.roNumber,
        shopName: org?.name || 'Auto Shop',
        expiresAt: sigToken.expiresAt,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Public endpoint - submit signature (no auth required)
  app.post("/api/public/signature/:token", async (req, res) => {
    try {
      const { signatureData, signerName } = req.body;
      
      if (!signatureData) {
        return res.status(400).json({ message: "signatureData is required" });
      }
      
      const sigToken = await storage.getSignatureTokenByToken(req.params.token);
      if (!sigToken) {
        return res.status(404).json({ message: "Signature link not found" });
      }
      
      if (new Date() > sigToken.expiresAt) {
        return res.status(410).json({ message: "Signature link has expired" });
      }
      
      if (sigToken.signedAt) {
        return res.status(410).json({ message: "Already signed" });
      }
      
      // Update signature token
      await storage.updateSignatureToken(sigToken.id, {
        signedAt: new Date(),
        signerName: signerName || sigToken.signerName,
        signatureImageUrl: signatureData, // Base64 data URL
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
      });
      
      // Update job approval to approved
      const approval = await storage.getJobApprovalByJob(sigToken.repairOrderId, sigToken.jobId);
      if (approval) {
        await storage.updateJobApproval(approval.id, {
          status: 'APPROVED',
          approvedAt: new Date(),
        });
      }
      
      // Update the RO jobs to mark line items as approved
      const ro = await storage.getRepairOrderById(sigToken.repairOrderId);
      if (ro) {
        const jobs = (ro.jobs as any[]) || [];
        const updatedJobs = jobs.map(j => {
          if (j.id === sigToken.jobId) {
            return {
              ...j,
              lineItems: (j.lineItems || []).map((li: any) => ({
                ...li,
                approved: true,
              })),
            };
          }
          return j;
        });
        await storage.updateRepairOrder(sigToken.repairOrderId, sigToken.orgId, { jobs: updatedJobs as any });
      }
      
      res.json({ success: true, message: "Authorization signed successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Inventory
  app.get("/api/inventory", requireAuth, async (req, res) => {
    try {
      const { locationId, search } = req.query;
      if (!locationId || typeof locationId !== 'string') {
        return res.status(400).json({ message: "locationId is required" });
      }
      
      let items;
      if (search && typeof search === 'string') {
        items = await storage.searchInventory(locationId, req.user!.orgId, search);
      } else {
        items = await storage.getInventoryByLocation(locationId, req.user!.orgId);
      }
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/inventory/:id", requireAuth, async (req, res) => {
    try {
      const item = await storage.getInventoryItem(req.params.id, req.user!.orgId);
      if (!item) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      res.json(item);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/inventory", requireAuth, async (req, res) => {
    try {
      const result = insertInventoryItemSchema.safeParse({
        ...req.body,
        orgId: req.user!.orgId,
      });
      if (!result.success) {
        return res.status(400).json({ 
          message: fromZodError(result.error).toString() 
        });
      }
      const item = await storage.createInventoryItem(result.data);
      res.status(201).json(item);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/inventory/:id", requireAuth, async (req, res) => {
    try {
      const item = await storage.updateInventoryItem(req.params.id, req.user!.orgId, req.body);
      if (!item) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      res.json(item);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/inventory/:id", requireAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteInventoryItem(req.params.id, req.user!.orgId);
      if (!deleted) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/inventory/low-stock/:locationId", requireAuth, async (req, res) => {
    try {
      const items = await storage.getLowStockItems(req.params.locationId, req.user!.orgId);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/inventory/:id/transactions", requireAuth, async (req, res) => {
    try {
      const item = await storage.getInventoryItem(req.params.id, req.user!.orgId);
      if (!item) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      const transactions = await storage.getStockTransactions(req.params.id);
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/inventory/:id/adjust", requireAuth, async (req, res) => {
    try {
      const { type, quantity, notes } = req.body;
      if (!type || quantity === undefined) {
        return res.status(400).json({ message: "type and quantity are required" });
      }
      const item = await storage.adjustInventoryQuantity(
        req.params.id, 
        req.user!.orgId, 
        { type, quantity, notes, userId: req.user!.id }
      );
      if (!item) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      res.json(item);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Inspection Templates
  app.get("/api/inspection-templates", requireAuth, async (req, res) => {
    try {
      const templates = await storage.getInspectionTemplatesByOrg(req.user!.orgId);
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/inspection-templates", requireAuth, async (req, res) => {
    try {
      const result = insertInspectionTemplateSchema.safeParse({
        ...req.body,
        orgId: req.user!.orgId,
      });
      if (!result.success) {
        return res.status(400).json({ 
          message: fromZodError(result.error).toString() 
        });
      }
      const template = await storage.createInspectionTemplate(result.data);
      res.status(201).json(template);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/inspection-templates/:id", requireAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteInspectionTemplate(req.params.id, req.user!.orgId);
      if (!deleted) {
        return res.status(404).json({ message: "Template not found or access denied" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Inspections
  app.get("/api/inspections/ro/:roId", requireAuth, async (req, res) => {
    try {
      const repairOrder = await storage.getRepairOrder(req.params.roId, req.user!.orgId);
      if (!repairOrder) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const inspections = await storage.getInspectionsByRO(req.params.roId);
      res.json(inspections);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/inspections", requireAuth, async (req, res) => {
    try {
      const result = insertInspectionSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: fromZodError(result.error).toString() 
        });
      }
      
      const repairOrder = await storage.getRepairOrder(result.data.roId, req.user!.orgId);
      if (!repairOrder) {
        return res.status(403).json({ message: "Access denied - repair order not found in your organization" });
      }
      
      const template = await storage.getInspectionTemplate(result.data.templateId, req.user!.orgId);
      if (!template) {
        return res.status(403).json({ message: "Access denied - inspection template not found in your organization" });
      }
      
      const technician = await storage.getUser(result.data.technicianId);
      if (!technician || technician.orgId !== req.user!.orgId) {
        return res.status(403).json({ message: "Access denied - technician not found in your organization" });
      }
      
      const inspection = await storage.createInspection(result.data);
      res.status(201).json(inspection);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/inspections/:id", requireAuth, async (req, res) => {
    try {
      const { items, status } = req.body;
      const updates: Record<string, unknown> = {};
      
      if (items !== undefined) updates.items = items;
      // Convert status: 'COMPLETED' to completedAt timestamp
      if (status === 'COMPLETED') {
        updates.completedAt = new Date();
      }
      
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No valid update fields provided" });
      }
      
      const updatedInspection = await storage.updateInspectionForOrg(req.params.id, req.user!.orgId, updates);
      if (!updatedInspection) {
        return res.status(404).json({ message: "Inspection not found or access denied" });
      }
      res.json(updatedInspection);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/inspections/:id/share", requireAuth, async (req, res) => {
    try {
      const inspection = await storage.getInspectionForOrg(req.params.id, req.user!.orgId);
      if (!inspection) {
        return res.status(404).json({ message: "Inspection not found or access denied" });
      }
      
      if (inspection.shareToken && inspection.customerViewable) {
        return res.json({ 
          shareToken: inspection.shareToken,
          shareUrl: `/inspection/${inspection.shareToken}`
        });
      }
      
      const shareToken = crypto.randomUUID();
      const updated = await storage.updateInspectionForOrg(req.params.id, req.user!.orgId, {
        shareToken,
        customerViewable: true,
      });
      
      res.json({ 
        shareToken: updated?.shareToken,
        shareUrl: `/inspection/${updated?.shareToken}`
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Send inspection report via SMS
  app.post("/api/inspections/:id/send-sms", requireAuth, async (req, res) => {
    try {
      const { phoneNumber } = req.body;
      if (!phoneNumber) {
        return res.status(400).json({ message: "Phone number is required" });
      }

      const inspection = await storage.getInspectionForOrg(req.params.id, req.user!.orgId);
      if (!inspection) {
        return res.status(404).json({ message: "Inspection not found or access denied" });
      }

      // Ensure inspection has a share token
      let shareToken = inspection.shareToken;
      if (!shareToken) {
        shareToken = crypto.randomUUID();
        await storage.updateInspectionForOrg(req.params.id, req.user!.orgId, {
          shareToken,
          customerViewable: true,
        });
      }

      // Get customer and vehicle info
      const repairOrder = await storage.getRepairOrderById(inspection.roId);
      const customer = repairOrder?.customerId ? await storage.getCustomer(repairOrder.customerId, req.user!.orgId) : null;
      const vehicle = repairOrder?.vehicleId ? await storage.getVehicle(repairOrder.vehicleId) : null;
      const location = repairOrder?.locationId ? await storage.getLocation(repairOrder.locationId) : null;

      const shareUrl = `${req.protocol}://${req.get('host')}/inspection/${shareToken}`;
      const vehicleInfo = vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'vehicle';
      const customerName = customer ? customer.firstName : 'Customer';
      const shopName = location?.name || 'Our Shop';

      const message = generateInspectionSMS({
        customerName,
        vehicleInfo,
        shareUrl,
        shopName,
      });

      const result = await sendSMS({ to: phoneNumber, message });
      
      if (result.success) {
        res.json({ success: true, messageId: result.messageId });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error: any) {
      console.error('Send SMS error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Send inspection report via Email
  app.post("/api/inspections/:id/send-email", requireAuth, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email address is required" });
      }

      const inspection = await storage.getInspectionForOrg(req.params.id, req.user!.orgId);
      if (!inspection) {
        return res.status(404).json({ message: "Inspection not found or access denied" });
      }

      // Ensure inspection has a share token
      let shareToken = inspection.shareToken;
      if (!shareToken) {
        shareToken = crypto.randomUUID();
        await storage.updateInspectionForOrg(req.params.id, req.user!.orgId, {
          shareToken,
          customerViewable: true,
        });
      }

      // Get customer and vehicle info
      const repairOrder = await storage.getRepairOrderById(inspection.roId);
      const customer = repairOrder?.customerId ? await storage.getCustomer(repairOrder.customerId, req.user!.orgId) : null;
      const vehicle = repairOrder?.vehicleId ? await storage.getVehicle(repairOrder.vehicleId) : null;
      const location = repairOrder?.locationId ? await storage.getLocation(repairOrder.locationId) : null;

      const shareUrl = `${req.protocol}://${req.get('host')}/inspection/${shareToken}`;
      const vehicleInfo = vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'vehicle';
      const customerName = customer ? customer.firstName : 'Customer';
      const shopName = location?.name || 'Our Shop';

      const { subject, html } = generateInspectionEmail({
        customerName,
        vehicleInfo,
        shareUrl,
        shopName,
      });

      const result = await sendEmail({ to: email, subject, html });
      
      if (result.success) {
        res.json({ success: true, messageId: result.messageId });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error: any) {
      console.error('Send email error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Check messaging configuration status
  app.get("/api/messaging/status", requireAuth, async (req, res) => {
    res.json(isMessagingConfigured());
  });

  // Get single inspection
  app.get("/api/inspections/:id", requireAuth, async (req, res) => {
    try {
      const inspection = await storage.getInspectionForOrg(req.params.id, req.user!.orgId);
      if (!inspection) {
        return res.status(404).json({ message: "Inspection not found or access denied" });
      }
      res.json(inspection);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete inspection
  app.delete("/api/inspections/:id", requireAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteInspectionForOrg(req.params.id, req.user!.orgId);
      if (!deleted) {
        return res.status(404).json({ message: "Inspection not found or access denied" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // DVI AI - Generate finding/recommendation for inspection item
  app.post("/api/inspections/ai/finding", requireAuth, async (req, res) => {
    try {
      const { itemLabel, category, status, techNotes, vehicle } = req.body;
      
      if (!itemLabel || !category || !status || !vehicle) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const result = await generateInspectionFinding(
        { itemLabel, category, status, techNotes },
        vehicle,
        techNotes
      );
      
      res.json(result);
    } catch (error: any) {
      console.error('DVI AI finding error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // DVI AI - Generate inspection summary
  app.post("/api/inspections/ai/summary", requireAuth, async (req, res) => {
    try {
      const { items, vehicle } = req.body;
      
      if (!items || !vehicle) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const summary = await generateInspectionSummary(items, vehicle);
      res.json({ summary });
    } catch (error: any) {
      console.error('DVI AI summary error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // DVI AI - Generate jobs from inspection findings
  app.post("/api/inspections/ai/generate-jobs", requireAuth, async (req, res) => {
    try {
      const { inspectionId, laborRate } = req.body;
      
      if (!inspectionId) {
        return res.status(400).json({ message: "Inspection ID is required" });
      }

      // Get the inspection with all related data
      const inspection = await storage.getInspectionById(inspectionId);
      if (!inspection) {
        return res.status(404).json({ message: "Inspection not found" });
      }

      // Get the RO and vehicle info
      const repairOrder = await storage.getRepairOrderById(inspection.roId);
      if (!repairOrder) {
        return res.status(404).json({ message: "Repair order not found" });
      }

      const vehicle = repairOrder.vehicleId 
        ? await storage.getVehicle(repairOrder.vehicleId)
        : null;
      
      if (!vehicle) {
        return res.status(400).json({ message: "Vehicle information not found" });
      }

      // Get the template to get item labels
      const template = await storage.getInspectionTemplateById(inspection.templateId);
      const templateItems = (template?.items as any[]) || [];
      const templateItemMap = new Map(templateItems.map(ti => [ti.id, ti]));

      // Filter for RED and YELLOW items only
      const items = (inspection.items as any[]) || [];
      const findings = items
        .filter(item => item.status === 'RED' || item.status === 'YELLOW')
        .map(item => {
          const templateItem = templateItemMap.get(item.itemId);
          return {
            itemLabel: templateItem?.label || item.itemId,
            category: templateItem?.category || 'General',
            status: item.status as 'RED' | 'YELLOW',
            finding: item.finding,
            recommendation: item.recommendation,
          };
        });

      if (findings.length === 0) {
        return res.json({ 
          jobs: [], 
          summary: 'No items requiring attention were found in this inspection.' 
        });
      }

      const result = await generateJobsFromDVI(
        findings,
        { 
          year: vehicle.year, 
          make: vehicle.make, 
          model: vehicle.model,
          mileage: vehicle.mileage || repairOrder.odometerIn || null,
        },
        laborRate || 150
      );

      res.json(result);
    } catch (error: any) {
      console.error('DVI AI generate jobs error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get inspection by share token (public route for customer view)
  app.get("/api/inspections/shared/:token", async (req, res) => {
    try {
      const inspection = await storage.getInspectionByShareToken(req.params.token);
      if (!inspection || !inspection.customerViewable) {
        return res.status(404).json({ message: "Inspection not found" });
      }
      
      const repairOrder = await storage.getRepairOrderById(inspection.roId);
      const vehicle = repairOrder?.vehicleId ? await storage.getVehicle(repairOrder.vehicleId) : null;
      const template = await storage.getInspectionTemplateById(inspection.templateId);
      
      const sanitizedResponse = {
        id: inspection.id,
        status: inspection.status,
        items: (inspection.items as any[])?.map(item => ({
          itemId: item.itemId,
          status: item.status,
          finding: item.finding,
          recommendation: item.recommendation,
        })) || [],
        createdAt: inspection.createdAt,
        completedAt: inspection.completedAt,
        repairOrder: repairOrder ? {
          roNumber: repairOrder.roNumber,
          odometerIn: repairOrder.odometerIn,
          vehicle: vehicle ? {
            year: vehicle.year,
            make: vehicle.make,
            model: vehicle.model,
          } : undefined,
        } : undefined,
        template: template ? {
          name: template.name,
          items: template.items,
        } : undefined,
      };
      
      res.json(sanitizedResponse);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // PUBLIC SELF CHECK-IN ROUTES
  
  // Get location info for self check-in (public, requires token)
  app.get("/api/public/location/:locationId/:token", async (req, res) => {
    try {
      const location = await storage.getLocation(req.params.locationId);
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }
      
      // Validate check-in token
      if (!location.checkInToken || location.checkInToken !== req.params.token) {
        return res.status(403).json({ message: "Invalid check-in link" });
      }
      
      res.json({
        id: location.id,
        name: location.name,
        address: location.address,
        phone: location.phone,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Customer lookup for self check-in (public, requires token)
  app.post("/api/public/customer-lookup", async (req, res) => {
    try {
      const { locationId, token, method, value } = req.body;
      
      if (!locationId || !token || !method || !value) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      if (typeof locationId !== 'string' || typeof token !== 'string' || typeof method !== 'string' || typeof value !== 'string') {
        return res.status(400).json({ message: "Invalid field types" });
      }
      
      if (!['phone', 'vin'].includes(method)) {
        return res.status(400).json({ message: "Invalid lookup method" });
      }

      const location = await storage.getLocation(locationId);
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }
      
      // Validate check-in token
      if (!location.checkInToken || location.checkInToken !== token) {
        return res.status(403).json({ message: "Invalid check-in link" });
      }

      if (method === 'phone') {
        // Look up customer by phone (scoped to organization)
        const customers = await storage.getCustomersByOrg(location.organizationId);
        const customer = customers.find(c => 
          c.phone?.replace(/\D/g, '') === value.replace(/\D/g, '')
        );
        
        if (customer) {
          // Find their most recent vehicle
          const vehicles = await storage.getVehiclesByCustomer(customer.id);
          const vehicle = vehicles[0];
          
          return res.json({
            customer: {
              id: customer.id,
              firstName: customer.firstName,
              lastName: customer.lastName,
              phone: customer.phone,
              email: customer.email,
            },
            vehicle: vehicle ? {
              id: vehicle.id,
              vin: vehicle.vin,
              year: vehicle.year,
              make: vehicle.make,
              model: vehicle.model,
              trim: vehicle.trim,
            } : null,
          });
        }
        
        return res.status(404).json({ message: "No customer found with that phone number" });
      }
      
      if (method === 'vin') {
        // First try to find existing vehicle (scoped to organization)
        const vehicles = await storage.getVehiclesByOrg(location.organizationId);
        const existingVehicle = vehicles.find(v => v.vin?.toUpperCase() === value.toUpperCase());
        
        if (existingVehicle) {
          const customer = await storage.getCustomer(existingVehicle.customerId);
          return res.json({
            customer: customer ? {
              id: customer.id,
              firstName: customer.firstName,
              lastName: customer.lastName,
              phone: customer.phone,
              email: customer.email,
            } : null,
            vehicle: {
              id: existingVehicle.id,
              vin: existingVehicle.vin,
              year: existingVehicle.year,
              make: existingVehicle.make,
              model: existingVehicle.model,
              trim: existingVehicle.trim,
            },
          });
        }
        
        // Decode VIN for new vehicles
        const decoded = await decodeVIN(value);
        if (decoded) {
          return res.json({
            customer: null,
            vehicle: null,
            decoded: {
              year: decoded.year,
              make: decoded.make,
              model: decoded.model,
              trim: decoded.trim,
            },
          });
        }
        
        return res.status(404).json({ message: "Could not decode VIN" });
      }
      
      return res.status(400).json({ message: "Invalid lookup method" });
    } catch (error: any) {
      console.error('Customer lookup error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Self check-in submission (public, requires token)
  app.post("/api/public/self-checkin", async (req, res) => {
    try {
      const { locationId, token, customer, vehicle, serviceDescription } = req.body;
      
      if (!locationId || !token || !customer || !vehicle) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      if (typeof locationId !== 'string' || typeof token !== 'string') {
        return res.status(400).json({ message: "Invalid location ID or token" });
      }
      
      if (!customer.firstName || !customer.lastName || !customer.phone) {
        return res.status(400).json({ message: "Customer name and phone are required" });
      }
      
      if (typeof customer.firstName !== 'string' || typeof customer.lastName !== 'string' || typeof customer.phone !== 'string') {
        return res.status(400).json({ message: "Invalid customer data" });
      }
      
      if (!vehicle.vin || !vehicle.year || !vehicle.make || !vehicle.model) {
        return res.status(400).json({ message: "Vehicle VIN, year, make, and model are required" });
      }

      const location = await storage.getLocation(locationId);
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }
      
      // Validate check-in token
      if (!location.checkInToken || location.checkInToken !== token) {
        return res.status(403).json({ message: "Invalid check-in link" });
      }

      // Validate customer ID belongs to this location AND organization if provided
      let customerId = customer.id;
      if (customerId) {
        const existingCustomer = await storage.getCustomer(customerId);
        if (!existingCustomer || 
            existingCustomer.locationId !== locationId || 
            existingCustomer.organizationId !== location.organizationId) {
          return res.status(400).json({ message: "Invalid customer" });
        }
      } else {
        const newCustomer = await storage.createCustomer({
          locationId,
          organizationId: location.organizationId,
          firstName: String(customer.firstName).trim().substring(0, 100),
          lastName: String(customer.lastName).trim().substring(0, 100),
          phone: String(customer.phone).replace(/[^\d+\-() ]/g, '').substring(0, 20),
          email: customer.email ? String(customer.email).trim().substring(0, 255) : null,
        });
        customerId = newCustomer.id;
      }

      // Validate vehicle ID belongs to this location AND organization if provided
      let vehicleId = vehicle.id;
      if (vehicleId) {
        const existingVehicle = await storage.getVehicle(vehicleId);
        if (!existingVehicle || 
            existingVehicle.locationId !== locationId || 
            existingVehicle.organizationId !== location.organizationId ||
            existingVehicle.customerId !== customerId) {
          return res.status(400).json({ message: "Invalid vehicle" });
        }
      } else {
        const newVehicle = await storage.createVehicle({
          customerId,
          locationId,
          organizationId: location.organizationId,
          vin: String(vehicle.vin).toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 17),
          year: String(vehicle.year).substring(0, 4),
          make: String(vehicle.make).trim().substring(0, 50),
          model: String(vehicle.model).trim().substring(0, 50),
          trim: vehicle.trim ? String(vehicle.trim).trim().substring(0, 50) : null,
        });
        vehicleId = newVehicle.id;
      }

      // Generate RO number
      const existingROs = await storage.getRepairOrdersByLocation(locationId);
      const roCount = existingROs.length + 1;
      const roNumber = `RO-${String(roCount).padStart(5, '0')}`;

      // Create repair order with sanitized notes
      const sanitizedNotes = serviceDescription 
        ? `Customer Check-In Notes: ${String(serviceDescription).substring(0, 1000)}` 
        : 'Self Check-In';

      const repairOrder = await storage.createRepairOrder({
        locationId,
        organizationId: location.organizationId,
        customerId,
        vehicleId,
        roNumber,
        status: 'checked-in',
        notes: sanitizedNotes,
        jobs: [],
      });

      // Auto-add to service queue for waitlist management
      try {
        await storage.createServiceQueueEntry({
          locationId,
          customerId,
          vehicleId,
          customerName: `${String(customer.firstName).trim()} ${String(customer.lastName).trim()}`,
          vehicleInfo: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
          phone: String(customer.phone).replace(/[^\d+\-() ]/g, '').substring(0, 20),
          status: 'WAITING',
          serviceDescription: serviceDescription ? String(serviceDescription).substring(0, 500) : null,
          checkInSource: 'QR_CHECKIN',
          repairOrderId: repairOrder.id,
        });
      } catch (queueError) {
        console.error('Failed to add to service queue:', queueError);
        // Continue even if queue entry fails - the RO is still created
      }

      res.json({
        success: true,
        roId: repairOrder.id,
        roNumber: repairOrder.roNumber,
      });
    } catch (error: any) {
      console.error('Self check-in error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // License plate lookup proxy (Auto.dev API)
  app.get("/api/plate-lookup", requireAuth, async (req, res) => {
    try {
      const { plate, state } = req.query;
      if (!plate || !state || typeof plate !== 'string' || typeof state !== 'string') {
        return res.status(400).json({ 
          message: "Plate number and state are required" 
        });
      }

      const apiKey = process.env.AUTO_DEV_API_KEY;
      if (!apiKey) {
        return res.status(503).json({ 
          message: "License plate lookup not configured" 
        });
      }

      const cleanPlate = plate.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      const cleanState = state.toUpperCase();

      const url = `https://api.auto.dev/plate/${cleanState}/${cleanPlate}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 404) {
          return res.status(404).json({ 
            message: errorData.error || "No vehicle found for this plate" 
          });
        }
        if (response.status === 403) {
          return res.status(403).json({ 
            message: "Plate lookup requires Auto.dev Scale plan" 
          });
        }
        throw new Error(errorData.error || 'Plate lookup failed');
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error('Plate lookup error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Labor Guide API (VehicleDatabases)
  app.get("/api/labor-guide", requireAuth, async (req, res) => {
    try {
      const { year, make, model } = req.query;
      
      if (!year || !make || !model) {
        return res.status(400).json({ 
          message: "Year, make, and model are required" 
        });
      }

      const apiKey = process.env.VEHICLE_DATABASES_API_KEY;
      if (!apiKey) {
        return res.status(503).json({ 
          message: "Labor guide not configured" 
        });
      }

      const url = `https://api.vehicledatabases.com/repair-pricing/${year}/${encodeURIComponent(String(make))}/${encodeURIComponent(String(model))}`;
      
      const response = await fetch(url, {
        headers: {
          'x-AuthKey': apiKey,
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Labor guide API error:', response.status, errorText);
        if (response.status === 401 || response.status === 403) {
          return res.status(503).json({ 
            message: "Labor guide API key invalid or expired" 
          });
        }
        throw new Error(`Labor guide API error: ${response.status}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error('Labor guide error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Address autocomplete proxy (keeps API key on server)
  app.get("/api/address-autocomplete", requireAuth, async (req, res) => {
    try {
      const { text } = req.query;
      if (!text || typeof text !== 'string' || text.length < 3) {
        return res.json({ features: [] });
      }

      const apiKey = process.env.GEOAPIFY_API_KEY;
      if (!apiKey) {
        return res.status(503).json({ 
          message: "Address autocomplete not configured",
          features: [] 
        });
      }

      const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(text)}&format=json&filter=countrycode:us&apiKey=${apiKey}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Geoapify API error');
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error('Address autocomplete error:', error);
      res.status(500).json({ message: error.message, features: [] });
    }
  });

  // ============================================
  // AI Service Writer Routes
  // ============================================

  // Generate customer-friendly service description for a job
  app.post("/api/ai/service-description", requireAuth, async (req, res) => {
    try {
      const { generateServiceDescription } = await import("./ai");
      const { job, vehicle } = req.body;
      
      if (!job || !vehicle) {
        return res.status(400).json({ message: "Job and vehicle information required" });
      }

      const description = await generateServiceDescription(job, vehicle);
      res.json({ description });
    } catch (error: any) {
      console.error('AI service description error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Generate authorization request message for customer
  app.post("/api/ai/authorization-request", requireAuth, async (req, res) => {
    try {
      const { generateAuthorizationRequest } = await import("./ai");
      const { vehicle, jobs, notes, customerName } = req.body;
      
      if (!vehicle || !jobs || jobs.length === 0) {
        return res.status(400).json({ message: "Vehicle and jobs information required" });
      }

      const message = await generateAuthorizationRequest({ vehicle, jobs, notes, customerName });
      res.json({ message });
    } catch (error: any) {
      console.error('AI authorization request error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Generate diagnostic summary from symptoms
  app.post("/api/ai/diagnostic-summary", requireAuth, async (req, res) => {
    try {
      const { generateDiagnosticSummary } = await import("./ai");
      const { symptoms, vehicle, dtcCodes } = req.body;
      
      if (!symptoms || !vehicle) {
        return res.status(400).json({ message: "Symptoms and vehicle information required" });
      }

      const summary = await generateDiagnosticSummary(symptoms, vehicle, dtcCodes);
      res.json(summary);
    } catch (error: any) {
      console.error('AI diagnostic summary error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get AI-powered service recommendations
  app.post("/api/ai/service-recommendations", requireAuth, async (req, res) => {
    try {
      const { generateServiceRecommendation } = await import("./ai");
      const { vehicle, serviceHistory } = req.body;
      
      if (!vehicle) {
        return res.status(400).json({ message: "Vehicle information required" });
      }

      const result = await generateServiceRecommendation(vehicle, serviceHistory);
      res.json(result);
    } catch (error: any) {
      console.error('AI service recommendations error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Improve job description
  app.post("/api/ai/improve-description", requireAuth, async (req, res) => {
    try {
      const { improveJobDescription } = await import("./ai");
      const { currentDescription, jobName, vehicle } = req.body;
      
      if (!jobName || !vehicle) {
        return res.status(400).json({ message: "Job name and vehicle information required" });
      }

      const improved = await improveJobDescription(currentDescription || '', jobName, vehicle);
      res.json({ description: improved });
    } catch (error: any) {
      console.error('AI improve description error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // ============================================
  // PHASE 1: CONFIGURATION SETTINGS ROUTES
  // ============================================

  // Labor Rates
  app.get("/api/settings/labor-rates/:locationId", requireAuth, async (req, res) => {
    try {
      const location = await storage.getLocation(req.params.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(404).json({ message: "Location not found" });
      }
      const rates = await storage.getLaborRatesByLocation(req.params.locationId);
      res.json(rates);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/settings/labor-rates", requireAuth, async (req, res) => {
    try {
      const result = insertLaborRateSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).toString() });
      }
      const location = await storage.getLocation(result.data.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(403).json({ message: "Access denied" });
      }
      const rate = await storage.createLaborRate(result.data);
      res.status(201).json(rate);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/settings/labor-rates/:id", requireAuth, async (req, res) => {
    try {
      const rate = await storage.updateLaborRate(req.params.id, req.body);
      if (!rate) {
        return res.status(404).json({ message: "Labor rate not found" });
      }
      res.json(rate);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/settings/labor-rates/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteLaborRate(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Shop Fees
  app.get("/api/settings/shop-fees/:locationId", requireAuth, async (req, res) => {
    try {
      const location = await storage.getLocation(req.params.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(404).json({ message: "Location not found" });
      }
      const fees = await storage.getShopFeesByLocation(req.params.locationId);
      res.json(fees);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/settings/shop-fees", requireAuth, async (req, res) => {
    try {
      const result = insertShopFeeSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).toString() });
      }
      const location = await storage.getLocation(result.data.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(403).json({ message: "Access denied" });
      }
      const fee = await storage.createShopFee(result.data);
      res.status(201).json(fee);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/settings/shop-fees/:id", requireAuth, async (req, res) => {
    try {
      const fee = await storage.updateShopFee(req.params.id, req.body);
      if (!fee) {
        return res.status(404).json({ message: "Shop fee not found" });
      }
      res.json(fee);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/settings/shop-fees/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteShopFee(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Discounts
  app.get("/api/settings/discounts/:locationId", requireAuth, async (req, res) => {
    try {
      const location = await storage.getLocation(req.params.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(404).json({ message: "Location not found" });
      }
      const discounts = await storage.getDiscountsByLocation(req.params.locationId);
      res.json(discounts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/settings/discounts", requireAuth, async (req, res) => {
    try {
      const result = insertDiscountSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).toString() });
      }
      const location = await storage.getLocation(result.data.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(403).json({ message: "Access denied" });
      }
      const discount = await storage.createDiscount(result.data);
      res.status(201).json(discount);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/settings/discounts/:id", requireAuth, async (req, res) => {
    try {
      const discount = await storage.updateDiscount(req.params.id, req.body);
      if (!discount) {
        return res.status(404).json({ message: "Discount not found" });
      }
      res.json(discount);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/settings/discounts/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteDiscount(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Tax Settings
  app.get("/api/settings/tax/:locationId", requireAuth, async (req, res) => {
    try {
      const location = await storage.getLocation(req.params.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(404).json({ message: "Location not found" });
      }
      const settings = await storage.getTaxSettingsByLocation(req.params.locationId);
      res.json(settings || { locationId: req.params.locationId });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/settings/tax", requireAuth, async (req, res) => {
    try {
      const result = insertTaxSettingsSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).toString() });
      }
      const location = await storage.getLocation(result.data.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(403).json({ message: "Access denied" });
      }
      const settings = await storage.upsertTaxSettings(result.data);
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Job Categories
  app.get("/api/settings/job-categories/:locationId", requireAuth, async (req, res) => {
    try {
      const location = await storage.getLocation(req.params.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(404).json({ message: "Location not found" });
      }
      const categories = await storage.getJobCategoriesByLocation(req.params.locationId);
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/settings/job-categories", requireAuth, async (req, res) => {
    try {
      const result = insertJobCategorySchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).toString() });
      }
      const location = await storage.getLocation(result.data.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(403).json({ message: "Access denied" });
      }
      const category = await storage.createJobCategory(result.data);
      res.status(201).json(category);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/settings/job-categories/:id", requireAuth, async (req, res) => {
    try {
      const category = await storage.updateJobCategory(req.params.id, req.body);
      if (!category) {
        return res.status(404).json({ message: "Job category not found" });
      }
      res.json(category);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/settings/job-categories/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteJobCategory(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Payment Types
  app.get("/api/settings/payment-types/:locationId", requireAuth, async (req, res) => {
    try {
      const location = await storage.getLocation(req.params.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(404).json({ message: "Location not found" });
      }
      const types = await storage.getPaymentTypesByLocation(req.params.locationId);
      res.json(types);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/settings/payment-types", requireAuth, async (req, res) => {
    try {
      const result = insertPaymentTypeSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).toString() });
      }
      const location = await storage.getLocation(result.data.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(403).json({ message: "Access denied" });
      }
      const type = await storage.createPaymentType(result.data);
      res.status(201).json(type);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/settings/payment-types/:id", requireAuth, async (req, res) => {
    try {
      const type = await storage.updatePaymentType(req.params.id, req.body);
      if (!type) {
        return res.status(404).json({ message: "Payment type not found" });
      }
      res.json(type);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/settings/payment-types/:id", requireAuth, async (req, res) => {
    try {
      await storage.deletePaymentType(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Invoice Settings
  app.get("/api/settings/invoice/:locationId", requireAuth, async (req, res) => {
    try {
      const location = await storage.getLocation(req.params.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(404).json({ message: "Location not found" });
      }
      const settings = await storage.getInvoiceSettingsByLocation(req.params.locationId);
      res.json(settings || { locationId: req.params.locationId });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/settings/invoice", requireAuth, async (req, res) => {
    try {
      const result = insertInvoiceSettingsSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).toString() });
      }
      const location = await storage.getLocation(result.data.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(403).json({ message: "Access denied" });
      }
      const settings = await storage.upsertInvoiceSettings(result.data);
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // RO Settings
  app.get("/api/settings/ro/:locationId", requireAuth, async (req, res) => {
    try {
      const location = await storage.getLocation(req.params.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(404).json({ message: "Location not found" });
      }
      const settings = await storage.getRoSettingsByLocation(req.params.locationId);
      res.json(settings || { locationId: req.params.locationId });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/settings/ro", requireAuth, async (req, res) => {
    try {
      const result = insertRoSettingsSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).toString() });
      }
      const location = await storage.getLocation(result.data.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(403).json({ message: "Access denied" });
      }
      const settings = await storage.upsertRoSettings(result.data);
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Parts Matrix
  app.get("/api/settings/parts-matrix/:locationId", requireAuth, async (req, res) => {
    try {
      const location = await storage.getLocation(req.params.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(404).json({ message: "Location not found" });
      }
      const matrices = await storage.getPartsMatricesByLocation(req.params.locationId);
      res.json(matrices);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/settings/parts-matrix", requireAuth, async (req, res) => {
    try {
      const result = insertPartsMatrixSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).toString() });
      }
      const location = await storage.getLocation(result.data.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(403).json({ message: "Access denied" });
      }
      const matrix = await storage.createPartsMatrix(result.data);
      res.status(201).json(matrix);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/settings/parts-matrix/:id", requireAuth, async (req, res) => {
    try {
      const matrix = await storage.updatePartsMatrix(req.params.id, req.body);
      if (!matrix) {
        return res.status(404).json({ message: "Parts matrix not found" });
      }
      res.json(matrix);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/settings/parts-matrix/:id", requireAuth, async (req, res) => {
    try {
      await storage.deletePartsMatrix(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Labor Matrix
  app.get("/api/settings/labor-matrix/:locationId", requireAuth, async (req, res) => {
    try {
      const location = await storage.getLocation(req.params.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(404).json({ message: "Location not found" });
      }
      const matrices = await storage.getLaborMatricesByLocation(req.params.locationId);
      res.json(matrices);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/settings/labor-matrix", requireAuth, async (req, res) => {
    try {
      const result = insertLaborMatrixSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).toString() });
      }
      const location = await storage.getLocation(result.data.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(403).json({ message: "Access denied" });
      }
      const matrix = await storage.createLaborMatrix(result.data);
      res.status(201).json(matrix);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/settings/labor-matrix/:id", requireAuth, async (req, res) => {
    try {
      const matrix = await storage.updateLaborMatrix(req.params.id, req.body);
      if (!matrix) {
        return res.status(404).json({ message: "Labor matrix not found" });
      }
      res.json(matrix);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/settings/labor-matrix/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteLaborMatrix(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Lead Sources
  app.get("/api/settings/lead-sources/:locationId", requireAuth, async (req, res) => {
    try {
      const location = await storage.getLocation(req.params.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(404).json({ message: "Location not found" });
      }
      const sources = await storage.getLeadSourcesByLocation(req.params.locationId);
      res.json(sources);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/settings/lead-sources", requireAuth, async (req, res) => {
    try {
      const result = insertLeadSourceSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).toString() });
      }
      const location = await storage.getLocation(result.data.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(403).json({ message: "Access denied" });
      }
      const source = await storage.createLeadSource(result.data);
      res.status(201).json(source);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/settings/lead-sources/:id", requireAuth, async (req, res) => {
    try {
      const source = await storage.updateLeadSource(req.params.id, req.body);
      if (!source) {
        return res.status(404).json({ message: "Lead source not found" });
      }
      res.json(source);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/settings/lead-sources/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteLeadSource(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Customer Settings
  app.get("/api/settings/customer/:locationId", requireAuth, async (req, res) => {
    try {
      const location = await storage.getLocation(req.params.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(404).json({ message: "Location not found" });
      }
      const settings = await storage.getCustomerSettingsByLocation(req.params.locationId);
      res.json(settings || { locationId: req.params.locationId });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/settings/customer", requireAuth, async (req, res) => {
    try {
      const result = insertCustomerSettingsSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).toString() });
      }
      const location = await storage.getLocation(result.data.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(403).json({ message: "Access denied" });
      }
      const settings = await storage.upsertCustomerSettings(result.data);
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Transparency Settings
  app.get("/api/settings/transparency/:locationId", requireAuth, async (req, res) => {
    try {
      const location = await storage.getLocation(req.params.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(404).json({ message: "Location not found" });
      }
      const settings = await storage.getTransparencySettingsByLocation(req.params.locationId);
      res.json(settings || { locationId: req.params.locationId });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/settings/transparency", requireAuth, async (req, res) => {
    try {
      const result = insertTransparencySettingsSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).toString() });
      }
      const location = await storage.getLocation(result.data.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(403).json({ message: "Access denied" });
      }
      const settings = await storage.upsertTransparencySettings(result.data);
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Org Branding (organization-level settings)
  app.get("/api/settings/branding", requireAuth, async (req, res) => {
    try {
      const branding = await storage.getOrgBranding(req.user!.orgId);
      res.json(branding || { orgId: req.user!.orgId });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/settings/branding", requireAuth, async (req, res) => {
    try {
      const result = insertOrgBrandingSchema.safeParse({
        ...req.body,
        orgId: req.user!.orgId,
      });
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).toString() });
      }
      const branding = await storage.upsertOrgBranding(result.data);
      res.json(branding);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Object Storage routes for file uploads
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      await objectStorageService.downloadObject(req.path, res);
    } catch (error: any) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ message: "File not found" });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/settings/branding/logo", requireAuth, async (req, res) => {
    try {
      if (!req.body.fileData || !req.body.contentType) {
        return res.status(400).json({ message: "fileData and contentType are required" });
      }

      const objectStorageService = new ObjectStorageService();
      const fileBuffer = Buffer.from(req.body.fileData, 'base64');
      const objectPath = await objectStorageService.uploadFile(fileBuffer, req.body.contentType);
      
      // Update branding with the new logo path
      const existing = await storage.getOrgBranding(req.user!.orgId);
      const branding = await storage.upsertOrgBranding({
        orgId: req.user!.orgId,
        logoUrl: objectPath,
        primaryColor: existing?.primaryColor || '#2563EB',
        secondaryColor: existing?.secondaryColor || '#1e293b',
        termsOfService: existing?.termsOfService || '',
        enableWhiteLabel: existing?.enableWhiteLabel || false,
        customDomain: existing?.customDomain || '',
      });
      res.json({ objectPath, branding });
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get all settings for a location (batch endpoint)
  app.get("/api/settings/all/:locationId", requireAuth, async (req, res) => {
    try {
      const location = await storage.getLocation(req.params.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(404).json({ message: "Location not found" });
      }
      
      const [
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
      ] = await Promise.all([
        storage.getLaborRatesByLocation(req.params.locationId),
        storage.getShopFeesByLocation(req.params.locationId),
        storage.getDiscountsByLocation(req.params.locationId),
        storage.getTaxSettingsByLocation(req.params.locationId),
        storage.getJobCategoriesByLocation(req.params.locationId),
        storage.getPaymentTypesByLocation(req.params.locationId),
        storage.getInvoiceSettingsByLocation(req.params.locationId),
        storage.getRoSettingsByLocation(req.params.locationId),
        storage.getPartsMatricesByLocation(req.params.locationId),
        storage.getLaborMatricesByLocation(req.params.locationId),
        storage.getLeadSourcesByLocation(req.params.locationId),
        storage.getCustomerSettingsByLocation(req.params.locationId),
        storage.getTransparencySettingsByLocation(req.params.locationId),
        storage.getOrgBranding(req.user!.orgId),
      ]);

      res.json({
        location,
        laborRates,
        shopFees,
        discounts,
        taxSettings: taxSettings || { locationId: req.params.locationId },
        jobCategories,
        paymentTypes,
        invoiceSettings: invoiceSettings || { locationId: req.params.locationId },
        roSettings: roSettings || { locationId: req.params.locationId },
        partsMatrices,
        laborMatrices,
        leadSources,
        customerSettings: customerSettings || { locationId: req.params.locationId },
        transparencySettings: transparencySettings || { locationId: req.params.locationId },
        orgBranding: orgBranding || { orgId: req.user!.orgId },
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============================================
  // PHASE 2: OPERATIONAL WORKFLOWS ROUTES
  // ============================================

  // Service Bays
  app.get("/api/service-bays/:locationId", requireAuth, async (req, res) => {
    try {
      const location = await storage.getLocation(req.params.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(404).json({ message: "Location not found" });
      }
      const bays = await storage.getServiceBaysByLocation(req.params.locationId);
      res.json(bays);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/service-bays", requireAuth, async (req, res) => {
    try {
      const result = insertServiceBaySchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).toString() });
      }
      const location = await storage.getLocation(result.data.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(403).json({ message: "Access denied" });
      }
      const bay = await storage.createServiceBay(result.data);
      res.status(201).json(bay);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/service-bays/:id", requireAuth, async (req, res) => {
    try {
      const bay = await storage.updateServiceBay(req.params.id, req.body);
      if (!bay) {
        return res.status(404).json({ message: "Service bay not found" });
      }
      res.json(bay);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/service-bays/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteServiceBay(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Appointments
  app.get("/api/appointments/:locationId", requireAuth, async (req, res) => {
    try {
      const location = await storage.getLocation(req.params.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(404).json({ message: "Location not found" });
      }
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const appointments = await storage.getAppointmentsByLocation(req.params.locationId, startDate, endDate);
      res.json(appointments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/appointments/detail/:id", requireAuth, async (req, res) => {
    try {
      const appointment = await storage.getAppointment(req.params.id);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      const location = await storage.getLocation(appointment.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(403).json({ message: "Access denied" });
      }
      const services = await storage.getAppointmentServices(appointment.id);
      res.json({ ...appointment, services });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/appointments", requireAuth, async (req, res) => {
    try {
      const { services, ...appointmentData } = req.body;
      const result = insertAppointmentSchema.safeParse(appointmentData);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).toString() });
      }
      const location = await storage.getLocation(result.data.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(403).json({ message: "Access denied" });
      }
      const appointment = await storage.createAppointment(result.data);
      if (services && Array.isArray(services)) {
        for (const service of services) {
          await storage.createAppointmentService({
            ...service,
            appointmentId: appointment.id,
          });
        }
      }
      const createdServices = await storage.getAppointmentServices(appointment.id);
      res.status(201).json({ ...appointment, services: createdServices });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/appointments/:id", requireAuth, async (req, res) => {
    try {
      const { services, ...updates } = req.body;
      const appointment = await storage.updateAppointment(req.params.id, updates);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      if (services && Array.isArray(services)) {
        await storage.deleteAppointmentServices(appointment.id);
        for (const service of services) {
          await storage.createAppointmentService({
            ...service,
            appointmentId: appointment.id,
          });
        }
      }
      const updatedServices = await storage.getAppointmentServices(appointment.id);
      res.json({ ...appointment, services: updatedServices });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/appointments/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteAppointment(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Time Tracking
  app.get("/api/time-logs/active", requireAuth, async (req, res) => {
    try {
      const activeLog = await storage.getActiveTimeLog(req.user!.id);
      res.json(activeLog || null);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/time-logs/:locationId", requireAuth, async (req, res) => {
    try {
      const location = await storage.getLocation(req.params.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(404).json({ message: "Location not found" });
      }
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const logs = await storage.getTimeLogsByLocation(req.params.locationId, startDate, endDate);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/time-logs/clock-in", requireAuth, async (req, res) => {
    try {
      const activeLog = await storage.getActiveTimeLog(req.user!.id);
      if (activeLog) {
        return res.status(400).json({ message: "Already clocked in" });
      }
      const log = await storage.createTimeLog({
        userId: req.user!.id,
        locationId: req.body.locationId,
        clockIn: new Date(),
        repairOrderId: req.body.repairOrderId,
        jobId: req.body.jobId,
      });
      res.status(201).json(log);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/time-logs/clock-out", requireAuth, async (req, res) => {
    try {
      const activeLog = await storage.getActiveTimeLog(req.user!.id);
      if (!activeLog) {
        return res.status(400).json({ message: "Not clocked in" });
      }
      const log = await storage.updateTimeLog(activeLog.id, {
        clockOut: new Date(),
        breakMinutes: req.body.breakMinutes || 0,
        notes: req.body.notes,
      });
      res.json(log);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/time-logs/start-job", requireAuth, async (req, res) => {
    try {
      const activeLog = await storage.getActiveTimeLog(req.user!.id);
      if (activeLog && activeLog.repairOrderId) {
        await storage.updateTimeLog(activeLog.id, { clockOut: new Date() });
      }
      const log = await storage.createTimeLog({
        userId: req.user!.id,
        locationId: req.body.locationId,
        clockIn: new Date(),
        repairOrderId: req.body.repairOrderId,
        jobId: req.body.jobId,
      });
      res.status(201).json(log);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Vendors
  app.get("/api/vendors", requireAuth, async (req, res) => {
    try {
      const vendors = await storage.getVendorsByOrg(req.user!.orgId);
      res.json(vendors);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/vendors", requireAuth, async (req, res) => {
    try {
      const result = insertVendorSchema.safeParse({
        ...req.body,
        orgId: req.user!.orgId,
      });
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).toString() });
      }
      const vendor = await storage.createVendor(result.data);
      res.status(201).json(vendor);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/vendors/:id", requireAuth, async (req, res) => {
    try {
      const vendor = await storage.updateVendor(req.params.id, req.body);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      res.json(vendor);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/vendors/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteVendor(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Part Orders
  app.get("/api/part-orders/:locationId", requireAuth, async (req, res) => {
    try {
      const location = await storage.getLocation(req.params.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(404).json({ message: "Location not found" });
      }
      const orders = await storage.getPartOrdersByLocation(req.params.locationId);
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/part-orders/detail/:id", requireAuth, async (req, res) => {
    try {
      const order = await storage.getPartOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Part order not found" });
      }
      const items = await storage.getPartOrderItems(order.id);
      res.json({ ...order, items });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/part-orders", requireAuth, async (req, res) => {
    try {
      const { items, ...orderData } = req.body;
      const result = insertPartOrderSchema.safeParse(orderData);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).toString() });
      }
      const location = await storage.getLocation(result.data.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(403).json({ message: "Access denied" });
      }
      const order = await storage.createPartOrder(result.data);
      if (items && Array.isArray(items)) {
        for (const item of items) {
          await storage.createPartOrderItem({
            ...item,
            partOrderId: order.id,
          });
        }
      }
      const createdItems = await storage.getPartOrderItems(order.id);
      res.status(201).json({ ...order, items: createdItems });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/part-orders/:id", requireAuth, async (req, res) => {
    try {
      const order = await storage.updatePartOrder(req.params.id, req.body);
      if (!order) {
        return res.status(404).json({ message: "Part order not found" });
      }
      res.json(order);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Part Order Items
  app.post("/api/part-order-items", requireAuth, async (req, res) => {
    try {
      const result = insertPartOrderItemSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).toString() });
      }
      const item = await storage.createPartOrderItem(result.data);
      res.status(201).json(item);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/part-order-items/:id", requireAuth, async (req, res) => {
    try {
      const item = await storage.updatePartOrderItem(req.params.id, req.body);
      if (!item) {
        return res.status(404).json({ message: "Part order item not found" });
      }
      res.json(item);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/part-order-items/:id", requireAuth, async (req, res) => {
    try {
      await storage.deletePartOrderItem(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Invoices
  app.get("/api/invoices/:locationId", requireAuth, async (req, res) => {
    try {
      const location = await storage.getLocation(req.params.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(404).json({ message: "Location not found" });
      }
      const invoices = await storage.getInvoicesByLocation(req.params.locationId);
      res.json(invoices);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/invoices/detail/:id", requireAuth, async (req, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      const payments = await storage.getPaymentsByInvoice(invoice.id);
      res.json({ ...invoice, payments });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/invoices/repair-order/:roId", requireAuth, async (req, res) => {
    try {
      const invoice = await storage.getInvoiceByRepairOrder(req.params.roId);
      res.json(invoice || null);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/invoices", requireAuth, async (req, res) => {
    try {
      const invoiceNumber = await storage.getNextInvoiceNumber(req.body.locationId);
      
      const ro = await storage.getRepairOrder(req.body.repairOrderId, req.user!.orgId);
      if (!ro) {
        return res.status(404).json({ message: "Repair order not found" });
      }
      
      let subtotal = 0;
      const jobs = (ro.jobs as any[]) || [];
      for (const job of jobs) {
        const lineItems = job.lineItems || [];
        for (const item of lineItems) {
          const quantity = Number(item.quantity) || 0;
          const unitPrice = Number(item.unitPrice) || 0;
          subtotal += quantity * unitPrice;
        }
      }
      
      const taxRate = 0.0825;
      const taxAmount = subtotal * taxRate;
      const total = subtotal + taxAmount;
      
      const result = insertInvoiceSchema.safeParse({
        ...req.body,
        invoiceNumber,
        subtotal: subtotal.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        discountAmount: '0.00',
        total: total.toFixed(2),
        amountPaid: '0.00',
        amountDue: total.toFixed(2),
      });
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).toString() });
      }
      const location = await storage.getLocation(result.data.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(403).json({ message: "Access denied" });
      }
      const invoice = await storage.createInvoice(result.data);
      res.status(201).json(invoice);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/invoices/:id", requireAuth, async (req, res) => {
    try {
      const invoice = await storage.updateInvoice(req.params.id, req.body);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Payments
  app.post("/api/payments", requireAuth, async (req, res) => {
    try {
      const result = insertPaymentSchema.safeParse({
        ...req.body,
        processedBy: req.user!.id,
      });
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).toString() });
      }
      const payment = await storage.createPayment(result.data);
      res.status(201).json(payment);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Reporting
  app.get("/api/reports/summary/:locationId", requireAuth, async (req, res) => {
    try {
      const location = await storage.getLocation(req.params.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const dateRange = req.query.range as string || 'all';
      const now = new Date();
      let startDate: Date | null = null;
      
      if (dateRange === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (dateRange === 'week') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (dateRange === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (dateRange === 'year') {
        startDate = new Date(now.getFullYear(), 0, 1);
      }
      
      const ros = await storage.getRepairOrdersByLocation(req.params.locationId, req.user!.orgId);
      const invoices = await storage.getInvoicesByLocation(req.params.locationId);
      const timeLogs = await storage.getTimeLogsByLocation(req.params.locationId);
      const partsOrders = await storage.getPartOrdersByLocation(req.params.locationId);
      
      const filteredInvoices = startDate 
        ? invoices.filter(i => new Date(i.createdAt) >= startDate!) 
        : invoices;
      const filteredTimeLogs = startDate
        ? timeLogs.filter(t => new Date(t.clockIn) >= startDate!)
        : timeLogs;
      const filteredPartsOrders = startDate
        ? partsOrders.filter(p => new Date(p.createdAt) >= startDate!)
        : partsOrders;
      
      const paidInvoices = filteredInvoices.filter(i => i.status === 'PAID');
      const outstandingInvoices = filteredInvoices.filter(i => i.status !== 'PAID' && i.status !== 'VOID');
      
      const totalPaid = paidInvoices.reduce((sum, i) => sum + parseFloat(i.total), 0);
      const totalOutstanding = outstandingInvoices.reduce((sum, i) => sum + parseFloat(i.amountDue), 0);
      
      let laborRevenue = 0;
      let partsRevenue = 0;
      let otherRevenue = 0;
      
      for (const invoice of paidInvoices) {
        const ro = ros.find(r => r.id === invoice.repairOrderId);
        if (ro) {
          const jobs = (ro.jobs as any[]) || [];
          for (const job of jobs) {
            for (const item of job.lineItems || []) {
              const amount = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
              if (item.type === 'LABOR') laborRevenue += amount;
              else if (item.type === 'PART') partsRevenue += amount;
              else otherRevenue += amount;
            }
          }
        }
      }
      
      const completedRos = ros.filter(ro => 
        ro.completedAt && (!startDate || new Date(ro.completedAt) >= startDate)
      );
      const activeRos = ros.filter(ro => !ro.completedAt);
      
      let totalHoursWorked = 0;
      for (const log of filteredTimeLogs) {
        if (log.clockOut) {
          const clockIn = new Date(log.clockIn);
          const clockOut = new Date(log.clockOut);
          const breakMins = Number(log.breakMinutes) || 0;
          const hours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60) - (breakMins / 60);
          totalHoursWorked += Math.max(0, hours);
        }
      }
      
      const pendingPartsOrders = filteredPartsOrders.filter(o => o.status === 'DRAFT' || o.status === 'ORDERED');
      const partsCost = filteredPartsOrders
        .filter(o => o.status === 'RECEIVED')
        .reduce((sum, o) => sum + parseFloat(o.totalCost || '0'), 0);
      
      const avgRoValue = paidInvoices.length > 0 ? totalPaid / paidInvoices.length : 0;
      
      res.json({
        revenue: {
          total: totalPaid,
          labor: laborRevenue,
          parts: partsRevenue,
          other: otherRevenue,
          avgRoValue,
        },
        repairOrders: {
          total: ros.length,
          active: activeRos.length,
          completed: completedRos.length,
        },
        invoices: {
          total: filteredInvoices.length,
          paid: paidInvoices.length,
          outstanding: outstandingInvoices.length,
          totalPaid,
          totalOutstanding,
        },
        productivity: {
          totalHoursWorked: Math.round(totalHoursWorked * 100) / 100,
          activeTechnicians: new Set(filteredTimeLogs.map(l => l.technicianId)).size,
        },
        parts: {
          pendingOrders: pendingPartsOrders.length,
          totalCost: partsCost,
        },
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Comprehensive Analytics API
  app.get("/api/reports/analytics/:locationId", requireAuth, async (req, res) => {
    try {
      const location = await storage.getLocation(req.params.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const dateRange = req.query.range as string || 'month';
      const compareEnabled = req.query.compare === 'true';
      const now = new Date();
      
      // Calculate date ranges
      let startDate: Date;
      let endDate: Date = now;
      let prevStartDate: Date | null = null;
      let prevEndDate: Date | null = null;
      
      if (dateRange === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (compareEnabled) {
          prevStartDate = new Date(startDate);
          prevStartDate.setDate(prevStartDate.getDate() - 1);
          prevEndDate = new Date(startDate);
        }
      } else if (dateRange === 'week') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (compareEnabled) {
          prevStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
          prevEndDate = new Date(startDate);
        }
      } else if (dateRange === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        if (compareEnabled) {
          prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          prevEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
        }
      } else if (dateRange === 'quarter') {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
        if (compareEnabled) {
          prevStartDate = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
          prevEndDate = new Date(now.getFullYear(), currentQuarter * 3, 0);
        }
      } else if (dateRange === 'year') {
        startDate = new Date(now.getFullYear(), 0, 1);
        if (compareEnabled) {
          prevStartDate = new Date(now.getFullYear() - 1, 0, 1);
          prevEndDate = new Date(now.getFullYear() - 1, 11, 31);
        }
      } else if (dateRange === 'last30') {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (compareEnabled) {
          prevStartDate = new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000);
          prevEndDate = new Date(startDate);
        }
      } else if (dateRange === 'last90') {
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        if (compareEnabled) {
          prevStartDate = new Date(startDate.getTime() - 90 * 24 * 60 * 60 * 1000);
          prevEndDate = new Date(startDate);
        }
      } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      // Fetch all data
      const ros = await storage.getRepairOrdersByLocation(req.params.locationId, req.user!.orgId);
      const invoices = await storage.getInvoicesByLocation(req.params.locationId);
      const timeLogs = await storage.getTimeLogsByLocation(req.params.locationId);
      const customers = await storage.getCustomersByOrg(req.user!.orgId);
      const users = await storage.getUsersByOrg(req.user!.orgId);
      const deferredWork = await storage.getDeferredWorkByOrg(req.user!.orgId);

      // Filter by date range
      const filterByDateRange = <T extends { createdAt: Date | string }>(items: T[], start: Date, end: Date) => 
        items.filter(i => {
          const d = new Date(i.createdAt);
          return d >= start && d <= end;
        });

      const currentInvoices = filterByDateRange(invoices, startDate, endDate);
      const paidInvoices = currentInvoices.filter(i => i.status === 'PAID');
      const currentRos = ros.filter(ro => {
        const d = ro.completedAt ? new Date(ro.completedAt) : new Date(ro.createdAt);
        return d >= startDate && d <= endDate;
      });

      // Previous period data for comparison
      let prevPaidInvoices: typeof paidInvoices = [];
      let prevRos: typeof currentRos = [];
      if (compareEnabled && prevStartDate && prevEndDate) {
        const prevInvoices = filterByDateRange(invoices, prevStartDate, prevEndDate);
        prevPaidInvoices = prevInvoices.filter(i => i.status === 'PAID');
        prevRos = ros.filter(ro => {
          const d = ro.completedAt ? new Date(ro.completedAt) : new Date(ro.createdAt);
          return d >= prevStartDate! && d <= prevEndDate!;
        });
      }

      // Calculate current period metrics
      const totalRevenue = paidInvoices.reduce((sum, i) => sum + parseFloat(i.total), 0);
      const carCount = new Set(currentRos.map(r => r.vehicleId)).size;
      const avgRO = paidInvoices.length > 0 ? totalRevenue / paidInvoices.length : 0;
      const completedROs = currentRos.filter(r => r.completedAt).length;

      // Previous period metrics
      const prevTotalRevenue = prevPaidInvoices.reduce((sum, i) => sum + parseFloat(i.total), 0);
      const prevCarCount = new Set(prevRos.map(r => r.vehicleId)).size;
      const prevAvgRO = prevPaidInvoices.length > 0 ? prevTotalRevenue / prevPaidInvoices.length : 0;

      // Revenue breakdown
      let laborRevenue = 0, partsRevenue = 0, otherRevenue = 0;
      let laborCost = 0, partsCost = 0;
      
      for (const invoice of paidInvoices) {
        const ro = ros.find(r => r.id === invoice.repairOrderId);
        if (ro) {
          const jobs = (ro.jobs as any[]) || [];
          for (const job of jobs) {
            for (const item of job.lineItems || []) {
              const amount = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
              const cost = (Number(item.quantity) || 0) * (Number(item.unitCost) || 0);
              if (item.type === 'LABOR') {
                laborRevenue += amount;
                laborCost += cost;
              } else if (item.type === 'PART') {
                partsRevenue += amount;
                partsCost += cost;
              } else {
                otherRevenue += amount;
              }
            }
          }
        }
      }

      // Daily trend data
      const dailyData: { date: string; revenue: number; carCount: number; ros: number }[] = [];
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      for (let i = 0; i <= Math.min(daysDiff, 90); i++) {
        const day = new Date(startDate);
        day.setDate(day.getDate() + i);
        const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
        
        const dayInvoices = paidInvoices.filter(inv => {
          const d = new Date(inv.paidAt || inv.createdAt);
          return d >= dayStart && d <= dayEnd;
        });
        const dayRos = currentRos.filter(ro => {
          const d = ro.completedAt ? new Date(ro.completedAt) : new Date(ro.createdAt);
          return d >= dayStart && d <= dayEnd;
        });
        
        dailyData.push({
          date: dayStart.toISOString().split('T')[0],
          revenue: dayInvoices.reduce((sum, i) => sum + parseFloat(i.total), 0),
          carCount: new Set(dayRos.map(r => r.vehicleId)).size,
          ros: dayRos.length,
        });
      }

      // Technician productivity
      const techData: { id: string; name: string; hoursWorked: number; revenue: number; jobsCompleted: number; efficiency: number }[] = [];
      const technicians = users.filter(u => u.role === 'TECH' || u.role === 'SERVICE_ADVISOR');
      
      for (const tech of technicians) {
        const techTimeLogs = timeLogs.filter(t => t.technicianId === tech.id && new Date(t.clockIn) >= startDate);
        let hoursWorked = 0;
        for (const log of techTimeLogs) {
          if (log.clockOut) {
            const hours = (new Date(log.clockOut).getTime() - new Date(log.clockIn).getTime()) / (1000 * 60 * 60);
            hoursWorked += Math.max(0, hours - (Number(log.breakMinutes) || 0) / 60);
          }
        }

        const techRos = currentRos.filter(r => r.technicianId === tech.id);
        let techRevenue = 0;
        for (const ro of techRos) {
          const inv = paidInvoices.find(i => i.repairOrderId === ro.id);
          if (inv) techRevenue += parseFloat(inv.total);
        }

        if (hoursWorked > 0 || techRevenue > 0 || techRos.length > 0) {
          techData.push({
            id: tech.id,
            name: tech.name || tech.username,
            hoursWorked: Math.round(hoursWorked * 10) / 10,
            revenue: techRevenue,
            jobsCompleted: techRos.filter(r => r.completedAt).length,
            efficiency: hoursWorked > 0 ? Math.round((techRevenue / hoursWorked) * 100) / 100 : 0,
          });
        }
      }

      // Top services
      const serviceMap = new Map<string, { name: string; count: number; revenue: number }>();
      for (const invoice of paidInvoices) {
        const ro = ros.find(r => r.id === invoice.repairOrderId);
        if (ro) {
          const jobs = (ro.jobs as any[]) || [];
          for (const job of jobs) {
            const existing = serviceMap.get(job.name) || { name: job.name, count: 0, revenue: 0 };
            existing.count++;
            for (const item of job.lineItems || []) {
              existing.revenue += (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
            }
            serviceMap.set(job.name, existing);
          }
        }
      }
      const topServices = Array.from(serviceMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Deferred work metrics
      const locationDeferredWork = deferredWork.filter(d => d.locationId === req.params.locationId);
      const pendingDeferred = locationDeferredWork.filter(d => d.status === 'PENDING' || d.status === 'QUOTED');
      const convertedDeferred = locationDeferredWork.filter(d => 
        d.status === 'CONVERTED' && d.createdAt && new Date(d.createdAt) >= startDate
      );
      const deferredValue = pendingDeferred.reduce((sum, d) => sum + parseFloat(d.estimatedAmount || '0'), 0);

      // Invoice aging
      const outstandingInvoices = currentInvoices.filter(i => i.status !== 'PAID' && i.status !== 'VOID');
      const aging = {
        current: 0, // 0-30 days
        days30: 0,  // 31-60 days
        days60: 0,  // 61-90 days
        days90: 0,  // 90+ days
      };
      
      for (const inv of outstandingInvoices) {
        const daysPast = Math.floor((now.getTime() - new Date(inv.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        const amount = parseFloat(inv.amountDue);
        if (daysPast <= 30) aging.current += amount;
        else if (daysPast <= 60) aging.days30 += amount;
        else if (daysPast <= 90) aging.days60 += amount;
        else aging.days90 += amount;
      }

      // Calculate percentage changes
      const calcChange = (current: number, prev: number) => 
        prev > 0 ? Math.round(((current - prev) / prev) * 1000) / 10 : current > 0 ? 100 : 0;

      res.json({
        dateRange: { start: startDate.toISOString(), end: endDate.toISOString() },
        kpis: {
          totalRevenue: { value: totalRevenue, change: calcChange(totalRevenue, prevTotalRevenue) },
          carCount: { value: carCount, change: calcChange(carCount, prevCarCount) },
          avgRO: { value: avgRO, change: calcChange(avgRO, prevAvgRO) },
          completedROs: { value: completedROs, change: calcChange(completedROs, prevRos.filter(r => r.completedAt).length) },
          laborRevenue: { value: laborRevenue },
          partsRevenue: { value: partsRevenue },
          otherRevenue: { value: otherRevenue },
          laborMargin: { value: laborRevenue > 0 ? ((laborRevenue - laborCost) / laborRevenue) * 100 : 0 },
          partsMargin: { value: partsRevenue > 0 ? ((partsRevenue - partsCost) / partsRevenue) * 100 : 0 },
          grossProfit: { value: (laborRevenue + partsRevenue + otherRevenue) - laborCost - partsCost },
        },
        trends: dailyData,
        technicians: techData.sort((a, b) => b.revenue - a.revenue),
        topServices,
        deferredWork: {
          pending: pendingDeferred.length,
          converted: convertedDeferred.length,
          value: deferredValue,
          conversionRate: locationDeferredWork.length > 0 
            ? (convertedDeferred.length / locationDeferredWork.length) * 100 
            : 0,
        },
        aging,
        invoices: {
          total: currentInvoices.length,
          paid: paidInvoices.length,
          outstanding: outstandingInvoices.length,
          totalPaid: totalRevenue,
          totalOutstanding: outstandingInvoices.reduce((sum, i) => sum + parseFloat(i.amountDue), 0),
        },
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Export report data as CSV
  app.get("/api/reports/export/:locationId", requireAuth, async (req, res) => {
    try {
      const location = await storage.getLocation(req.params.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const type = req.query.type as string || 'invoices';
      const dateRange = req.query.range as string || 'month';
      const now = new Date();
      
      let startDate: Date;
      if (dateRange === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (dateRange === 'week') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (dateRange === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (dateRange === 'year') {
        startDate = new Date(now.getFullYear(), 0, 1);
      } else {
        startDate = new Date(0);
      }

      let csvData = '';
      
      if (type === 'invoices') {
        const invoices = await storage.getInvoicesByLocation(req.params.locationId);
        const customers = await storage.getCustomersByOrg(req.user!.orgId);
        const filtered = invoices.filter(i => new Date(i.createdAt) >= startDate);
        
        csvData = 'Invoice Number,Customer,Status,Total,Amount Paid,Amount Due,Created Date,Paid Date\n';
        for (const inv of filtered) {
          const customer = customers.find(c => c.id === inv.customerId);
          csvData += `"${inv.invoiceNumber}","${customer?.firstName || ''} ${customer?.lastName || ''}","${inv.status}",${inv.total},${inv.amountPaid},${inv.amountDue},"${new Date(inv.createdAt).toLocaleDateString()}","${inv.paidAt ? new Date(inv.paidAt).toLocaleDateString() : ''}"\n`;
        }
      } else if (type === 'ros') {
        const ros = await storage.getRepairOrdersByLocation(req.params.locationId, req.user!.orgId);
        const customers = await storage.getCustomersByOrg(req.user!.orgId);
        const vehicles = await storage.getVehiclesByOrg(req.user!.orgId);
        const filtered = ros.filter(r => new Date(r.createdAt) >= startDate);
        
        csvData = 'RO Number,Customer,Vehicle,Status,Created Date,Completed Date\n';
        for (const ro of filtered) {
          const customer = customers.find(c => c.id === ro.customerId);
          const vehicle = vehicles.find(v => v.id === ro.vehicleId);
          csvData += `${ro.roNumber},"${customer?.firstName || ''} ${customer?.lastName || ''}","${vehicle?.year || ''} ${vehicle?.make || ''} ${vehicle?.model || ''}","${ro.status}","${new Date(ro.createdAt).toLocaleDateString()}","${ro.completedAt ? new Date(ro.completedAt).toLocaleDateString() : ''}"\n`;
        }
      } else if (type === 'technicians') {
        const users = await storage.getUsersByOrg(req.user!.orgId);
        const timeLogs = await storage.getTimeLogsByLocation(req.params.locationId);
        const technicians = users.filter(u => u.role === 'TECH');
        
        csvData = 'Technician,Hours Worked,Jobs Completed\n';
        for (const tech of technicians) {
          const techLogs = timeLogs.filter(t => t.technicianId === tech.id && new Date(t.clockIn) >= startDate);
          let hours = 0;
          for (const log of techLogs) {
            if (log.clockOut) {
              hours += (new Date(log.clockOut).getTime() - new Date(log.clockIn).getTime()) / (1000 * 60 * 60);
            }
          }
          const ros = await storage.getRepairOrdersByLocation(req.params.locationId, req.user!.orgId);
          const techRos = ros.filter(r => r.technicianId === tech.id && r.completedAt && new Date(r.completedAt) >= startDate);
          csvData += `"${tech.name || tech.username}",${hours.toFixed(1)},${techRos.length}\n`;
        }
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${type}-report-${dateRange}.csv"`);
      res.send(csvData);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Drill-down data for reports
  app.get("/api/reports/drilldown/:locationId/:metric", requireAuth, async (req, res) => {
    try {
      const location = await storage.getLocation(req.params.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const metric = req.params.metric;
      const dateRange = req.query.range as string || 'month';
      const now = new Date();
      
      let startDate: Date;
      if (dateRange === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (dateRange === 'week') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (dateRange === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (dateRange === 'quarter') {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
      } else if (dateRange === 'year') {
        startDate = new Date(now.getFullYear(), 0, 1);
      } else if (dateRange === 'last30') {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else if (dateRange === 'last90') {
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      const ros = await storage.getRepairOrdersByLocation(req.params.locationId, req.user!.orgId);
      const invoices = await storage.getInvoicesByLocation(req.params.locationId);
      const customers = await storage.getCustomersByOrg(req.user!.orgId);
      const vehicles = await storage.getVehiclesByOrg(req.user!.orgId);

      if (metric === 'revenue' || metric === 'avgro') {
        const paidInvoices = invoices
          .filter(i => i.status === 'PAID' && new Date(i.createdAt) >= startDate)
          .sort((a, b) => new Date(b.paidAt || b.createdAt).getTime() - new Date(a.paidAt || a.createdAt).getTime());
        
        const data = paidInvoices.map(inv => {
          const customer = customers.find(c => c.id === inv.customerId);
          const ro = ros.find(r => r.id === inv.repairOrderId);
          const vehicle = vehicles.find(v => v.id === ro?.vehicleId);
          return {
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            customer: customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown',
            vehicle: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'N/A',
            total: parseFloat(inv.total),
            paidAt: inv.paidAt,
          };
        });
        
        res.json({ metric, title: metric === 'revenue' ? 'Revenue Details' : 'Average RO Details', data });
      } else if (metric === 'carcount') {
        const filteredRos = ros
          .filter(ro => {
            const d = ro.completedAt ? new Date(ro.completedAt) : new Date(ro.createdAt);
            return d >= startDate;
          })
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        const vehicleMap = new Map<string, { vehicle: any; count: number; ros: any[] }>();
        for (const ro of filteredRos) {
          const vehicle = vehicles.find(v => v.id === ro.vehicleId);
          if (vehicle) {
            const existing = vehicleMap.get(vehicle.id) || { vehicle, count: 0, ros: [] };
            existing.count++;
            existing.ros.push(ro);
            vehicleMap.set(vehicle.id, existing);
          }
        }
        
        const data = Array.from(vehicleMap.values()).map(({ vehicle, count, ros: vRos }) => {
          const customer = customers.find(c => c.id === vehicle.customerId);
          return {
            id: vehicle.id,
            vehicle: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
            vin: vehicle.vin,
            customer: customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown',
            visits: count,
            lastVisit: vRos[0].createdAt,
          };
        });
        
        res.json({ metric, title: 'Vehicles Serviced', data });
      } else if (metric === 'completedros') {
        const completed = ros
          .filter(ro => ro.completedAt && new Date(ro.completedAt) >= startDate)
          .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());
        
        const data = completed.map(ro => {
          const customer = customers.find(c => c.id === ro.customerId);
          const vehicle = vehicles.find(v => v.id === ro.vehicleId);
          const invoice = invoices.find(i => i.repairOrderId === ro.id);
          return {
            id: ro.id,
            roNumber: ro.roNumber,
            customer: customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown',
            vehicle: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'N/A',
            completedAt: ro.completedAt,
            total: invoice ? parseFloat(invoice.total) : null,
          };
        });
        
        res.json({ metric, title: 'Completed Repair Orders', data });
      } else if (metric === 'outstanding') {
        const outstanding = invoices
          .filter(i => i.status !== 'PAID' && i.status !== 'VOID')
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        
        const data = outstanding.map(inv => {
          const customer = customers.find(c => c.id === inv.customerId);
          const daysPast = Math.floor((now.getTime() - new Date(inv.createdAt).getTime()) / (1000 * 60 * 60 * 24));
          return {
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            customer: customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown',
            amountDue: parseFloat(inv.amountDue),
            createdAt: inv.createdAt,
            daysPast,
            status: inv.status,
          };
        });
        
        res.json({ metric, title: 'Outstanding Invoices', data });
      } else if (metric === 'deferred') {
        const deferredWork = await storage.getDeferredWorkByOrg(req.user!.orgId);
        const pending = deferredWork
          .filter(d => d.locationId === req.params.locationId && (d.status === 'PENDING' || d.status === 'QUOTED'))
          .sort((a, b) => parseFloat(b.estimatedAmount || '0') - parseFloat(a.estimatedAmount || '0'));
        
        const data = pending.map(d => {
          const customer = customers.find(c => c.id === d.customerId);
          const vehicle = vehicles.find(v => v.id === d.vehicleId);
          return {
            id: d.id,
            description: d.description,
            customer: customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown',
            vehicle: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'N/A',
            estimatedAmount: parseFloat(d.estimatedAmount || '0'),
            priority: d.priority,
            status: d.status,
          };
        });
        
        res.json({ metric, title: 'Pending Deferred Work', data });
      } else {
        res.status(400).json({ message: 'Unknown metric type' });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============================================
  // VIN Decode (NHTSA - Free, no API key required)
  // ============================================
  
  app.get("/api/vin/decode", requireAuth, async (req, res) => {
    try {
      const vin = req.query.vin as string;
      if (!vin || vin.length !== 17) {
        return res.status(400).json({ message: "Valid 17-character VIN is required" });
      }

      const response = await fetch(
        `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`
      );
      
      if (!response.ok) {
        throw new Error("Failed to decode VIN");
      }

      const data = await response.json();
      const result = data.Results?.[0];
      
      if (!result || result.ErrorCode !== "0") {
        return res.status(404).json({ message: "Vehicle not found for this VIN" });
      }

      res.json({
        year: parseInt(result.ModelYear) || null,
        make: result.Make || null,
        model: result.Model || null,
        submodel: result.Trim || null,
        engine: result.DisplacementL ? `${result.DisplacementL}L ${result.EngineCylinders || ''}cyl` : null,
        bodyClass: result.BodyClass || null,
        driveType: result.DriveType || null,
        fuelType: result.FuelTypePrimary || null,
        transmission: result.TransmissionStyle || null,
        doors: result.Doors || null,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============================================
  // PartsTech Integration Routes
  // ============================================
  
  // Check if PartsTech is configured
  app.get("/api/partstech/status", requireAuth, async (req, res) => {
    const { isPartstechConfigured } = await import("./partstech");
    res.json({ configured: isPartstechConfigured() });
  });

  // Decode VIN using PartsTech
  app.get("/api/partstech/vin/:vin", requireAuth, async (req, res) => {
    try {
      const { decodeVIN } = await import("./partstech");
      const vehicle = await decodeVIN(req.params.vin);
      if (!vehicle) {
        return res.status(404).json({ message: "Vehicle not found" });
      }
      res.json(vehicle);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Search parts
  app.post("/api/partstech/search", requireAuth, async (req, res) => {
    try {
      const { searchParts } = await import("./partstech");
      const { query, vin, vehicleId, categoryId, page, pageSize } = req.body;
      
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }

      const results = await searchParts(query, {
        vin,
        vehicleId,
        categoryId,
        page,
        pageSize,
      });
      
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get part details
  app.get("/api/partstech/parts/:partNumber", requireAuth, async (req, res) => {
    try {
      const { getPartDetails } = await import("./partstech");
      const brandId = req.query.brandId as string | undefined;
      const part = await getPartDetails(req.params.partNumber, brandId);
      
      if (!part) {
        return res.status(404).json({ message: "Part not found" });
      }
      
      res.json(part);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get suppliers
  app.get("/api/partstech/suppliers", requireAuth, async (req, res) => {
    try {
      const { getSuppliers } = await import("./partstech");
      const suppliers = await getSuppliers();
      res.json(suppliers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get categories
  app.get("/api/partstech/categories", requireAuth, async (req, res) => {
    try {
      const { getCategories } = await import("./partstech");
      const categories = await getCategories();
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get vehicle years
  app.get("/api/partstech/vehicles/years", requireAuth, async (req, res) => {
    try {
      const { getVehicleYears } = await import("./partstech");
      const years = await getVehicleYears();
      res.json(years);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get vehicle makes for a year
  app.get("/api/partstech/vehicles/makes", requireAuth, async (req, res) => {
    try {
      const { getVehicleMakes } = await import("./partstech");
      const year = parseInt(req.query.year as string);
      if (isNaN(year)) {
        return res.status(400).json({ message: "Year is required" });
      }
      const makes = await getVehicleMakes(year);
      res.json(makes);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get vehicle models for a year and make
  app.get("/api/partstech/vehicles/models", requireAuth, async (req, res) => {
    try {
      const { getVehicleModels } = await import("./partstech");
      const year = parseInt(req.query.year as string);
      const makeId = req.query.makeId as string;
      if (isNaN(year) || !makeId) {
        return res.status(400).json({ message: "Year and makeId are required" });
      }
      const models = await getVehicleModels(year, makeId);
      res.json(models);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==========================================
  // PARTS SESSIONS (Chrome Extension Integration)
  // ==========================================

  // Get parts session for a job
  app.get("/api/parts-sessions/job/:jobId", requireAuth, async (req, res) => {
    try {
      const session = await storage.getPartsSessionByJob(req.params.jobId, req.user!.orgId);
      res.json(session);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get parts session by RO
  app.get("/api/parts-sessions/ro/:roId", requireAuth, async (req, res) => {
    try {
      const sessions = await storage.getPartsSessionsByRO(req.params.roId, req.user!.orgId);
      res.json(sessions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Zod schema for parts session request
  const partsSessionItemSchema = z.object({
    partNumber: z.string().min(1),
    description: z.string().optional(),
    brand: z.string().optional(),
    supplier: z.string().optional(),
    quantity: z.coerce.number().int().min(1).default(1),
    price: z.coerce.number().min(0).optional(),
    unitCost: z.string().optional(),
  });
  
  const partsSessionRequestSchema = z.object({
    jobId: z.string().min(1, "jobId is required"),
    repairOrderId: z.string().min(1, "repairOrderId is required"),
    roNumber: z.string().optional(),
    vehicleInfo: z.string().optional(),
    items: z.array(partsSessionItemSchema).optional(),
  });
  
  // Create or update parts session - AUTO-APPLIES parts to job line items
  app.post("/api/parts-sessions", requireAuth, async (req, res) => {
    try {
      // Validate request with Zod
      const parseResult = partsSessionRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Validation error",
          errors: parseResult.error.flatten().fieldErrors 
        });
      }
      
      const { jobId, repairOrderId, roNumber, vehicleInfo, items } = parseResult.data;
      
      // Verify repair order belongs to user's org and get locationId from RO
      const repairOrder = await storage.getRepairOrder(repairOrderId, req.user!.orgId);
      if (!repairOrder) {
        return res.status(404).json({ message: "Repair order not found or access denied" });
      }
      
      // AUTO-APPLY: Add parts directly to the job's line items
      if (items && items.length > 0) {
        const jobs = (repairOrder.jobs || []) as any[];
        const jobIndex = jobs.findIndex((j: any) => j.id === jobId);
        
        if (jobIndex >= 0) {
          const job = jobs[jobIndex];
          const existingLineItems = job.lineItems || [];
          
          // Normalize part number for comparison (trim whitespace, uppercase)
          const normalizePartNumber = (pn: string | undefined) => (pn || '').trim().toUpperCase();
          
          // Build set of existing part numbers (normalized)
          const existingPartNumbers = new Set(
            existingLineItems
              .map((li: any) => normalizePartNumber(li.partNumber))
              .filter((pn: string) => pn.length > 0)
          );
          
          // Filter out duplicates and convert to line items
          const uniqueNewItems: any[] = [];
          for (const item of items) {
            const normalizedPN = normalizePartNumber(item.partNumber);
            
            // Skip if already exists
            if (existingPartNumbers.has(normalizedPN)) {
              continue;
            }
            
            // Mark as added to prevent future duplicates in this batch
            existingPartNumbers.add(normalizedPN);
            
            const partCost = item.price ?? (item.unitCost ? parseFloat(item.unitCost) : 0);
            // Apply basic markup (1.5x) if no parts matrix configured
            const partPrice = Math.round(partCost * 1.5 * 100) / 100;
            
            uniqueNewItems.push({
              id: `li-${Date.now()}-${uniqueNewItems.length}`,
              type: 'PART',
              description: item.description || item.partNumber,
              quantity: item.quantity || 1, // Use quantity from PartsTech selection
              unitCost: partCost,
              unitPrice: partPrice,
              approved: true,
              partNumber: item.partNumber,
              manufacturer: item.brand,
              supplier: item.supplier || 'PartsTech',
            });
          }
          
          if (uniqueNewItems.length > 0) {
            job.lineItems = [...existingLineItems, ...uniqueNewItems];
            jobs[jobIndex] = job;
            
            // Update the repair order with new line items
            await storage.updateRepairOrder(repairOrderId, req.user!.orgId, { jobs });
          }
          
          // Return success with the applied items
          return res.json({ 
            success: true, 
            message: `Added ${uniqueNewItems.length} part(s) to job`,
            appliedItems: uniqueNewItems,
            skippedDuplicates: items.length - uniqueNewItems.length,
            repairOrderId,
            jobId
          });
        }
      }
      
      // Fallback: no items to add
      res.json({ success: true, message: "No items to add", repairOrderId, jobId });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Add item to session
  app.post("/api/parts-sessions/:sessionId/items", requireAuth, async (req, res) => {
    try {
      const session = await storage.getPartsSession(req.params.sessionId, req.user!.orgId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      const item = await storage.createPartsSessionItem({
        sessionId: session.id,
        partNumber: req.body.partNumber,
        description: req.body.description,
        brand: req.body.brand,
        supplier: req.body.supplier,
        quantity: req.body.quantity || 1,
        unitCost: req.body.price?.toString() || req.body.unitCost,
      });
      
      res.status(201).json(item);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Remove item from session
  app.delete("/api/parts-sessions/:sessionId/items/:itemId", requireAuth, async (req, res) => {
    try {
      const session = await storage.getPartsSession(req.params.sessionId, req.user!.orgId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      await storage.deletePartsSessionItem(req.params.itemId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Mark session as ordered
  app.post("/api/parts-sessions/:sessionId/order", requireAuth, async (req, res) => {
    try {
      const session = await storage.updatePartsSession(req.params.sessionId, req.user!.orgId, {
        status: 'ORDERED',
        orderedAt: new Date(),
      });
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      res.json(session);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Clear/delete session
  app.delete("/api/parts-sessions/:sessionId", requireAuth, async (req, res) => {
    try {
      await storage.deletePartsSession(req.params.sessionId, req.user!.orgId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==========================================
  // WHOLESALE / B2B ROUTES
  // ==========================================

  // Pricing Tiers
  app.get("/api/pricing-tiers", requireAuth, async (req, res) => {
    try {
      const tiers = await storage.getPricingTiersByOrg(req.user!.orgId);
      res.json(tiers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/pricing-tiers/:id", requireAuth, async (req, res) => {
    try {
      const tier = await storage.getPricingTier(req.params.id, req.user!.orgId);
      if (!tier) {
        return res.status(404).json({ message: "Pricing tier not found" });
      }
      res.json(tier);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/pricing-tiers", requireAuth, async (req, res) => {
    try {
      const tier = await storage.createPricingTier({
        ...req.body,
        orgId: req.user!.orgId,
      });
      res.status(201).json(tier);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/pricing-tiers/:id", requireAuth, async (req, res) => {
    try {
      const tier = await storage.updatePricingTier(req.params.id, req.user!.orgId, req.body);
      if (!tier) {
        return res.status(404).json({ message: "Pricing tier not found" });
      }
      res.json(tier);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/pricing-tiers/:id", requireAuth, async (req, res) => {
    try {
      await storage.deletePricingTier(req.params.id, req.user!.orgId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Wholesale Orders
  app.get("/api/wholesale-orders", requireAuth, async (req, res) => {
    try {
      const { locationId, customerId } = req.query;
      let orders;
      if (customerId) {
        const customer = await storage.getCustomer(customerId as string, req.user!.orgId);
        if (!customer) {
          return res.status(403).json({ message: "Access denied" });
        }
        orders = await storage.getWholesaleOrdersByCustomer(customerId as string, req.user!.orgId);
      } else if (locationId) {
        const location = await storage.getLocation(locationId as string);
        if (!location || location.orgId !== req.user!.orgId) {
          return res.status(403).json({ message: "Access denied" });
        }
        orders = await storage.getWholesaleOrdersByLocation(locationId as string, req.user!.orgId);
      } else {
        return res.status(400).json({ message: "locationId or customerId is required" });
      }
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/wholesale-orders/:id", requireAuth, async (req, res) => {
    try {
      const order = await storage.getWholesaleOrder(req.params.id, req.user!.orgId);
      if (!order) {
        return res.status(404).json({ message: "Wholesale order not found" });
      }
      res.json(order);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/wholesale-orders", requireAuth, async (req, res) => {
    try {
      const { locationId, customerId } = req.body;
      const location = await storage.getLocation(locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(403).json({ message: "Access denied to location" });
      }
      const customer = await storage.getCustomer(customerId, req.user!.orgId);
      if (!customer) {
        return res.status(403).json({ message: "Access denied to customer" });
      }
      const order = await storage.createWholesaleOrder({
        ...req.body,
        orgId: req.user!.orgId,
      });
      res.status(201).json(order);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/wholesale-orders/:id", requireAuth, async (req, res) => {
    try {
      const order = await storage.updateWholesaleOrder(req.params.id, req.user!.orgId, req.body);
      if (!order) {
        return res.status(404).json({ message: "Wholesale order not found" });
      }
      res.json(order);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/wholesale-orders/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteWholesaleOrder(req.params.id, req.user!.orgId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Wholesale Customers
  app.get("/api/wholesale-customers", requireAuth, async (req, res) => {
    try {
      const customers = await storage.getWholesaleCustomers(req.user!.orgId);
      res.json(customers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/customers-with-balance", requireAuth, async (req, res) => {
    try {
      const customers = await storage.getCustomersWithBalance(req.user!.orgId);
      res.json(customers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Customer Transactions (A/R Ledger)
  app.get("/api/customers/:id/transactions", requireAuth, async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.params.id, req.user!.orgId);
      if (!customer) {
        return res.status(403).json({ message: "Access denied" });
      }
      const transactions = await storage.getCustomerTransactions(req.params.id, req.user!.orgId);
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/customers/:id/transactions", requireAuth, async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.params.id, req.user!.orgId);
      if (!customer) {
        return res.status(403).json({ message: "Access denied" });
      }
      const transaction = await storage.createCustomerTransaction({
        ...req.body,
        customerId: req.params.id,
        orgId: req.user!.orgId,
      });
      res.status(201).json(transaction);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Customer Statements
  app.get("/api/customers/:id/statements", requireAuth, async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.params.id, req.user!.orgId);
      if (!customer) {
        return res.status(403).json({ message: "Access denied" });
      }
      const statements = await storage.getCustomerStatements(req.params.id, req.user!.orgId);
      res.json(statements);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/customers/:id/statements", requireAuth, async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.params.id, req.user!.orgId);
      if (!customer) {
        return res.status(403).json({ message: "Access denied" });
      }
      const statement = await storage.createCustomerStatement({
        ...req.body,
        customerId: req.params.id,
        orgId: req.user!.orgId,
      });
      res.status(201).json(statement);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============================================
  // Customer Authorization Routes (Public)
  // ============================================

  // Get authorization data by token (public)
  app.get("/api/authorize/:token", async (req, res) => {
    try {
      const ro = await storage.getRepairOrderByAuthToken(req.params.token);
      if (!ro) {
        return res.status(404).json({ message: "Authorization not found" });
      }
      
      const customer = await storage.getCustomerById(ro.customerId);
      const vehicle = await storage.getVehicleById(ro.vehicleId);
      const location = await storage.getLocation(ro.locationId);
      
      res.json({
        id: ro.id,
        roNumber: ro.roNumber,
        status: ro.status,
        authorizationStatus: ro.authorizationStatus,
        odometerIn: ro.odometerIn,
        notes: ro.notes,
        jobs: ro.jobs,
        createdAt: ro.createdAt,
        customer: customer ? {
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone,
          email: customer.email,
        } : null,
        vehicle: vehicle ? {
          year: vehicle.year,
          make: vehicle.make,
          model: vehicle.model,
          vin: vehicle.vin,
          licensePlate: vehicle.licensePlate,
        } : null,
        location: location ? {
          name: location.name,
          address: location.address,
          phone: location.phone,
        } : null,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Submit customer authorization (public)
  app.post("/api/authorize/:token", async (req, res) => {
    try {
      const { approvedItems, signature } = req.body;
      
      if (!approvedItems || !Array.isArray(approvedItems) || approvedItems.length === 0) {
        return res.status(400).json({ message: "At least one item must be approved" });
      }
      
      if (!signature) {
        return res.status(400).json({ message: "Signature is required" });
      }

      const ro = await storage.getRepairOrderByAuthToken(req.params.token);
      if (!ro) {
        return res.status(404).json({ message: "Authorization not found" });
      }

      // Update the approved items in the jobs
      const updatedJobs = ro.jobs.map(job => ({
        ...job,
        lineItems: job.lineItems.map(item => ({
          ...item,
          approved: approvedItems.includes(item.id),
        })),
      }));

      await storage.updateRepairOrder(ro.id, ro.orgId, {
        jobs: updatedJobs,
        authorizationStatus: 'AUTHORIZED',
        authorizedAt: new Date(),
        customerSignature: signature,
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Send authorization request to customer
  app.post("/api/repair-orders/:id/send-authorization", requireAuth, async (req, res) => {
    try {
      const ro = await storage.getRepairOrder(req.params.id, req.user!.orgId);
      if (!ro) {
        return res.status(404).json({ message: "Repair order not found" });
      }

      const customer = await storage.getCustomerById(ro.customerId);
      const vehicle = await storage.getVehicleById(ro.vehicleId);
      const location = await storage.getLocation(ro.locationId);

      if (!customer) {
        return res.status(400).json({ message: "Customer not found" });
      }

      // Generate auth token if not exists
      let authToken = ro.authorizationToken;
      if (!authToken) {
        authToken = crypto.randomUUID();
        await storage.updateRepairOrder(ro.id, ro.orgId, {
          authorizationToken: authToken,
        });
      }

      const { method, recipient } = req.body;
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const authUrl = `${baseUrl}/authorize/${authToken}`;
      const vehicleInfo = vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'your vehicle';
      const shopName = location?.name || 'Your Shop';

      let sendResult;
      
      // Use the provided recipient or fall back to customer's default
      const smsRecipient = recipient || customer.phone;
      const emailRecipient = recipient || customer.email;
      
      if (method === 'sms' && smsRecipient) {
        const message = `Hi ${customer.firstName}! Please review and authorize the recommended services for your ${vehicleInfo}. View here: ${authUrl} - ${shopName}`;
        sendResult = await sendSMS({ to: smsRecipient, message });
      } else if (method === 'email' && emailRecipient) {
        const subject = `Service Authorization Required - ${vehicleInfo}`;
        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="padding: 40px 30px; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);">
        <h1 style="margin: 0; color: #ffffff; font-size: 24px;">${shopName}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 30px;">
        <h2 style="margin: 0 0 20px; color: #18181b;">Hi ${customer.firstName},</h2>
        <p style="margin: 0 0 20px; color: #3f3f46; font-size: 16px; line-height: 1.6;">
          We've completed the inspection of your <strong>${vehicleInfo}</strong> and have some recommended services for your review.
        </p>
        <p style="margin: 0 0 30px; color: #3f3f46; font-size: 16px; line-height: 1.6;">
          Click the button below to review the recommendations and authorize the work.
        </p>
        <table role="presentation" cellspacing="0" cellpadding="0">
          <tr>
            <td style="background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); border-radius: 8px;">
              <a href="${authUrl}" target="_blank" style="display: inline-block; padding: 16px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                Review & Authorize Services
              </a>
            </td>
          </tr>
        </table>
        <p style="margin: 30px 0 0; color: #71717a; font-size: 14px;">
          If the button doesn't work, copy and paste this link:<br>
          <a href="${authUrl}" style="color: #2563eb;">${authUrl}</a>
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px; background-color: #f4f4f5; border-top: 1px solid #e4e4e7;">
        <p style="margin: 0; color: #71717a; font-size: 14px; text-align: center;">
          Questions? Contact us directly.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
        sendResult = await sendEmail({ to: emailRecipient, subject, html });
      } else {
        return res.status(400).json({ message: "Invalid method or missing contact info" });
      }

      if (sendResult.success) {
        await storage.updateRepairOrder(ro.id, ro.orgId, {
          authorizationSentAt: new Date(),
          authorizationSentVia: method,
        });
        res.json({ success: true, messageId: sendResult.messageId });
      } else {
        res.status(500).json({ message: sendResult.error || "Failed to send" });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ========== CANNED JOB TEMPLATES ==========

  // Get canned job templates for a location
  app.get("/api/locations/:locationId/canned-jobs", requireAuth, async (req, res) => {
    try {
      const location = await storage.getLocation(req.params.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(404).json({ message: "Location not found" });
      }

      const templates = await storage.getCannedJobTemplatesByLocation(req.params.locationId);
      
      // Fetch parts for each template
      const templatesWithParts = await Promise.all(
        templates.map(async (template) => {
          const parts = await storage.getCannedJobPartsByTemplate(template.id);
          return { ...template, parts };
        })
      );

      res.json(templatesWithParts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get single canned job template
  app.get("/api/canned-jobs/:id", requireAuth, async (req, res) => {
    try {
      const template = await storage.getCannedJobTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      const location = await storage.getLocation(template.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(404).json({ message: "Template not found" });
      }

      const parts = await storage.getCannedJobPartsByTemplate(template.id);
      res.json({ ...template, parts });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create canned job template
  app.post("/api/locations/:locationId/canned-jobs", requireAuth, async (req, res) => {
    try {
      const location = await storage.getLocation(req.params.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(404).json({ message: "Location not found" });
      }

      const result = insertCannedJobTemplateSchema.safeParse({
        ...req.body,
        locationId: req.params.locationId,
      });
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).toString() });
      }

      const template = await storage.createCannedJobTemplate(result.data);

      // Create parts if provided
      if (req.body.parts && Array.isArray(req.body.parts)) {
        for (const part of req.body.parts) {
          await storage.createCannedJobPart({
            ...part,
            templateId: template.id,
          });
        }
      }

      const parts = await storage.getCannedJobPartsByTemplate(template.id);
      res.status(201).json({ ...template, parts });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update canned job template
  app.patch("/api/canned-jobs/:id", requireAuth, async (req, res) => {
    try {
      const template = await storage.getCannedJobTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      const location = await storage.getLocation(template.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(404).json({ message: "Template not found" });
      }

      const updated = await storage.updateCannedJobTemplate(req.params.id, req.body);

      // Update parts if provided
      if (req.body.parts && Array.isArray(req.body.parts)) {
        await storage.deleteCannedJobPartsByTemplate(template.id);
        for (const part of req.body.parts) {
          await storage.createCannedJobPart({
            ...part,
            templateId: template.id,
          });
        }
      }

      const parts = await storage.getCannedJobPartsByTemplate(template.id);
      res.json({ ...updated, parts });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete canned job template
  app.delete("/api/canned-jobs/:id", requireAuth, async (req, res) => {
    try {
      const template = await storage.getCannedJobTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      const location = await storage.getLocation(template.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(404).json({ message: "Template not found" });
      }

      await storage.deleteCannedJobTemplate(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Add canned job to repair order (materialize template into RO jobs)
  app.post("/api/repair-orders/:roId/add-canned-job/:templateId", requireAuth, async (req, res) => {
    try {
      const ro = await storage.getRepairOrder(req.params.roId, req.user!.orgId);
      if (!ro) {
        return res.status(404).json({ message: "Repair order not found" });
      }

      const template = await storage.getCannedJobTemplate(req.params.templateId);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      const location = await storage.getLocation(template.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(404).json({ message: "Template not found" });
      }

      // Get template parts
      const parts = await storage.getCannedJobPartsByTemplate(template.id);

      // Get labor rate from location settings
      const laborRates = await storage.getLaborRatesByLocation(ro.locationId);
      const defaultRate = laborRates.find(r => r.isDefault) || laborRates[0];
      const laborRate = parseFloat(template.laborRate as string) || parseFloat(defaultRate?.rate as string) || 100.00;
      const laborHours = parseFloat(template.laborHours as string) || 1;

      // Create line items for this job
      const lineItems: any[] = [];

      // Add labor line item
      lineItems.push({
        id: `li-${Date.now()}`,
        type: 'LABOR',
        description: template.name,
        quantity: laborHours,
        unitCost: 0,
        unitPrice: laborRate,
        approved: false,
      });

      // Add part line items
      parts.forEach((part, index) => {
        lineItems.push({
          id: `li-${Date.now()}-${index}`,
          type: 'PART',
          description: part.description,
          partNumber: part.partNumber || '',
          quantity: parseFloat(part.quantity as string) || 1,
          unitCost: part.unitCost ? parseFloat(part.unitCost as string) : 0,
          unitPrice: part.unitPrice ? parseFloat(part.unitPrice as string) : 0,
          approved: false,
        });
      });

      // Create new job
      const newJob = {
        id: `job-${Date.now()}`,
        name: template.name,
        description: template.description || template.defaultNotes || '',
        lineItems,
      };

      // Add to existing jobs array
      const currentJobs = (ro.jobs as any[]) || [];
      const updatedJobs = [...currentJobs, newJob];

      await storage.updateRepairOrder(ro.id, req.user!.orgId, {
        jobs: updatedJobs,
      });

      const updatedRo = await storage.getRepairOrder(ro.id, req.user!.orgId);
      res.json(updatedRo);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ========== SERVICE QUEUE ==========

  // Get service queue for a location
  app.get("/api/locations/:locationId/service-queue", requireAuth, async (req, res) => {
    try {
      const location = await storage.getLocation(req.params.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(404).json({ message: "Location not found" });
      }

      const entries = await storage.getServiceQueueByLocation(req.params.locationId);
      res.json(entries);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create service queue entry (manual add)
  app.post("/api/locations/:locationId/service-queue", requireAuth, async (req, res) => {
    try {
      const location = await storage.getLocation(req.params.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(404).json({ message: "Location not found" });
      }

      const position = await storage.getNextQueuePosition(req.params.locationId);

      const result = insertServiceQueueEntrySchema.safeParse({
        ...req.body,
        locationId: req.params.locationId,
        position,
        checkInSource: req.body.checkInSource || 'WALK_IN',
      });
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).toString() });
      }

      const entry = await storage.createServiceQueueEntry(result.data);
      res.status(201).json(entry);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update service queue entry (status change, bay/tech assignment)
  app.patch("/api/service-queue/:id", requireAuth, async (req, res) => {
    try {
      const entry = await storage.getServiceQueueEntry(req.params.id);
      if (!entry) {
        return res.status(404).json({ message: "Queue entry not found" });
      }

      const location = await storage.getLocation(entry.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(404).json({ message: "Queue entry not found" });
      }

      // Handle status changes
      const updates: any = { ...req.body };
      if (req.body.status === 'IN_PROGRESS' && !entry.startTime) {
        updates.startTime = new Date();
      }
      if (req.body.status === 'COMPLETE' && !entry.completedTime) {
        updates.completedTime = new Date();
      }

      const updated = await storage.updateServiceQueueEntry(req.params.id, updates);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete service queue entry
  app.delete("/api/service-queue/:id", requireAuth, async (req, res) => {
    try {
      const entry = await storage.getServiceQueueEntry(req.params.id);
      if (!entry) {
        return res.status(404).json({ message: "Queue entry not found" });
      }

      const location = await storage.getLocation(entry.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(404).json({ message: "Queue entry not found" });
      }

      await storage.deleteServiceQueueEntry(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Start service from queue (creates RO and updates queue entry)
  app.post("/api/service-queue/:id/start-service", requireAuth, async (req, res) => {
    try {
      const entry = await storage.getServiceQueueEntry(req.params.id);
      if (!entry) {
        return res.status(404).json({ message: "Queue entry not found" });
      }

      const location = await storage.getLocation(entry.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(404).json({ message: "Queue entry not found" });
      }

      // Create RO from queue entry if customer/vehicle info exists
      if (entry.customerId && entry.vehicleId) {
        const workflow = await storage.getDefaultWorkflow(location.orgId);
        const stages = (workflow?.stages as any[]) || [];
        const firstStage = stages[0]?.name || 'New';

        const roNumber = `RO-${Date.now().toString(36).toUpperCase()}`;
        const ro = await storage.createRepairOrder({
          orgId: location.orgId,
          locationId: entry.locationId,
          customerId: entry.customerId,
          vehicleId: entry.vehicleId,
          roNumber,
          status: firstStage,
          advisorId: req.user!.id,
          technicianId: entry.assignedTechId || null,
          notes: entry.serviceDescription || entry.notes || '',
          lineItems: [],
          laborTotal: '0',
          partsTotal: '0',
          subtotal: '0',
          taxTotal: '0',
          total: '0',
        });

        // Update queue entry with RO reference and status
        await storage.updateServiceQueueEntry(entry.id, {
          repairOrderId: ro.id,
          status: 'IN_PROGRESS',
          startTime: new Date(),
        });

        return res.json({ entry: await storage.getServiceQueueEntry(entry.id), repairOrder: ro });
      }

      // Just update status if no customer/vehicle
      await storage.updateServiceQueueEntry(entry.id, {
        status: 'IN_PROGRESS',
        startTime: new Date(),
      });

      res.json({ entry: await storage.getServiceQueueEntry(entry.id) });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==========================================
  // PROTRACTOR INTEGRATION ROUTES
  // ==========================================

  // Get Protractor connection for a location
  app.get("/api/integrations/protractor/:locationId", requireAuth, async (req, res) => {
    try {
      const location = await storage.getLocation(req.params.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(404).json({ message: "Location not found" });
      }

      const connection = await storage.getProtractorConnection(req.params.locationId);
      if (!connection) {
        return res.json({ connected: false });
      }

      res.json({
        connected: true,
        isActive: connection.isActive,
        lastSyncAt: connection.lastSyncAt,
        lastError: connection.lastError,
        createdAt: connection.createdAt,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Save Protractor credentials for a location
  app.post("/api/integrations/protractor/:locationId/credentials", requireAuth, async (req, res) => {
    try {
      const location = await storage.getLocation(req.params.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(404).json({ message: "Location not found" });
      }

      const { connectionId, apiKey, authentication } = req.body;
      if (!connectionId || !apiKey || !authentication) {
        return res.status(400).json({ message: "connectionId, apiKey, and authentication are required" });
      }

      // Check if connection already exists
      const existing = await storage.getProtractorConnection(req.params.locationId);
      
      if (existing) {
        const updated = await storage.updateProtractorConnection(existing.id, {
          connectionId,
          apiKey,
          authentication,
          isActive: true,
          lastError: null,
        });
        return res.json({ success: true, connection: updated });
      }

      const connection = await storage.createProtractorConnection({
        locationId: req.params.locationId,
        connectionId,
        apiKey,
        authentication,
      });

      res.json({ success: true, connection });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Test Protractor connection
  app.post("/api/integrations/protractor/:locationId/test", requireAuth, async (req, res) => {
    try {
      const location = await storage.getLocation(req.params.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(404).json({ message: "Location not found" });
      }

      // Allow testing with provided credentials or saved credentials
      let connectionId = req.body.connectionId;
      let apiKey = req.body.apiKey;
      let authentication = req.body.authentication;

      if (!connectionId || !apiKey || !authentication) {
        const connection = await storage.getProtractorConnection(req.params.locationId);
        if (!connection) {
          return res.status(400).json({ message: "No credentials provided or saved" });
        }
        connectionId = connection.connectionId;
        apiKey = connection.apiKey;
        authentication = connection.authentication;
      }

      const client = createProtractorClient(connectionId, apiKey, authentication);
      const result = await client.testConnection();

      if (result.success) {
        // Update last sync time on success
        const connection = await storage.getProtractorConnection(req.params.locationId);
        if (connection) {
          await storage.updateProtractorConnection(connection.id, {
            lastSyncAt: new Date(),
            lastError: null,
          });
        }
      }

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // ==========================================
  // PROTRACTOR MIGRATION ENDPOINTS (One-time import)
  // These endpoints accept credentials in the request body for one-time data migration
  // Credentials are NOT stored permanently - only used for the import session
  // ==========================================

  // Test Protractor connection with provided credentials (one-time, no storage)
  app.post("/api/migration/protractor/test", requireAuth, async (req, res) => {
    try {
      const { connectionId, apiKey } = req.body;
      
      if (!connectionId || !apiKey) {
        return res.status(400).json({ 
          success: false, 
          message: "Connection ID and API Key are required" 
        });
      }

      const client = createProtractorClient(connectionId, apiKey);
      const result = await client.testConnection();
      
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Track active migration connections for cleanup (connection ID -> location ID)
  const activeMigrationConnections: Map<string, string> = new Map();

  // Start one-time migration import
  app.post("/api/migration/protractor/import", requireAuth, async (req, res) => {
    try {
      const { connectionId, apiKey, startDate, endDate } = req.body;
      
      if (!connectionId || !apiKey) {
        return res.status(400).json({ message: "Connection ID and API Key are required" });
      }

      const user = req.user!;
      
      // Get user's default location for the import (use first location from locationIds array)
      const userLocationId = user.locationId || (user.locationIds && user.locationIds[0]);
      if (!userLocationId) {
        return res.status(400).json({ message: "User has no assigned location" });
      }
      
      const location = await storage.getLocation(userLocationId);
      if (!location) {
        return res.status(400).json({ message: "User location not found" });
      }

      // Check if there's already a connection for this location (don't overwrite)
      const existingConnection = await storage.getProtractorConnection(location.id);
      if (existingConnection) {
        return res.status(400).json({ 
          message: "This location already has a Protractor connection. Please use the integration settings to manage it." 
        });
      }

      // Create a temporary connection record for the import job
      // This will be deleted after import completes
      const tempConnection = await storage.createProtractorConnection({
        locationId: location.id,
        connectionId,
        apiKey,
        authentication: '', // Will be computed by client
      });

      // Track for cleanup
      activeMigrationConnections.set(tempConnection.id, location.id);

      // Create the import job
      const job = await storage.createProtractorImportJob({
        connectionId: tempConnection.id,
        locationId: location.id,
        importType: 'FULL',
        status: 'PENDING',
        startDate: startDate ? new Date(startDate) : new Date(new Date().setFullYear(new Date().getFullYear() - 5)),
        endDate: endDate ? new Date(endDate) : new Date(),
      });

      // Start the import process asynchronously
      runProtractorImport(job.id, tempConnection, location, user.orgId)
        .catch(err => {
          console.error(`Migration job ${job.id} failed:`, err);
        })
        .finally(async () => {
          // Clean up: delete the temporary connection after import
          try {
            if (activeMigrationConnections.has(tempConnection.id)) {
              await storage.deleteProtractorConnection(location.id);
              activeMigrationConnections.delete(tempConnection.id);
              console.log(`[Migration] Cleaned up temporary connection for location ${location.id}`);
            }
          } catch (e) {
            console.error(`[Migration] Failed to clean up connection:`, e);
          }
        });

      res.json({ success: true, jobId: job.id });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get migration job status
  app.get("/api/migration/protractor/status/:jobId", requireAuth, async (req, res) => {
    try {
      const job = await storage.getProtractorImportJob(req.params.jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      const location = await storage.getLocation(job.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(404).json({ message: "Job not found" });
      }

      // Return status without exposing any connection details
      res.json({
        status: job.status,
        totalRecords: job.totalRecords || 0,
        processedRecords: job.processedRecords || 0,
        failedRecords: job.failedRecords || 0,
        currentPhase: job.status === 'RUNNING' ? 'Importing records...' : undefined,
        errorLog: job.status === 'FAILED' || job.status === 'COMPLETED' ? job.errorLog : undefined,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==========================================
  // END PROTRACTOR MIGRATION ENDPOINTS
  // ==========================================

  // Delete Protractor connection
  app.delete("/api/integrations/protractor/:locationId", requireAuth, async (req, res) => {
    try {
      const location = await storage.getLocation(req.params.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(404).json({ message: "Location not found" });
      }

      await storage.deleteProtractorConnection(req.params.locationId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get import jobs for a location
  app.get("/api/integrations/protractor/:locationId/jobs", requireAuth, async (req, res) => {
    try {
      const location = await storage.getLocation(req.params.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(404).json({ message: "Location not found" });
      }

      const jobs = await storage.getProtractorImportJobs(req.params.locationId);
      res.json(jobs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Start an import job
  app.post("/api/integrations/protractor/:locationId/import", requireAuth, async (req, res) => {
    try {
      const location = await storage.getLocation(req.params.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(404).json({ message: "Location not found" });
      }

      const connection = await storage.getProtractorConnection(req.params.locationId);
      if (!connection) {
        return res.status(400).json({ message: "Protractor not connected for this location" });
      }

      const { importType, startDate, endDate } = req.body;
      if (!importType) {
        return res.status(400).json({ message: "importType is required" });
      }

      // Create the import job
      const job = await storage.createProtractorImportJob({
        connectionId: connection.id,
        locationId: req.params.locationId,
        importType,
        status: 'PENDING',
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      });

      // Start the import process asynchronously
      runProtractorImport(job.id, connection, location, req.user!.orgId).catch(err => {
        console.error(`Import job ${job.id} failed:`, err);
      });

      res.json({ success: true, job });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get import job status
  app.get("/api/integrations/protractor/jobs/:jobId", requireAuth, async (req, res) => {
    try {
      const job = await storage.getProtractorImportJob(req.params.jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      const location = await storage.getLocation(job.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(404).json({ message: "Job not found" });
      }

      res.json(job);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Quick test using environment variables (for demo purposes)
  app.post("/api/integrations/protractor/test-env", requireAuth, async (req, res) => {
    try {
      const client = createProtractorClientFromEnv();
      if (!client) {
        return res.status(400).json({ success: false, message: "Protractor credentials not configured in environment" });
      }

      const result = await client.testConnection();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Fetch contacts from Protractor (preview)
  app.get("/api/integrations/protractor/:locationId/preview/contacts", requireAuth, async (req, res) => {
    try {
      const location = await storage.getLocation(req.params.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(404).json({ message: "Location not found" });
      }

      const connection = await storage.getProtractorConnection(req.params.locationId);
      if (!connection) {
        return res.status(400).json({ message: "Protractor not connected" });
      }

      const client = createProtractorClient(connection.connectionId, connection.apiKey, connection.authentication);
      const contacts = await client.getAllContacts();
      
      res.json({ count: contacts.length, contacts: contacts.slice(0, 20) }); // Return first 20 for preview
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Debug: Fetch raw invoices to see actual API field names
  app.get("/api/integrations/protractor/:locationId/debug/invoices", requireAuth, async (req, res) => {
    try {
      const location = await storage.getLocation(req.params.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(404).json({ message: "Location not found" });
      }

      const connection = await storage.getProtractorConnection(req.params.locationId);
      if (!connection) {
        return res.status(400).json({ message: "Protractor not connected" });
      }

      const client = createProtractorClient(connection.connectionId, connection.apiKey, connection.authentication);
      
      // Get invoices from last 30 days
      const endDate = new Date();
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const invoices = await client.getInvoices(startDate, endDate);
      
      // Return first 5 invoices with ALL their fields (raw data)
      const rawInvoices = invoices.slice(0, 5);
      
      // Also fetch a single invoice by ID to get full details if we have any
      let singleInvoiceDetail = null;
      if (invoices.length > 0 && invoices[0].ID) {
        try {
          singleInvoiceDetail = await client.getInvoice(invoices[0].ID);
        } catch (e) {
          console.log("Could not fetch single invoice detail:", e);
        }
      }
      
      res.json({ 
        count: invoices.length, 
        rawInvoicesFromList: rawInvoices,
        singleInvoiceDetail,
        fieldNames: rawInvoices.length > 0 ? Object.keys(rawInvoices[0]) : [],
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Debug: Search for invoice by invoice number and get full schema
  app.get("/api/integrations/protractor/:locationId/debug/invoice-by-number/:invoiceNumber", requireAuth, async (req, res) => {
    try {
      const location = await storage.getLocation(req.params.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(404).json({ message: "Location not found" });
      }

      const connection = await storage.getProtractorConnection(req.params.locationId);
      if (!connection) {
        return res.status(400).json({ message: "Protractor not connected" });
      }

      const client = createProtractorClient(connection.connectionId, connection.apiKey, connection.authentication);
      
      // Fetch invoices from a date range that would include 10/24/2025
      const startDate = new Date('2025-10-01');
      const endDate = new Date('2025-10-31');
      
      const invoices = await client.getInvoices(startDate, endDate);
      const targetNumber = parseInt(req.params.invoiceNumber);
      
      // Find the invoice by number
      const matchingInvoice = invoices.find((inv: any) => 
        inv.InvoiceNumber === targetNumber || inv.invoiceNumber === targetNumber
      );
      
      if (!matchingInvoice) {
        return res.json({ 
          message: `Invoice ${targetNumber} not found in date range`,
          invoicesFound: invoices.length,
          sampleNumbers: invoices.slice(0, 10).map((i: any) => i.InvoiceNumber || i.invoiceNumber)
        });
      }
      
      // Fetch full invoice details
      const fullInvoice = await client.getInvoice(matchingInvoice.ID || matchingInvoice.Header?.ID);
      
      res.json({ 
        invoice: fullInvoice,
        fieldNames: Object.keys(fullInvoice),
        allFields: JSON.stringify(fullInvoice, null, 2)
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Debug: Fetch a specific invoice with all details
  app.get("/api/integrations/protractor/:locationId/debug/invoice/:invoiceId", requireAuth, async (req, res) => {
    try {
      const location = await storage.getLocation(req.params.locationId);
      if (!location || location.orgId !== req.user!.orgId) {
        return res.status(404).json({ message: "Location not found" });
      }

      const connection = await storage.getProtractorConnection(req.params.locationId);
      if (!connection) {
        return res.status(400).json({ message: "Protractor not connected" });
      }

      const client = createProtractorClient(connection.connectionId, connection.apiKey, connection.authentication);
      const invoice = await client.getInvoice(req.params.invoiceId);
      
      res.json({ 
        invoice,
        fieldNames: Object.keys(invoice),
        allFields: JSON.stringify(invoice, null, 2),
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Register messaging routes
  setupMessagingRoutes(app);

  return httpServer;
}

// Import orchestrator function
async function runProtractorImport(
  jobId: string, 
  connection: any, 
  location: any, 
  orgId: string
) {
  const client = createProtractorClient(
    connection.connectionId, 
    connection.apiKey, 
    connection.authentication
  );

  const job = await storage.getProtractorImportJob(jobId);
  if (!job) return;

  try {
    await storage.updateProtractorImportJob(jobId, {
      status: 'RUNNING',
      startedAt: new Date(),
    });

    const errors: Array<{ record: string; error: string; timestamp: string }> = [];
    let totalRecords = 0;
    let processedRecords = 0;
    let failedRecords = 0;

    // Get the default workflow for creating ROs
    const workflow = await storage.getDefaultWorkflow(orgId);
    if (!workflow) {
      throw new Error("No default workflow found");
    }

    // First, get all Protractor locations to iterate through
    console.log(`[Protractor Import ${jobId}] Fetching Protractor locations...`);
    const protractorLocations = await client.getLocations();
    console.log(`[Protractor Import ${jobId}] Found ${protractorLocations.length} Protractor location(s)`);

    // If no locations found, try fetching without location filter (some Protractor accounts may not use locations)
    const locationIds = protractorLocations.length > 0 
      ? protractorLocations.map(l => l.ID) 
      : [undefined]; // undefined means no location filter

    // Check if we should skip customer/vehicle phases (for INVOICES_ONLY or when already imported)
    const existingCustomerCount = (await storage.getCustomersByOrg(orgId)).filter(c => c.protractorId).length;
    const existingVehicleCount = (await storage.getVehiclesByOrg(orgId)).filter(v => v.protractorId).length;
    
    const skipCustomerPhase = job.importType === 'INVOICES_ONLY' || job.importType === 'WORK_ORDERS' ||
      (job.importType === 'FULL' && existingCustomerCount > 1000); // Skip if we already have lots of customers
    const skipVehiclePhase = job.importType === 'INVOICES_ONLY' || job.importType === 'WORK_ORDERS' ||
      (job.importType === 'FULL' && existingVehicleCount > 1000); // Skip if we already have lots of vehicles
    
    if (skipCustomerPhase) {
      console.log(`[Protractor Import ${jobId}] Skipping customer phase - ${existingCustomerCount} customers already imported`);
    }
    if (skipVehiclePhase) {
      console.log(`[Protractor Import ${jobId}] Skipping vehicle phase - ${existingVehicleCount} vehicles already imported`);
    }

    // Import contacts (customers) from all Protractor locations
    if (!skipCustomerPhase && (job.importType === 'FULL' || job.importType === 'CUSTOMERS')) {
      console.log(`[Protractor Import ${jobId}] Fetching contacts...`);
      
      const allContacts: Map<string, any> = new Map();
      for (const protractorLocationId of locationIds) {
        try {
          const contacts = await client.getAllContacts(protractorLocationId);
          console.log(`[Protractor Import ${jobId}] Found ${contacts.length} contacts from location ${protractorLocationId || 'default'}`);
          for (const contact of contacts) {
            if (contact.ID && !allContacts.has(contact.ID)) {
              allContacts.set(contact.ID, contact);
            }
          }
        } catch (err: any) {
          console.log(`[Protractor Import ${jobId}] Error fetching contacts from location ${protractorLocationId}: ${err.message}`);
        }
      }
      
      const contacts = Array.from(allContacts.values());
      totalRecords += contacts.length;
      console.log(`[Protractor Import ${jobId}] Total unique contacts to import: ${contacts.length}`);

      for (const contact of contacts) {
        try {
          // Check if customer already exists by protractorId
          const existing = await storage.getCustomerByProtractorId(orgId, contact.ID);
          
          const customerData = {
            orgId,
            firstName: contact.Name?.FirstName || 'Unknown',
            lastName: contact.Name?.LastName || contact.FileAs || 'Customer',
            email: contact.Email || '',
            phone: contact.Phone1 || '',
            address: contact.Address ? 
              `${contact.Address.Street || ''}, ${contact.Address.City || ''}, ${contact.Address.Province || ''} ${contact.Address.PostalCode || ''}`.trim() 
              : '',
            companyName: contact.Company || null,
            marketingConsent: !contact.NoEmail && !contact.NoMessaging,
            notes: contact.Note || null,
            protractorId: contact.ID,
            legacySystem: 'protractor' as const,
            legacyId: contact.ID,
          };

          if (existing) {
            await storage.updateCustomer(existing.id, orgId, customerData);
          } else {
            await storage.createCustomer(customerData);
          }
          processedRecords++;
        } catch (err: any) {
          failedRecords++;
          errors.push({
            record: `Contact: ${contact.FileAs || contact.ID}`,
            error: err.message,
            timestamp: new Date().toISOString(),
          });
        }

        // Update progress periodically
        if (processedRecords % 10 === 0) {
          await storage.updateProtractorImportJob(jobId, {
            totalRecords,
            processedRecords,
            failedRecords,
            errorLog: errors,
          });
        }
      }
    }

    // Import vehicles
    if (!skipVehiclePhase && (job.importType === 'FULL' || job.importType === 'VEHICLES')) {
      console.log(`[Protractor Import ${jobId}] Fetching vehicles...`);
      
      // Get all customers with protractor IDs to fetch their vehicles
      const customersWithProtractor = await storage.getCustomersByOrg(orgId);
      const protractorCustomers = customersWithProtractor.filter(c => c.protractorId);

      for (const customer of protractorCustomers) {
        try {
          // Try fetching vehicles from all locations
          const allVehicles: Map<string, any> = new Map();
          for (const protractorLocationId of locationIds) {
            try {
              const vehicles = await client.getServiceItemsByOwner(customer.protractorId!, protractorLocationId);
              for (const vehicle of vehicles) {
                if (vehicle.ID && !allVehicles.has(vehicle.ID)) {
                  allVehicles.set(vehicle.ID, vehicle);
                }
              }
            } catch (e) {
              // Continue on error
            }
          }
          
          const vehicles = Array.from(allVehicles.values());
          totalRecords += vehicles.length;

          for (const vehicle of vehicles) {
            try {
              const existing = await storage.getVehicleByProtractorId(vehicle.ID);

              const vehicleData = {
                customerId: customer.id,
                orgId,
                vin: vehicle.VIN || '',
                year: vehicle.Year || 0,
                make: vehicle.Make || 'Unknown',
                model: vehicle.Model || 'Unknown',
                trim: vehicle.SubModel || null,
                licensePlate: vehicle.LicensePlate || vehicle.LookUp || '',
                mileage: vehicle.Mileage || null,
                color: vehicle.Color || null,
                notes: vehicle.Note || null,
                protractorId: vehicle.ID,
                legacySystem: 'protractor' as const,
                legacyId: vehicle.ID,
              };

              if (existing) {
                await storage.updateVehicle(existing.id, vehicleData);
              } else {
                await storage.createVehicle(vehicleData);
              }
              processedRecords++;
            } catch (err: any) {
              failedRecords++;
              errors.push({
                record: `Vehicle: ${vehicle.VIN || vehicle.ID}`,
                error: err.message,
                timestamp: new Date().toISOString(),
              });
            }
          }
        } catch (err: any) {
          errors.push({
            record: `Vehicles for customer: ${customer.firstName} ${customer.lastName}`,
            error: err.message,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    // Import work orders / invoices
    if (job.importType === 'FULL' || job.importType === 'WORK_ORDERS' || job.importType === 'INVOICES') {
      console.log(`[Protractor Import ${jobId}] Fetching invoices...`);
      
      const startDate = job.startDate || new Date('2020-01-01'); // Default to 5+ years of history
      const endDate = job.endDate || new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow to ensure we get today's invoices

      try {
        // Fetch invoices from all locations
        const allInvoices: Map<string, any> = new Map();
        for (const protractorLocationId of locationIds) {
          try {
            const locationInvoices = await client.getInvoices(startDate, endDate, protractorLocationId);
            console.log(`[Protractor Import ${jobId}] Found ${locationInvoices.length} invoices from location ${protractorLocationId || 'default'}`);
            for (const invoice of locationInvoices) {
              if (invoice.ID && !allInvoices.has(invoice.ID)) {
                allInvoices.set(invoice.ID, invoice);
              }
            }
          } catch (e: any) {
            console.log(`[Protractor Import ${jobId}] Error fetching invoices from location ${protractorLocationId}: ${e.message}`);
          }
        }
        
        const invoices = Array.from(allInvoices.values());
        console.log(`[Protractor Import ${jobId}] Total unique invoices to import: ${invoices.length}`);
        
        // Log the first invoice's raw structure to see all field names
        if (invoices.length > 0) {
          console.log(`[Protractor Import ${jobId}] FIRST INVOICE RAW STRUCTURE:`);
          console.log(`[Protractor Import ${jobId}] Field names: ${Object.keys(invoices[0]).join(', ')}`);
          console.log(`[Protractor Import ${jobId}] Raw data: ${JSON.stringify(invoices[0], null, 2)}`);
          
          // Try fetching Invoice for full details including Summary field with totals
          try {
            const singleInvoice = await client.getInvoice(invoices[0].ID);
            console.log(`[Protractor Import ${jobId}] SINGLE INVOICE DETAIL STRUCTURE:`);
            console.log(`[Protractor Import ${jobId}] Detail field names: ${Object.keys(singleInvoice).join(', ')}`);
            console.log(`[Protractor Import ${jobId}] Detail raw data (first 8000 chars): ${JSON.stringify(singleInvoice, null, 2).substring(0, 8000)}`);
            
            // Log Summary field specifically if present
            if ((singleInvoice as any).Summary) {
              console.log(`[Protractor Import ${jobId}] Invoice Summary: ${JSON.stringify((singleInvoice as any).Summary, null, 2)}`);
            }
          } catch (e: any) {
            console.log(`[Protractor Import ${jobId}] Could not fetch single invoice detail: ${e.message}`);
          }
        }
        
        totalRecords += invoices.length;
        
        // Update job with total records count
        await storage.updateProtractorImportJob(jobId, {
          totalRecords,
        });
        console.log(`[Protractor Import ${jobId}] Starting invoice processing: ${invoices.length} invoices`);

        for (const listInvoice of invoices) {
          try {
            // Fetch full Invoice details - includes Contact/ServiceItem and Summary with totals
            // Note: WorkOrder endpoint returns null, so we use Invoice endpoint
            let invoice = listInvoice;
            try {
              const fullInvoice = await client.getInvoice(listInvoice.ID);
              invoice = fullInvoice;
              
              // Log first detailed invoice for debugging - show ALL fields
              if (processedRecords === 0 && failedRecords === 0) {
                console.log(`[Protractor Import ${jobId}] FIRST FULL INVOICE FIELDS: ${Object.keys(invoice).join(', ')}`);
                console.log(`[Protractor Import ${jobId}] FIRST FULL INVOICE DATA: ${JSON.stringify(invoice, null, 2).substring(0, 10000)}`);
                // Check for various possible field name patterns
                const possibleContactFields = ['ContactID', 'contactId', 'ContactId', 'contact_id', 'Contact', 'customerId', 'CustomerID', 'Owner', 'OwnerID'];
                const possibleVehicleFields = ['ServiceItemID', 'serviceItemId', 'ServiceItemId', 'service_item_id', 'ServiceItem', 'vehicleId', 'VehicleID', 'Vehicle'];
                console.log(`[Protractor Import ${jobId}] Contact field check: ${possibleContactFields.map(f => `${f}=${(invoice as any)[f]}`).join(', ')}`);
                console.log(`[Protractor Import ${jobId}] Vehicle field check: ${possibleVehicleFields.map(f => `${f}=${(invoice as any)[f]}`).join(', ')}`);
                
                // Log Summary and ServicePackages structure for debugging
                if ((invoice as any).Summary) {
                  console.log(`[Protractor Import ${jobId}] Summary field: ${JSON.stringify((invoice as any).Summary, null, 2)}`);
                }
                if (invoice.ServicePackages) {
                  console.log(`[Protractor Import ${jobId}] ServicePackages structure: ${JSON.stringify(invoice.ServicePackages, null, 2).substring(0, 5000)}`);
                }
              }
            } catch (e: any) {
              console.log(`[Protractor Import ${jobId}] Could not fetch invoice detail for ${listInvoice.ID}: ${e.message}`);
            }
            
            // Try multiple field name patterns for customer/contact reference
            // IMPORTANT: Protractor embeds Contact as an object with nested ID, not as a scalar ContactID
            const contactId = (invoice as any).Contact?.ID ||
                             (invoice as any).Contact?.Header?.ID ||
                             (invoice as any).ContactID || 
                             (invoice as any).contactId || 
                             (invoice as any).Owner?.ID ||
                             (invoice as any).OwnerID ||
                             (invoice as any).CustomerID ||
                             (invoice as any).customerId;
            
            // Try multiple field name patterns for vehicle/service item reference
            // IMPORTANT: Protractor embeds ServiceItem as an object with nested ID, not as a scalar ServiceItemID
            const serviceItemId = (invoice as any).ServiceItem?.ID ||
                                  (invoice as any).ServiceItem?.Header?.ID ||
                                  (invoice as any).ServiceItemID || 
                                  (invoice as any).serviceItemId || 
                                  (invoice as any).Vehicle?.ID ||
                                  (invoice as any).VehicleID ||
                                  (invoice as any).vehicleId;
            
            // Extract VIN from Protractor invoice for fallback matching
            const invoiceVin = (invoice as any).ServiceItem?.VIN ||
                              (invoice as any).ServiceItem?.Vin ||
                              (invoice as any).VIN ||
                              (invoice as any).Vin ||
                              (invoice as any).Vehicle?.VIN ||
                              (invoice as any).Vehicle?.Vin;
            
            // Log what we found for first invoice
            if (processedRecords === 0 && failedRecords === 0) {
              console.log(`[Protractor Import ${jobId}] Extracted contactId: ${contactId}, serviceItemId: ${serviceItemId}, VIN: ${invoiceVin}`);
            }
            
            // Find customer by protractor contact ID
            const customer = contactId ? 
              await storage.getCustomerByProtractorId(orgId, contactId) : null;
            
            // Find vehicle by protractor service item ID, or by customer relationship if not available
            let vehicle = serviceItemId ?
              await storage.getVehicleByProtractorId(serviceItemId) : null;

            // If no vehicle found by serviceItemId, try VIN matching first
            if (!vehicle && invoiceVin) {
              vehicle = await storage.getVehicleByVin(invoiceVin, orgId);
              if (vehicle) {
                console.log(`[Protractor Import ${jobId}] Invoice ${invoice.InvoiceNumber || invoice.ID}: Matched vehicle by VIN ${invoiceVin}`);
              }
            }

            // If still no vehicle, try to find through customer relationship
            if (!vehicle && customer) {
              const customerVehicles = await storage.getVehiclesByCustomer(customer.id);
              if (customerVehicles.length === 1) {
                // Customer has exactly one vehicle - use it
                vehicle = customerVehicles[0];
              } else if (customerVehicles.length > 1) {
                // Customer has multiple vehicles - try VIN match within their vehicles
                if (invoiceVin) {
                  const vinMatch = customerVehicles.find(v => 
                    v.vin?.toUpperCase().trim() === invoiceVin.toUpperCase().trim()
                  );
                  if (vinMatch) {
                    vehicle = vinMatch;
                    console.log(`[Protractor Import ${jobId}] Invoice ${invoice.InvoiceNumber || invoice.ID}: Matched vehicle by VIN within customer's ${customerVehicles.length} vehicles`);
                  }
                }
                
                // If still no match, fail with informative message
                if (!vehicle) {
                  failedRecords++;
                  // Log raw ServiceItem data for debugging (first 5 failures only)
                  if (failedRecords <= 5) {
                    console.log(`[Protractor Import ${jobId}] FAILED Invoice ${invoice.InvoiceNumber}: ServiceItem RAW = ${JSON.stringify((invoice as any).ServiceItem, null, 2)}`);
                  }
                  errors.push({
                    record: `Invoice: ${invoice.InvoiceNumber || invoice.ID}`,
                    error: `Customer has ${customerVehicles.length} vehicles - cannot determine which vehicle was serviced${invoiceVin ? ` (VIN ${invoiceVin} not found)` : ' (no VIN in invoice)'}`,
                    timestamp: new Date().toISOString(),
                  });
                  continue;
                }
              }
            }

            if (!customer || !vehicle) {
              // Skip if we don't have the customer or vehicle
              failedRecords++;
              // Log raw ServiceItem data for debugging (first 5 failures only)
              if (failedRecords <= 5) {
                console.log(`[Protractor Import ${jobId}] FAILED Invoice ${invoice.InvoiceNumber}: ServiceItem RAW = ${JSON.stringify((invoice as any).ServiceItem, null, 2)}`);
              }
              errors.push({
                record: `Invoice: ${invoice.InvoiceNumber || invoice.ID}`,
                error: `Missing customer (${contactId}) or vehicle (${serviceItemId})${invoiceVin ? ` - VIN ${invoiceVin} not found in system` : ''}`,
                timestamp: new Date().toISOString(),
              });
              continue;
            }

            const existing = await storage.getRepairOrderByProtractorId(orgId, invoice.ID);

            // Debug: Log invoice totals if available
            if (invoice.TotalLabor || invoice.TotalParts || invoice.GrandTotal || (invoice as any).Totals) {
              console.log(`[Protractor API] Invoice ${invoice.InvoiceNumber || invoice.ID} Totals: Labor=${invoice.TotalLabor}, Parts=${invoice.TotalParts}, Grand=${invoice.GrandTotal}, Totals=${JSON.stringify((invoice as any).Totals)}`);
            }

            // Normalize ServicePackages to always be an array
            // Protractor may return: array, single object, null, undefined, or ItemCollection wrapper
            let servicePackages: any[] = [];
            const rawPackages = invoice.ServicePackages || invoice.servicePackages;
            
            if (Array.isArray(rawPackages)) {
              servicePackages = rawPackages;
            } else if (rawPackages && typeof rawPackages === 'object') {
              // Handle ItemCollection wrapper or single object
              if (rawPackages.ItemCollection && Array.isArray(rawPackages.ItemCollection)) {
                servicePackages = rawPackages.ItemCollection;
              } else if (rawPackages.ServicePackage) {
                // Single ServicePackage wrapper
                servicePackages = Array.isArray(rawPackages.ServicePackage) 
                  ? rawPackages.ServicePackage 
                  : [rawPackages.ServicePackage];
              } else {
                // It's a single service package object
                servicePackages = [rawPackages];
              }
            }
            
            // Map service packages to jobs and calculate totals from line items
            let calculatedTotalLabor = 0;
            let calculatedTotalParts = 0;
            let calculatedTotalSublet = 0;
            
            const jobs = servicePackages.map((pkg: any, idx: number) => {
              // Normalize Lines array - Protractor uses ServicePackageLines.ItemCollection
              let lines: any[] = [];
              const rawLines = pkg.ServicePackageLines || pkg.Lines || pkg.lines || pkg.LineItems || pkg.lineItems;
              
              if (Array.isArray(rawLines)) {
                lines = rawLines;
              } else if (rawLines && typeof rawLines === 'object') {
                if (rawLines.ItemCollection && Array.isArray(rawLines.ItemCollection)) {
                  lines = rawLines.ItemCollection;
                } else if (rawLines.Line) {
                  lines = Array.isArray(rawLines.Line) ? rawLines.Line : [rawLines.Line];
                } else {
                  lines = [rawLines];
                }
              }
              
              // Get job name from ServicePackageHeader (Protractor structure)
              const jobTitle = pkg.ServicePackageHeader?.Title || pkg.Title || pkg.title || pkg.Name || pkg.name || 'Service';
              const jobDescription = pkg.ServicePackageHeader?.Description || pkg.Description || pkg.description || '';
              
              // Map line items and calculate totals
              const mappedLineItems = lines.map((line: any, lineIdx: number) => {
                const lineType = line.Type || line.type;
                const lineTotal = parseFloat(line.ExtendedTotal || line.Total || line.SellPrice || line.sellPrice || line.Price || line.price || 0);
                
                // Accumulate totals by type
                if (lineType === 'Labor') {
                  calculatedTotalLabor += lineTotal;
                } else if (lineType === 'Material' || lineType === 'Part') {
                  calculatedTotalParts += lineTotal;
                } else if (lineType === 'Sublet') {
                  calculatedTotalSublet += lineTotal;
                }
                
                return {
                  id: `line-${idx}-${lineIdx}`,
                  type: lineType === 'Labor' ? 'LABOR' 
                      : (lineType === 'Material' || lineType === 'Part') ? 'PART' 
                      : lineType === 'Sublet' ? 'SUBLET' : 'FEE',
                  description: line.Description || line.description || '',
                  quantity: parseFloat(line.Quantity || line.quantity || 1),
                  unitCost: parseFloat(line.TotalCost || line.Cost || line.cost || 0),
                  unitPrice: lineTotal,
                  approved: true,
                  manufacturer: line.Manufacturer || line.manufacturer || null,
                  partNumber: line.PartNumber || line.partNumber || null,
                };
              });
              
              return {
                id: `job-${idx}`,
                name: jobTitle,
                description: jobDescription,
                lineItems: mappedLineItems,
              };
            });
            
            // Use Summary field if available (contains accurate totals including fees and taxes)
            // Otherwise fall back to calculated totals from line items
            const summary = (invoice as any).Summary;
            const summaryLaborTotal = summary?.LaborTotal;
            const summaryPartsTotal = summary?.PartsTotal;
            const summarySubletTotal = summary?.SubletTotal;
            const summaryTaxTotal = summary?.TaxTotal;
            const summaryGrandTotal = summary?.GrandTotal;
            
            // Log totals comparison for first invoice
            if (processedRecords === 0 && failedRecords === 0) {
              console.log(`[Protractor Import ${jobId}] Calculated from lines: Labor=$${calculatedTotalLabor.toFixed(2)}, Parts=$${calculatedTotalParts.toFixed(2)}, Sublet=$${calculatedTotalSublet.toFixed(2)}`);
              console.log(`[Protractor Import ${jobId}] Summary field: Labor=$${summaryLaborTotal || 'N/A'}, Parts=$${summaryPartsTotal || 'N/A'}, Sublet=$${summarySubletTotal || 'N/A'}, Tax=$${summaryTaxTotal || 'N/A'}, Grand=$${summaryGrandTotal || 'N/A'}`);
              console.log(`[Protractor Import ${jobId}] Jobs count: ${jobs.length}, Total line items: ${jobs.reduce((sum, j) => sum + j.lineItems.length, 0)}`);
            }

            const roData = {
              orgId,
              locationId: location.id,
              customerId: customer.id,
              vehicleId: vehicle.id,
              advisorId: null as any, // Will need to map service advisor
              workflowId: workflow.id,
              status: 'INVOICED',
              jobs,
              notes: invoice.Note || '',
              odometerIn: invoice.Mileage || 0,
              completedAt: invoice.CompletedDate ? new Date(invoice.CompletedDate) : null,
              protractorId: invoice.ID,
              protractorInvoiceNumber: invoice.InvoiceNumber || invoice.Number,
              totalLabor: summaryLaborTotal ?? (calculatedTotalLabor > 0 ? calculatedTotalLabor : null),
              totalParts: summaryPartsTotal ?? (calculatedTotalParts > 0 ? calculatedTotalParts : null),
              totalSublet: summarySubletTotal ?? (calculatedTotalSublet > 0 ? calculatedTotalSublet : null),
              totalTax: summaryTaxTotal ?? (invoice.TotalTax || null),
              grandTotal: summaryGrandTotal ?? ((calculatedTotalLabor + calculatedTotalParts + calculatedTotalSublet) > 0 
                ? (calculatedTotalLabor + calculatedTotalParts + calculatedTotalSublet)
                : null),
              legacySystem: 'protractor' as const,
              legacyId: invoice.ID,
              legacyInvoiceNumber: invoice.InvoiceNumber || invoice.Number,
              originalInvoiceDate: invoice.InvoiceTime ? new Date(invoice.InvoiceTime) : null,
            };

            if (existing) {
              // For updates, preserve existing advisorId - don't overwrite with null
              const { advisorId, ...updateData } = roData;
              await storage.updateRepairOrder(existing.id, orgId, updateData);
            } else {
              // For new ROs, we need an advisor - use the first available user
              const users = await storage.getUsersByOrg(orgId);
              const advisor = users.find(u => u.role === 'ADVISOR' || u.role === 'OWNER' || u.role === 'MANAGER');
              if (advisor) {
                roData.advisorId = advisor.id;
                await storage.createRepairOrder(roData);
              } else {
                throw new Error('No advisor found to assign repair order');
              }
            }
            
            // Extract and store deferred work from DeferredServicePackages
            let deferredPackages: any[] = [];
            const rawDeferred = (invoice as any).DeferredServicePackages;
            
            if (Array.isArray(rawDeferred)) {
              deferredPackages = rawDeferred;
            } else if (rawDeferred && typeof rawDeferred === 'object') {
              if (rawDeferred.ItemCollection && Array.isArray(rawDeferred.ItemCollection)) {
                deferredPackages = rawDeferred.ItemCollection;
              } else if (rawDeferred.ServicePackage) {
                deferredPackages = Array.isArray(rawDeferred.ServicePackage) 
                  ? rawDeferred.ServicePackage 
                  : [rawDeferred.ServicePackage];
              } else if (rawDeferred.ID || rawDeferred.Header) {
                deferredPackages = [rawDeferred];
              }
            }
            
            for (const deferredPkg of deferredPackages) {
              try {
                const protractorDeferredId = deferredPkg.ID || deferredPkg.Header?.ID;
                if (!protractorDeferredId) continue;
                
                // Check if already imported
                const existingDeferred = await storage.getDeferredWorkByProtractorId(protractorDeferredId);
                if (existingDeferred) continue;
                
                // Extract job name and description
                const jobTitle = deferredPkg.ServicePackageHeader?.Title || deferredPkg.Title || 'Deferred Service';
                const jobDescription = deferredPkg.ServicePackageHeader?.Description || deferredPkg.Description || '';
                
                // Extract line items for pricing
                let deferredLines: any[] = [];
                const rawDeferredLines = deferredPkg.ServicePackageLines || deferredPkg.Lines;
                if (Array.isArray(rawDeferredLines)) {
                  deferredLines = rawDeferredLines;
                } else if (rawDeferredLines?.ItemCollection) {
                  deferredLines = rawDeferredLines.ItemCollection;
                }
                
                // Calculate totals from line items
                let laborTotal = 0;
                let partsTotal = 0;
                const lineItems: any[] = [];
                
                for (const line of deferredLines) {
                  const lineTotal = parseFloat(line.ExtendedTotal || line.Total || line.Price || 0);
                  const lineType = line.Type || line.type;
                  
                  if (lineType === 'Labor') {
                    laborTotal += lineTotal;
                  } else if (lineType === 'Material' || lineType === 'Part') {
                    partsTotal += lineTotal;
                  }
                  
                  lineItems.push({
                    type: lineType === 'Labor' ? 'LABOR' : 'PART',
                    description: line.Description || line.description || '',
                    quantity: parseFloat(line.Quantity || line.quantity || 1),
                    unitPrice: parseFloat(line.Price || line.price || 0),
                    total: lineTotal,
                    partNumber: line.PartNumber || line.partNumber || null,
                    manufacturer: line.Manufacturer || line.manufacturer || null,
                  });
                }
                
                const estimatedTotal = laborTotal + partsTotal;
                
                // Get the inspection reference if linked to DVI finding
                const inspectionReferenceId = deferredPkg.InspectionReferenceID && 
                  deferredPkg.InspectionReferenceID !== '00000000-0000-0000-0000-000000000000'
                    ? deferredPkg.InspectionReferenceID : null;
                
                // Find the inspection finding note if available
                let inspectionFinding = null;
                if (inspectionReferenceId && servicePackages.length > 0) {
                  for (const pkg of servicePackages) {
                    const inspLines = pkg.ServicePackageInspectionLines?.ItemCollection || [];
                    const foundLine = inspLines.find((line: any) => line.ID === inspectionReferenceId);
                    if (foundLine) {
                      inspectionFinding = foundLine.Notes || foundLine.Title || null;
                      break;
                    }
                  }
                }
                
                // Create deferred work record
                await storage.createDeferredWork({
                  orgId,
                  locationId: location.id,
                  customerId: customer.id,
                  vehicleId: vehicle.id,
                  originalRoId: existing?.id || null,
                  serviceName: jobTitle,
                  serviceDescription: jobDescription,
                  estimatedPrice: estimatedTotal.toString(),
                  status: 'PENDING',
                  reason: inspectionFinding,
                  notes: lineItems.length > 0 ? JSON.stringify(lineItems) : null,
                  declinedAt: new Date(deferredPkg.Header?.CreationTime || invoice.InvoiceTime || Date.now()),
                  protractorId: protractorDeferredId,
                  legacySystem: 'protractor',
                  legacyId: protractorDeferredId,
                });
                
                console.log(`[Protractor Import ${jobId}] Imported deferred work: ${jobTitle} ($${estimatedTotal.toFixed(2)})`);
              } catch (deferredErr: any) {
                console.error(`[Protractor Import ${jobId}] Error importing deferred work: ${deferredErr.message}`);
              }
            }
            
            processedRecords++;
            
            // Update progress every 10 records
            if (processedRecords % 10 === 0) {
              await storage.updateProtractorImportJob(jobId, {
                processedRecords,
                failedRecords,
              });
              console.log(`[Protractor Import ${jobId}] Progress: ${processedRecords}/${totalRecords} processed, ${failedRecords} failed`);
            }
          } catch (err: any) {
            failedRecords++;
            errors.push({
              record: `Invoice: ${listInvoice.Number || listInvoice.ID}`,
              error: err.message,
              timestamp: new Date().toISOString(),
            });
          }
        }
      } catch (err: any) {
        errors.push({
          record: 'Invoices fetch',
          error: err.message,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Complete the job
    await storage.updateProtractorImportJob(jobId, {
      status: 'COMPLETED',
      totalRecords,
      processedRecords,
      failedRecords,
      errorLog: errors,
      completedAt: new Date(),
    });

    // Update connection last sync time
    await storage.updateProtractorConnection(connection.id, {
      lastSyncAt: new Date(),
      lastError: failedRecords > 0 ? `${failedRecords} records failed` : null,
    });

    console.log(`[Protractor Import ${jobId}] Complete: ${processedRecords}/${totalRecords} records, ${failedRecords} failed`);

  } catch (error: any) {
    console.error(`[Protractor Import ${jobId}] Error:`, error);
    
    await storage.updateProtractorImportJob(jobId, {
      status: 'FAILED',
      completedAt: new Date(),
      errorLog: [{ record: 'Job', error: error.message, timestamp: new Date().toISOString() }],
    });

    await storage.updateProtractorConnection(connection.id, {
      lastError: error.message,
    });
  }
}

// ==========================================
// MESSAGING ROUTES (called from registerRoutes)
// ==========================================

function setupMessagingRoutes(app: Express) {
  // Get all conversations for a location
  app.get("/api/conversations", requireAuth, async (req, res) => {
    try {
      const locationId = req.query.locationId as string;
      if (!locationId) {
        return res.status(400).json({ message: "Location ID required" });
      }
      
      const conversationsData = await storage.getConversationsByLocation(locationId, req.user!.orgId);
      
      // Enrich with customer data
      const enriched = await Promise.all(conversationsData.map(async (conv) => {
        const customer = await storage.getCustomerById(conv.customerId);
        return { ...conv, customer };
      }));
      
      res.json(enriched);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get or create conversation for a customer
  app.post("/api/conversations", requireAuth, async (req, res) => {
    try {
      const { customerId, locationId, phoneNumber, email } = req.body;
      
      // Check if conversation exists
      let conversation = await storage.getConversationByCustomer(customerId, req.user!.orgId);
      
      if (!conversation) {
        conversation = await storage.createConversation({
          orgId: req.user!.orgId,
          locationId,
          customerId,
          phoneNumber,
          email,
        });
      }
      
      // Enrich with customer data
      const customer = await storage.getCustomerById(conversation.customerId);
      
      res.json({ ...conversation, customer });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get conversation with messages
  app.get("/api/conversations/:id", requireAuth, async (req, res) => {
    try {
      const conversation = await storage.getConversation(req.params.id, req.user!.orgId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      const messagesData = await storage.getMessagesByConversation(req.params.id);
      const customer = await storage.getCustomerById(conversation.customerId);
      
      res.json({ ...conversation, messages: messagesData, customer });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Mark conversation as read
  app.post("/api/conversations/:id/read", requireAuth, async (req, res) => {
    try {
      await storage.markConversationAsRead(req.params.id, req.user!.orgId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Send a message (SMS or email)
  app.post("/api/conversations/:id/messages", requireAuth, async (req, res) => {
    try {
      const { content, channel, toNumber, toEmail } = req.body;
      const conversation = await storage.getConversation(req.params.id, req.user!.orgId);
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      const customer = await storage.getCustomerById(conversation.customerId);
      const location = await storage.getLocation(conversation.locationId);
      
      // Create the message record
      const message = await storage.createMessage({
        conversationId: req.params.id,
        orgId: req.user!.orgId,
        direction: 'OUTBOUND',
        channel,
        status: 'PENDING',
        content,
        toNumber: channel === 'SMS' ? (toNumber || conversation.phoneNumber) : null,
        toEmail: channel === 'EMAIL' ? (toEmail || conversation.email) : null,
        fromNumber: channel === 'SMS' ? process.env.TWILIO_PHONE_NUMBER : null,
        fromEmail: channel === 'EMAIL' ? (location?.email || 'noreply@bayops.com') : null,
        sentByUserId: req.user!.id,
      });

      // Send the message
      let sendResult;
      if (channel === 'SMS') {
        const recipient = toNumber || conversation.phoneNumber;
        if (!recipient) {
          await storage.updateMessage(message.id, { status: 'FAILED', errorMessage: 'No phone number' });
          return res.status(400).json({ message: "No phone number available" });
        }
        sendResult = await sendSMS({ to: recipient, message: content });
      } else if (channel === 'EMAIL') {
        const recipient = toEmail || conversation.email;
        if (!recipient) {
          await storage.updateMessage(message.id, { status: 'FAILED', errorMessage: 'No email address' });
          return res.status(400).json({ message: "No email address available" });
        }
        const shopName = location?.name || 'Your Shop';
        sendResult = await sendEmail({
          to: recipient,
          subject: `Message from ${shopName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #1e40af; color: white; padding: 20px;">
                <h1 style="margin: 0; font-size: 20px;">${shopName}</h1>
              </div>
              <div style="padding: 20px; background: #ffffff;">
                <p style="margin: 0 0 10px;">Hi ${customer?.firstName || 'Valued Customer'},</p>
                <p style="margin: 0; white-space: pre-wrap;">${content}</p>
              </div>
              <div style="padding: 15px; background: #f4f4f5; text-align: center; font-size: 12px; color: #71717a;">
                This message was sent by ${shopName}
              </div>
            </div>
          `,
        });
      }

      if (sendResult?.success) {
        await storage.updateMessage(message.id, {
          status: 'SENT',
          externalId: sendResult.messageId,
          sentAt: new Date(),
        });
        res.json({ success: true, message: { ...message, status: 'SENT' } });
      } else {
        await storage.updateMessage(message.id, {
          status: 'FAILED',
          errorMessage: sendResult?.error || 'Failed to send',
        });
        res.status(500).json({ message: sendResult?.error || 'Failed to send message' });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Archive a conversation
  app.post("/api/conversations/:id/archive", requireAuth, async (req, res) => {
    try {
      await storage.updateConversation(req.params.id, req.user!.orgId, { isArchived: true });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Telnyx Inbound SMS Webhook (no auth required - webhook from Telnyx)
  app.post("/api/webhooks/telnyx/inbound", async (req, res) => {
    try {
      const { parseTelnyxInboundMessage, formatPhoneNumber } = await import('./messaging');
      
      const eventType = req.body?.data?.event_type;
      
      // Only process inbound messages
      if (eventType !== 'message.received') {
        return res.status(200).json({ received: true });
      }
      
      const parsed = parseTelnyxInboundMessage(req.body);
      if (!parsed) {
        console.error('Failed to parse Telnyx inbound message:', req.body);
        return res.status(200).json({ received: true });
      }
      
      console.log('Received inbound SMS from:', parsed.from, 'Text:', parsed.text);
      
      // Find a conversation with this phone number
      const conversation = await storage.getConversationByPhoneNumber(parsed.from);
      
      if (conversation) {
        // Add message to existing conversation
        await storage.createMessage({
          conversationId: conversation.id,
          orgId: conversation.orgId,
          direction: 'INBOUND',
          channel: 'SMS',
          status: 'DELIVERED',
          content: parsed.text,
          fromNumber: parsed.from,
          toNumber: parsed.to,
          externalId: parsed.messageId,
          deliveredAt: parsed.receivedAt,
        });
        
        console.log('Added inbound message to conversation:', conversation.id);
      } else {
        console.log('No conversation found for phone number:', parsed.from);
        // Could create a new conversation here if needed
      }
      
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Telnyx webhook error:', error);
      res.status(200).json({ received: true }); // Always return 200 to Telnyx
    }
  });

  // ============================================================================
  // DataOne OEM Maintenance API
  // ============================================================================

  // Get OEM maintenance schedule for a vehicle (used from RO context)
  app.get("/api/vehicles/:vehicleId/maintenance-schedule", requireAuth, async (req, res) => {
    try {
      const vehicle = await storage.getVehicle(req.params.vehicleId, req.user!.orgId);
      if (!vehicle) {
        return res.status(404).json({ message: "Vehicle not found" });
      }
      
      if (!vehicle.vin || vehicle.vin.length < 11) {
        return res.status(400).json({ message: "Vehicle VIN is missing or invalid" });
      }

      const result = await getMaintenanceScheduleCached(vehicle.vin);
      
      if (!result.ok) {
        return res.status(404).json({ 
          message: result.error || "No maintenance schedule found for this vehicle",
          vin: vehicle.vin,
        });
      }

      const currentMileage = vehicle.mileage || 0;
      const triaged = triageMaintenanceItems(result.items, currentMileage);
      
      const categories = [...new Set(triaged.map(item => item.maintenance_category))].sort();
      
      res.json({
        vehicle: {
          id: vehicle.id,
          vin: vehicle.vin,
          year: vehicle.year,
          make: vehicle.make,
          model: vehicle.model,
          mileage: currentMileage,
        },
        vehicleInfo: result.vehicleInfo,
        source: result.source,
        cachedAt: result.cachedAt,
        totalItems: result.count,
        categories,
        items: triaged,
        summary: {
          dueNow: triaged.filter(i => i.dueStatus === 'DUE_NOW').length,
          dueSoon: triaged.filter(i => i.dueStatus === 'DUE_SOON').length,
          upcoming: triaged.filter(i => i.dueStatus === 'UPCOMING').length,
        },
      });
    } catch (error: any) {
      console.error('[DataOne API] Error fetching maintenance schedule:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Decode a VIN (for manual entry or validation)
  app.get("/api/vin/:vin/decode", requireAuth, async (req, res) => {
    try {
      const vin = req.params.vin.toUpperCase().trim();
      if (vin.length !== 17) {
        return res.status(400).json({ message: "VIN must be 17 characters" });
      }

      const result = await decodeVin(vin);
      
      if (!result.ok) {
        return res.status(404).json({ 
          message: result.error || "VIN not found",
          vin,
        });
      }

      res.json({
        vin,
        vehicle: result.vehicle,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Refresh vehicle VIN data - decodes VIN and updates vehicle record with detailed info
  app.post("/api/vehicles/:vehicleId/refresh-vin-data", requireAuth, async (req, res) => {
    try {
      const vehicle = await storage.getVehicle(req.params.vehicleId);
      if (!vehicle) {
        return res.status(404).json({ message: "Vehicle not found" });
      }

      // Verify org access
      if (vehicle.orgId && vehicle.orgId !== req.user!.orgId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const vin = vehicle.vin?.toUpperCase().trim();
      if (!vin || vin.length !== 17) {
        return res.status(400).json({ message: "Valid 17-character VIN required" });
      }

      const result = await decodeVin(vin);
      
      if (!result.ok || !result.vehicle) {
        return res.status(404).json({ 
          message: result.error || "Could not decode VIN",
          vin,
        });
      }

      // Update vehicle with decoded data
      const decoded = result.vehicle;
      const updates: Record<string, any> = {};
      
      if (decoded.trim && !vehicle.trim) updates.trim = decoded.trim;
      if (decoded.engine) updates.engineDisplacement = decoded.engine;
      if (decoded.transmission) updates.transmission = decoded.transmission;
      if (decoded.driveType) updates.driveType = decoded.driveType;
      if (decoded.fuelType) updates.fuelType = decoded.fuelType;

      if (Object.keys(updates).length > 0) {
        const updated = await storage.updateVehicle(vehicle.id, updates);
        res.json({ 
          message: "Vehicle data updated",
          vehicle: updated,
          decoded: decoded,
          fieldsUpdated: Object.keys(updates),
        });
      } else {
        res.json({ 
          message: "No new data to update",
          vehicle,
          decoded: decoded,
          fieldsUpdated: [],
        });
      }
    } catch (error: any) {
      console.error('[VIN Refresh] Error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get maintenance schedule directly by VIN (for RO creation flow)
  app.get("/api/vin/:vin/maintenance", requireAuth, async (req, res) => {
    try {
      const vin = req.params.vin.toUpperCase().trim();
      if (vin.length < 11) {
        return res.status(400).json({ message: "VIN must be at least 11 characters" });
      }

      const mileage = parseInt(req.query.mileage as string) || 0;
      
      const result = await getMaintenanceScheduleCached(vin);
      
      if (!result.ok) {
        return res.status(404).json({ 
          message: result.error || "No maintenance schedule found",
          vin,
        });
      }

      const triaged = triageMaintenanceItems(result.items, mileage);
      
      res.json({
        vin,
        vehicleInfo: result.vehicleInfo,
        source: result.source,
        totalItems: result.count,
        items: triaged,
        summary: {
          dueNow: triaged.filter(i => i.dueStatus === 'DUE_NOW').length,
          dueSoon: triaged.filter(i => i.dueStatus === 'DUE_SOON').length,
          upcoming: triaged.filter(i => i.dueStatus === 'UPCOMING').length,
        },
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Invalidate cache for a VIN (force refresh)
  app.post("/api/vin/:vin/refresh-maintenance", requireAuth, async (req, res) => {
    try {
      const vin = req.params.vin.toUpperCase().trim();
      await invalidateCache(vin);
      
      const mileage = parseInt(req.query.mileage as string) || 0;
      const result = await getMaintenanceScheduleCached(vin);
      
      if (!result.ok) {
        return res.status(404).json({ message: result.error });
      }

      const triaged = triageMaintenanceItems(result.items, mileage);
      
      res.json({
        vin,
        vehicleInfo: result.vehicleInfo,
        source: result.source,
        totalItems: result.count,
        items: triaged,
        summary: {
          dueNow: triaged.filter(i => i.dueStatus === 'DUE_NOW').length,
          dueSoon: triaged.filter(i => i.dueStatus === 'DUE_SOON').length,
          upcoming: triaged.filter(i => i.dueStatus === 'UPCOMING').length,
        },
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Add a maintenance item as a job to a repair order
  app.post("/api/repair-orders/:roId/add-maintenance-job", requireAuth, async (req, res) => {
    try {
      const { maintenanceId, name, category, description, intervalMiles, intervalMonths } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: "Job name is required" });
      }

      const ro = await storage.getRepairOrder(req.params.roId, req.user!.orgId);
      if (!ro) {
        return res.status(404).json({ message: "Repair order not found" });
      }

      const vehicle = ro.vehicleId ? await storage.getVehicle(ro.vehicleId, req.user!.orgId) : null;
      
      const notes: string[] = [];
      if (description) notes.push(description);
      if (intervalMiles) notes.push(`Recommended interval: ${intervalMiles.toLocaleString()} miles`);
      if (intervalMonths) notes.push(`Recommended interval: ${intervalMonths} months`);
      
      const newJob = {
        id: crypto.randomUUID(),
        name: name,  // Required field for API consumers
        chapter: 'OEM Maintenance',
        code: `OEM-${maintenanceId || Date.now()}`,
        title: name,  // Also stored as title for OEM maintenance display
        notes: notes.join('\n'),
        lineItems: [] as any[],
        isDeferred: false,
      };

      const existingJobs = (ro.jobs as any[]) || [];
      const updatedJobs = [...existingJobs, newJob];

      await storage.updateRepairOrder(req.params.roId, req.user!.orgId, {
        jobs: updatedJobs,
      });

      res.json({ 
        success: true, 
        job: newJob,
        message: `Added "${name}" to repair order`,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============================================================================
  // CARFAX Service History API
  // ============================================================================
  
  // Get CARFAX configuration status
  app.get("/api/carfax/status", requireAuth, async (req, res) => {
    res.json(getCarfaxStatus());
  });

  // Get CARFAX service history for a vehicle
  app.get("/api/vehicles/:vehicleId/service-history", requireAuth, async (req, res) => {
    try {
      const vehicle = await storage.getVehicle(req.params.vehicleId, req.user!.orgId);
      if (!vehicle) {
        return res.status(404).json({ message: "Vehicle not found" });
      }
      
      if (!vehicle.vin || vehicle.vin.length < 17) {
        return res.status(400).json({ message: "Vehicle VIN is missing or invalid (must be 17 characters)" });
      }

      const result = await getCarfaxServiceHistory(vehicle.vin);
      
      if (!result.ok) {
        return res.status(404).json({ 
          message: result.error || "No service history found for this vehicle",
          vin: vehicle.vin,
        });
      }

      res.json({
        vehicle: {
          id: vehicle.id,
          vin: vehicle.vin,
          year: vehicle.year,
          make: vehicle.make,
          model: vehicle.model,
          mileage: vehicle.mileage || 0,
        },
        carfaxVehicleInfo: result.vehicleInfo,
        source: result.source,
        cachedAt: result.cachedAt,
        serviceCategories: result.serviceCategories,
        displayRecords: result.displayRecords,
        numberOfServiceRecords: result.numberOfServiceRecords,
        summary: {
          totalRecords: result.displayRecords.length,
          serviceRecords: result.displayRecords.filter(r => r.type === 'service').length,
          recallRecords: result.displayRecords.filter(r => r.type === 'recall').length,
        },
      });
    } catch (error: any) {
      console.error('[CARFAX API] Error fetching service history:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get CARFAX service history by VIN directly
  app.get("/api/vin/:vin/service-history", requireAuth, async (req, res) => {
    try {
      const vin = req.params.vin.toUpperCase().trim();
      if (vin.length !== 17) {
        return res.status(400).json({ message: "VIN must be 17 characters" });
      }

      const result = await getCarfaxServiceHistory(vin);
      
      if (!result.ok) {
        return res.status(404).json({ 
          message: result.error || "No service history found",
          vin,
        });
      }

      res.json({
        vin,
        vehicleInfo: result.vehicleInfo,
        source: result.source,
        cachedAt: result.cachedAt,
        serviceCategories: result.serviceCategories,
        displayRecords: result.displayRecords,
        numberOfServiceRecords: result.numberOfServiceRecords,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get combined OEM maintenance + CARFAX history for a vehicle
  app.get("/api/vehicles/:vehicleId/maintenance-with-history", requireAuth, async (req, res) => {
    try {
      const vehicle = await storage.getVehicle(req.params.vehicleId, req.user!.orgId);
      if (!vehicle) {
        return res.status(404).json({ message: "Vehicle not found" });
      }
      
      if (!vehicle.vin || vehicle.vin.length < 11) {
        return res.status(400).json({ message: "Vehicle VIN is missing or invalid" });
      }

      const currentMileage = vehicle.mileage || 0;

      // Fetch both OEM maintenance and CARFAX history in parallel
      const [oemResult, carfaxResult] = await Promise.all([
        getMaintenanceScheduleCached(vehicle.vin),
        getCarfaxServiceHistory(vehicle.vin),
      ]);

      // Triage OEM maintenance items
      const triagedOem = oemResult.ok ? triageMaintenanceItems(oemResult.items, currentMileage) : [];

      // Match CARFAX service categories to OEM maintenance items
      const enhancedItems = triagedOem.map(item => {
        const carfaxMatch = carfaxResult.ok 
          ? matchServiceToOemMaintenance(carfaxResult.serviceCategories, item.maintenance_name)
          : null;

        return {
          ...item,
          carfaxLastService: carfaxMatch ? {
            date: carfaxMatch.dateOfLastService,
            odometer: carfaxMatch.odometerOfLastService,
          } : null,
        };
      });

      res.json({
        vehicle: {
          id: vehicle.id,
          vin: vehicle.vin,
          year: vehicle.year,
          make: vehicle.make,
          model: vehicle.model,
          mileage: currentMileage,
        },
        oemMaintenance: {
          available: oemResult.ok,
          source: oemResult.source,
          totalItems: oemResult.count,
          items: enhancedItems,
          summary: {
            dueNow: enhancedItems.filter(i => i.dueStatus === 'DUE_NOW').length,
            dueSoon: enhancedItems.filter(i => i.dueStatus === 'DUE_SOON').length,
            upcoming: enhancedItems.filter(i => i.dueStatus === 'UPCOMING').length,
          },
        },
        carfaxHistory: {
          available: carfaxResult.ok,
          source: carfaxResult.source,
          serviceCategories: carfaxResult.serviceCategories,
          displayRecords: carfaxResult.displayRecords,
          numberOfServiceRecords: carfaxResult.numberOfServiceRecords,
        },
      });
    } catch (error: any) {
      console.error('[Combined API] Error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // ============================================================================
  // Service Advisor Recommendations API
  // ============================================================================

  // Get intelligent service recommendations for a vehicle/RO combining OEM, CARFAX, and DVI data
  app.get("/api/ros/:roId/recommendations", requireAuth, async (req, res) => {
    try {
      const ro = await storage.getRepairOrder(req.params.roId, req.user!.orgId);
      if (!ro) {
        return res.status(404).json({ message: "Repair order not found" });
      }

      if (!ro.vehicleId) {
        return res.status(400).json({ message: "Repair order has no associated vehicle" });
      }

      // Use RO odometer if set, otherwise fall back to vehicle's stored mileage
      let currentMileage = ro.odometerIn || 0;
      if (!currentMileage) {
        const vehicle = await storage.getVehicle(ro.vehicleId, req.user!.orgId);
        if (vehicle?.mileage) {
          currentMileage = vehicle.mileage;
        }
      }

      const result = await generateRecommendations(
        ro.vehicleId,
        ro.id,
        req.user!.orgId,
        currentMileage
      );

      res.json(result);
    } catch (error: any) {
      console.error('[Recommendations API] Error:', error);
      res.status(500).json({ message: error.message });
    }
  });
}

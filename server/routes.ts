import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth, hashPassword } from "./auth";
import passport from "passport";
import { 
  insertUserSchema,
  insertOrganizationSchema,
  insertLocationSchema,
  insertCustomerSchema,
  insertVehicleSchema,
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
} from "@shared/schema";
import { fromZodError } from "zod-validation-error";

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
      const ro = await storage.updateRepairOrder(req.params.id, req.user!.orgId, req.body);
      if (!ro) {
        return res.status(404).json({ message: "Repair order not found" });
      }
      res.json(ro);
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

  // Inspections
  app.get("/api/inspections/ro/:roId", requireAuth, async (req, res) => {
    try {
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
      const inspection = await storage.createInspection(result.data);
      res.status(201).json(inspection);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/inspections/:id", requireAuth, async (req, res) => {
    try {
      const inspection = await storage.updateInspection(req.params.id, req.body);
      if (!inspection) {
        return res.status(404).json({ message: "Inspection not found" });
      }
      res.json(inspection);
    } catch (error: any) {
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
      
      const invoice = await storage.getInvoice(result.data.invoiceId);
      if (invoice) {
        const newAmountPaid = parseFloat(invoice.amountPaid) + parseFloat(result.data.amount);
        const newAmountDue = parseFloat(invoice.total) - newAmountPaid;
        let newStatus = invoice.status;
        
        if (newAmountDue <= 0) {
          newStatus = 'PAID';
        } else if (newAmountPaid > 0) {
          newStatus = 'PARTIAL';
        }
        
        await storage.updateInvoice(invoice.id, {
          amountPaid: newAmountPaid.toFixed(2),
          amountDue: Math.max(0, newAmountDue).toFixed(2),
          status: newStatus,
          paidAt: newStatus === 'PAID' ? new Date() : null,
        });
      }
      
      res.status(201).json(payment);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}

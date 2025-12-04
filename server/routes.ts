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
} from "./ai";
import {
  sendSMS,
  sendEmail,
  generateInspectionSMS,
  generateInspectionEmail,
  isMessagingConfigured,
} from "./messaging";
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
  insertCannedJobTemplateSchema,
  insertCannedJobPartSchema,
  insertServiceQueueEntrySchema,
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
      
      const ros = await storage.getRepairOrdersByLocation(req.params.locationId);
      const invoices = await storage.getInvoicesByLocation(req.params.locationId);
      const timeLogs = await storage.getTimeLogsByLocation(req.params.locationId);
      const partsOrders = await storage.getPartsOrdersByLocation(req.params.locationId);
      
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

      const { method } = req.body;
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const authUrl = `${baseUrl}/authorize/${authToken}`;
      const vehicleInfo = vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'your vehicle';
      const shopName = location?.name || 'Your Shop';

      let sendResult;
      
      if (method === 'sms' && customer.phone) {
        const message = `Hi ${customer.firstName}! Please review and authorize the recommended services for your ${vehicleInfo}. View here: ${authUrl} - ${shopName}`;
        sendResult = await sendSMS({ to: customer.phone, message });
      } else if (method === 'email' && customer.email) {
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
        sendResult = await sendEmail({ to: customer.email, subject, html });
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

  // Add canned job to repair order (materialize template into RO line items)
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

      // Get existing line items to determine next number
      const currentItems = ro.lineItems as any[] || [];
      const maxJobNum = currentItems
        .filter((item: any) => item.type === 'LABOR')
        .reduce((max: number, item: any) => Math.max(max, item.jobNumber || 0), 0);
      const nextJobNum = maxJobNum + 1;

      // Get labor rate from location settings
      const laborRates = await storage.getLaborRatesByLocation(ro.locationId);
      const defaultRate = laborRates.find(r => r.isDefault) || laborRates[0];
      const laborRate = template.laborRate || defaultRate?.rate || '100.00';

      // Create labor line item
      const laborItem = {
        id: crypto.randomUUID(),
        type: 'LABOR',
        jobNumber: nextJobNum,
        description: template.name,
        notes: template.defaultNotes || template.description || '',
        hours: parseFloat(template.laborHours as string),
        rate: parseFloat(laborRate as string),
        quantity: 1,
        unitPrice: parseFloat(laborRate as string) * parseFloat(template.laborHours as string),
        total: parseFloat(laborRate as string) * parseFloat(template.laborHours as string),
        categoryId: template.categoryId,
        status: 'PENDING',
      };

      // Create part line items
      const partItems = parts.map((part, index) => ({
        id: crypto.randomUUID(),
        type: 'PART',
        jobNumber: nextJobNum,
        description: part.description,
        partNumber: part.partNumber || '',
        quantity: parseFloat(part.quantity as string),
        unitCost: part.unitCost ? parseFloat(part.unitCost as string) : 0,
        unitPrice: part.unitPrice ? parseFloat(part.unitPrice as string) : 0,
        total: (part.unitPrice ? parseFloat(part.unitPrice as string) : 0) * parseFloat(part.quantity as string),
        inventoryItemId: part.inventoryItemId,
        status: 'PENDING',
      }));

      // Add to existing line items
      const updatedLineItems = [...currentItems, laborItem, ...partItems];

      // Recalculate totals
      const laborTotal = updatedLineItems
        .filter((item: any) => item.type === 'LABOR')
        .reduce((sum: number, item: any) => sum + (item.total || 0), 0);
      const partsTotal = updatedLineItems
        .filter((item: any) => item.type === 'PART' || item.type === 'TIRE')
        .reduce((sum: number, item: any) => sum + (item.total || 0), 0);
      const subtotal = laborTotal + partsTotal;

      await storage.updateRepairOrder(ro.id, req.user!.orgId, {
        lineItems: updatedLineItems,
        laborTotal: laborTotal.toFixed(2),
        partsTotal: partsTotal.toFixed(2),
        subtotal: subtotal.toFixed(2),
        total: subtotal.toFixed(2), // Will be recalculated with fees/taxes on frontend
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

  return httpServer;
}

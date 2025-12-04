import { db } from "./db";
import { 
  organizations, 
  locations, 
  users, 
  customers, 
  vehicles, 
  workflows,
  repairOrders,
  inventoryItems,
} from "@shared/schema";
import { hashPassword } from "./auth";
import { count } from "drizzle-orm";

export async function autoSeedIfEmpty() {
  const [orgCount] = await db.select({ count: count() }).from(organizations);
  
  if (orgCount.count > 0) {
    console.log("📊 Database already has data, skipping auto-seed");
    return;
  }

  console.log("🌱 Empty database detected - seeding demo data...");

  const [org] = await db.insert(organizations).values({
    name: "Apex Automotive Group",
    slug: "apex-automotive",
    subscriptionStatus: "ACTIVE",
    subscriptionPlan: "GROWTH",
    billingEmail: "billing@apexauto.com",
  }).returning();

  console.log("✓ Created organization:", org.name);

  const [downtownLocation, westsideLocation] = await db.insert(locations).values([
    {
      orgId: org.id,
      name: "Apex Downtown",
      address: "123 Main St",
      city: "Austin",
      state: "TX",
      zip: "78701",
      phone: "(512) 555-0100",
      taxRate: "0.0825",
      isActive: true,
    },
    {
      orgId: org.id,
      name: "Apex Westside",
      address: "456 West Ave",
      city: "Austin",
      state: "TX",
      zip: "78703",
      phone: "(512) 555-0200",
      taxRate: "0.0825",
      isActive: true,
    },
  ]).returning();

  console.log("✓ Created locations:", downtownLocation.name, westsideLocation.name);

  const hashedPassword = await hashPassword("password123");
  
  const [ownerUser, managerUser, advisorUser, techUser] = await db.insert(users).values([
    {
      orgId: org.id,
      username: "owner",
      password: hashedPassword,
      name: "Sarah Chen",
      email: "sarah@apexauto.com",
      role: "OWNER",
      locationIds: [downtownLocation.id, westsideLocation.id],
    },
    {
      orgId: org.id,
      username: "manager",
      password: hashedPassword,
      name: "Mike Rodriguez",
      email: "mike@apexauto.com",
      role: "MANAGER",
      locationIds: [downtownLocation.id],
    },
    {
      orgId: org.id,
      username: "advisor",
      password: hashedPassword,
      name: "Jessica Taylor",
      email: "jessica@apexauto.com",
      role: "ADVISOR",
      locationIds: [downtownLocation.id],
    },
    {
      orgId: org.id,
      username: "tech",
      password: hashedPassword,
      name: "Carlos Martinez",
      email: "carlos@apexauto.com",
      role: "TECHNICIAN",
      locationIds: [downtownLocation.id],
    },
  ]).returning();

  console.log("✓ Created users:", ownerUser.username, managerUser.username, advisorUser.username, techUser.username);

  const [defaultWorkflow] = await db.insert(workflows).values({
    orgId: org.id,
    name: "Standard Repair Workflow",
    description: "Default workflow for all repair orders",
    isDefault: true,
    stages: [
      { id: "check-in", label: "Check-In", color: "#94a3b8", type: "SYSTEM", order: 0, isEnabled: true },
      { id: "waiting-approval", label: "Waiting Approval", color: "#fbbf24", type: "SYSTEM", order: 1, isEnabled: true },
      { id: "in-progress", label: "In Progress", color: "#2563eb", type: "SYSTEM", order: 2, isEnabled: true },
      { id: "waiting-parts", label: "Waiting Parts", color: "#f97316", type: "CUSTOM", order: 3, isEnabled: true },
      { id: "quality-check", label: "Quality Check", color: "#8b5cf6", type: "CUSTOM", order: 4, isEnabled: true },
      { id: "ready-for-pickup", label: "Ready for Pickup", color: "#10b981", type: "SYSTEM", order: 5, isEnabled: true },
      { id: "completed", label: "Completed", color: "#6b7280", type: "SYSTEM", order: 6, isEnabled: true },
    ],
  }).returning();

  console.log("✓ Created workflow:", defaultWorkflow.name);

  const [customer1, customer2, customer3] = await db.insert(customers).values([
    {
      orgId: org.id,
      firstName: "John",
      lastName: "Smith",
      email: "john.smith@email.com",
      phone: "(512) 555-1001",
      address: "789 Oak Lane, Austin, TX 78704",
      marketingConsent: true,
    },
    {
      orgId: org.id,
      firstName: "Emily",
      lastName: "Johnson",
      email: "emily.j@email.com",
      phone: "(512) 555-1002",
      address: "321 Elm St, Austin, TX 78705",
      marketingConsent: false,
    },
    {
      orgId: org.id,
      firstName: "Michael",
      lastName: "Williams",
      email: "mwilliams@email.com",
      phone: "(512) 555-1003",
      address: "654 Pine Ave, Austin, TX 78702",
      marketingConsent: true,
    },
  ]).returning();

  console.log("✓ Created customers:", customer1.lastName, customer2.lastName, customer3.lastName);

  const [vehicle1, vehicle2, vehicle3] = await db.insert(vehicles).values([
    {
      customerId: customer1.id,
      vin: "1HGCM82633A123456",
      year: 2018,
      make: "Honda",
      model: "Accord",
      trim: "Sport",
      licensePlate: "ABC-1234",
      mileage: 45230,
      tireSizeFront: "225/50R17",
    },
    {
      customerId: customer2.id,
      vin: "5YFBURHE5HP123789",
      year: 2020,
      make: "Toyota",
      model: "Corolla",
      trim: "LE",
      licensePlate: "XYZ-5678",
      mileage: 28450,
      tireSizeFront: "205/55R16",
    },
    {
      customerId: customer3.id,
      vin: "1FTFW1ET5EFC12345",
      year: 2019,
      make: "Ford",
      model: "F-150",
      trim: "XLT",
      licensePlate: "TRK-9012",
      mileage: 62100,
      tireSizeFront: "275/65R18",
    },
  ]).returning();

  console.log("✓ Created vehicles:", vehicle1.make, vehicle2.make, vehicle3.make);

  await db.insert(inventoryItems).values([
    {
      orgId: org.id,
      locationId: downtownLocation.id,
      type: "PART",
      sku: "BRK-PAD-001",
      brand: "Wagner",
      name: "Ceramic Brake Pads - Front",
      description: "Premium ceramic brake pads for front axle",
      cost: "45.00",
      price: "89.99",
      quantityOnHand: 24,
      minQuantity: 10,
      binLocation: "A-1-3",
    },
    {
      orgId: org.id,
      locationId: downtownLocation.id,
      type: "PART",
      sku: "OIL-5W30-SYN",
      brand: "Mobil 1",
      name: "5W-30 Full Synthetic Oil",
      description: "Premium full synthetic motor oil, 5 quart",
      cost: "24.50",
      price: "42.99",
      quantityOnHand: 36,
      minQuantity: 15,
      binLocation: "B-2-1",
    },
    {
      orgId: org.id,
      locationId: downtownLocation.id,
      type: "PART",
      sku: "FLT-OIL-001",
      brand: "Wix",
      name: "Oil Filter",
      description: "Standard oil filter for most vehicles",
      cost: "8.00",
      price: "14.99",
      quantityOnHand: 48,
      minQuantity: 20,
      binLocation: "C-1-2",
    },
  ]);

  console.log("✓ Created inventory items");

  const [ro1, ro2] = await db.insert(repairOrders).values([
    {
      orgId: org.id,
      locationId: downtownLocation.id,
      customerId: customer1.id,
      vehicleId: vehicle1.id,
      advisorId: advisorUser.id,
      technicianId: techUser.id,
      workflowId: defaultWorkflow.id,
      status: "in-progress",
      notes: "Customer reports squeaking noise from brakes",
      odometerIn: 45230,
      jobs: [
        {
          id: "job-1",
          name: "Brake Inspection & Replacement",
          description: "Inspect brake system and replace front pads",
          lineItems: [
            {
              id: "li-1",
              type: "LABOR",
              description: "Brake inspection",
              quantity: 0.5,
              unitCost: 0,
              unitPrice: 65.00,
              approved: true,
            },
            {
              id: "li-2",
              type: "PART",
              description: "Ceramic Brake Pads - Front",
              quantity: 1,
              unitCost: 45.00,
              unitPrice: 89.99,
              approved: true,
            },
            {
              id: "li-3",
              type: "LABOR",
              description: "Brake pad replacement - Front",
              quantity: 1.5,
              unitCost: 0,
              unitPrice: 125.00,
              approved: true,
            },
          ],
        },
      ],
    },
    {
      orgId: org.id,
      locationId: downtownLocation.id,
      customerId: customer2.id,
      vehicleId: vehicle2.id,
      advisorId: advisorUser.id,
      workflowId: defaultWorkflow.id,
      status: "waiting-approval",
      notes: "Routine maintenance - oil change and tire rotation",
      odometerIn: 28450,
      jobs: [
        {
          id: "job-1",
          name: "Oil Change Service",
          description: "Full synthetic oil change with filter",
          lineItems: [
            {
              id: "li-1",
              type: "PART",
              description: "5W-30 Full Synthetic Oil",
              quantity: 1,
              unitCost: 24.50,
              unitPrice: 42.99,
              approved: false,
            },
            {
              id: "li-2",
              type: "PART",
              description: "Oil Filter",
              quantity: 1,
              unitCost: 8.00,
              unitPrice: 14.99,
              approved: false,
            },
            {
              id: "li-3",
              type: "LABOR",
              description: "Oil change service",
              quantity: 0.5,
              unitCost: 0,
              unitPrice: 35.00,
              approved: false,
            },
          ],
        },
        {
          id: "job-2",
          name: "Tire Rotation",
          description: "Rotate all four tires and balance",
          lineItems: [
            {
              id: "li-1",
              type: "LABOR",
              description: "Tire rotation and balance",
              quantity: 1,
              unitCost: 0,
              unitPrice: 45.00,
              approved: false,
            },
          ],
        },
      ],
    },
  ]).returning();

  console.log("✓ Created repair orders:", ro1.id, ro2.id);

  console.log("\n✅ Auto-seed completed successfully!");
  console.log("📝 Test credentials: username: owner | password: password123");
}

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

async function seed() {
  console.log("🌱 Starting database seed...");

  // Create organization
  const [org] = await db.insert(organizations).values({
    name: "Apex Automotive Group",
    slug: "apex-automotive",
    subscriptionStatus: "ACTIVE",
    subscriptionPlan: "GROWTH",
    billingEmail: "billing@apexauto.com",
  }).returning();

  console.log("✓ Created organization:", org.name);

  // Create locations
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

  // Create users
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

  console.log("✓ Created users (password: password123):", ownerUser.username, managerUser.username, advisorUser.username, techUser.username);

  // Create default workflow
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

  // Create customers
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

  console.log("✓ Created customers:", customer1.firstName, customer2.firstName, customer3.firstName);

  // Create vehicles
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

  // Create sample inventory items
  await db.insert(inventoryItems).values([
    {
      orgId: org.id,
      locationId: downtownLocation.id,
      type: "TIRE",
      sku: "MICH-PS4S-22550R17",
      brand: "Michelin",
      name: "Pilot Sport 4S",
      tireSize: "225/50R17",
      speedRating: "Y",
      loadIndex: "94",
      category: "PERFORMANCE",
      cost: "185.00",
      price: "289.99",
      quantityOnHand: 12,
      binLocation: "A-14",
    },
    {
      orgId: org.id,
      locationId: downtownLocation.id,
      type: "PART",
      sku: "OIL-5W30-SYNTHETIC",
      brand: "Mobil 1",
      name: "5W-30 Full Synthetic Oil",
      description: "Premium synthetic motor oil - 5 quart bottle",
      cost: "24.50",
      price: "42.99",
      quantityOnHand: 48,
      binLocation: "B-3",
    },
    {
      orgId: org.id,
      locationId: downtownLocation.id,
      type: "PART",
      sku: "BRAKE-PAD-CERAMIC-F",
      brand: "Akebono",
      name: "Ceramic Brake Pads - Front",
      description: "Premium ceramic brake pads for most passenger vehicles",
      cost: "45.00",
      price: "89.99",
      quantityOnHand: 24,
      binLocation: "C-8",
    },
  ]);

  console.log("✓ Created inventory items");

  // Create sample repair orders
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
      odometerIn: 45230,
      notes: "Customer reports squeaking noise from brakes",
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
      odometerIn: 28450,
      notes: "Routine maintenance - oil change and tire rotation",
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

  console.log("\n✅ Database seeding completed successfully!");
  console.log("\n📝 Test credentials:");
  console.log("   Owner:      username: owner     | password: password123");
  console.log("   Manager:    username: manager   | password: password123");
  console.log("   Advisor:    username: advisor   | password: password123");
  console.log("   Technician: username: tech      | password: password123");
  
  process.exit(0);
}

seed().catch((error) => {
  console.error("❌ Seed failed:", error);
  process.exit(1);
});

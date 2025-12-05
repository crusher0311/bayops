import { db } from '../server/db';
import { repairOrders, roJobs, roJobLines } from '../shared/schema';
import { sql } from 'drizzle-orm';

interface LineItem {
  id: string;
  type: 'LABOR' | 'PART' | 'TIRE' | 'FEE' | 'SUBLET';
  description: string;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  approved: boolean;
  inventoryItemId?: string;
  technicianId?: string;
  manufacturer?: string;
  supplier?: string;
  partNumber?: string;
}

interface Job {
  id: string;
  name: string;
  description?: string;
  lineItems: LineItem[];
}

async function backfillNormalizedJobs() {
  console.log('Starting backfill of normalized jobs tables...');
  
  const allRepairOrders = await db.select({
    id: repairOrders.id,
    orgId: repairOrders.orgId,
    locationId: repairOrders.locationId,
    jobs: repairOrders.jobs,
  }).from(repairOrders);
  
  console.log(`Found ${allRepairOrders.length} repair orders to process`);
  
  let jobCount = 0;
  let lineItemCount = 0;
  let skippedROs = 0;
  
  for (const ro of allRepairOrders) {
    const jobs = ro.jobs as Job[] | null;
    
    if (!jobs || jobs.length === 0) {
      skippedROs++;
      continue;
    }
    
    for (let jobIndex = 0; jobIndex < jobs.length; jobIndex++) {
      const job = jobs[jobIndex];
      
      const [insertedJob] = await db.insert(roJobs).values({
        orgId: ro.orgId,
        locationId: ro.locationId,
        repairOrderId: ro.id,
        name: job.name,
        description: job.description || null,
        sortOrder: jobIndex,
        approved: job.lineItems?.every(li => li.approved) || false,
        legacySystem: 'jsonb_migration',
        legacyId: job.id,
      }).returning({ id: roJobs.id });
      
      jobCount++;
      
      if (job.lineItems && job.lineItems.length > 0) {
        for (let lineIndex = 0; lineIndex < job.lineItems.length; lineIndex++) {
          const lineItem = job.lineItems[lineIndex];
          
          await db.insert(roJobLines).values({
            jobId: insertedJob.id,
            type: lineItem.type,
            description: lineItem.description,
            quantity: String(lineItem.quantity),
            unitCost: String(lineItem.unitCost),
            unitPrice: String(lineItem.unitPrice),
            approved: lineItem.approved,
            sortOrder: lineIndex,
            inventoryItemId: lineItem.inventoryItemId || null,
            technicianId: lineItem.technicianId || null,
            manufacturer: lineItem.manufacturer || null,
            supplier: lineItem.supplier || null,
            partNumber: lineItem.partNumber || null,
            legacySystem: 'jsonb_migration',
            legacyId: lineItem.id,
          });
          
          lineItemCount++;
        }
      }
    }
  }
  
  console.log('Backfill complete!');
  console.log(`- Processed: ${allRepairOrders.length} repair orders`);
  console.log(`- Skipped (no jobs): ${skippedROs} repair orders`);
  console.log(`- Created: ${jobCount} jobs`);
  console.log(`- Created: ${lineItemCount} line items`);
}

backfillNormalizedJobs()
  .then(() => {
    console.log('Migration successful');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });

import { createProtractorClient } from '../server/protractor';
import { db } from '../server/db';
import { protractorConnections } from '../shared/schema';
import fs from 'fs';

async function main() {
  const connections = await db.select().from(protractorConnections).limit(1);
  const conn = connections[0];
  const client = createProtractorClient(conn.connectionId, conn.apiKey, conn.authentication);
  
  const invoiceId = '3451fc55-8c18-4e5e-b572-26543fcc0206';
  const invoice = await client.getInvoice(invoiceId);
  
  // Save to file
  fs.writeFileSync('/home/runner/workspace/attached_assets/raw_protractor_invoice_2543.json', JSON.stringify(invoice, null, 2));
  console.log('Saved to attached_assets/raw_protractor_invoice_2543.json');
  
  // Show top-level keys
  console.log('\n=== TOP-LEVEL KEYS ===\n');
  console.log(Object.keys(invoice));
  
  process.exit(0);
}

main().catch(console.error);

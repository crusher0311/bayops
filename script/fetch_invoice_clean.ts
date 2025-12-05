import { createProtractorClient } from '../server/protractor';
import { db } from '../server/db';
import { protractorConnections } from '../shared/schema';
import fs from 'fs';

async function main() {
  const connections = await db.select().from(protractorConnections).limit(1);
  const conn = connections[0];
  const client = createProtractorClient(conn.connectionId, conn.apiKey, conn.authentication);
  
  const invoiceId = '0748f473-d211-43a9-b01d-07d3cb799085';
  const invoice = await client.getInvoice(invoiceId);
  
  // Save to file
  fs.writeFileSync('/tmp/invoice_clean.json', JSON.stringify(invoice, null, 2));
  console.log('Saved to /tmp/invoice_clean.json');
  
  // Show top-level keys
  console.log('\n=== TOP-LEVEL KEYS ===\n');
  console.log(Object.keys(invoice));
  
  process.exit(0);
}

main().catch(console.error);

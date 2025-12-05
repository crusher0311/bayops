import { createProtractorClient } from '../server/protractor';
import { db } from '../server/db';
import { protractorConnections } from '../shared/schema';

async function main() {
  const connections = await db.select().from(protractorConnections).limit(1);
  
  if (connections.length === 0) {
    console.log('No Protractor connection found');
    process.exit(1);
  }
  
  const conn = connections[0];
  console.log('Connection ID:', conn.connectionId);
  
  // Use the Protractor client to make the request
  const client = createProtractorClient(conn.connectionId, conn.apiKey, conn.authentication);
  
  const invoiceId = '0748f473-d211-43a9-b01d-07d3cb799085';
  
  console.log(`\n=== Fetching Invoice ${invoiceId} ===\n`);
  
  const invoice = await client.getInvoice(invoiceId);
  console.log(JSON.stringify(invoice, null, 2));
  
  process.exit(0);
}

main().catch(console.error);

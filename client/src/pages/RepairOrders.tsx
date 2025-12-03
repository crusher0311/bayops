import { AppLayout } from '@/components/layout/AppLayout';
import { useShopStore } from '@/lib/store';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'wouter';

export default function RepairOrders() {
  const { ros, customers, vehicles } = useShopStore();

  const getCustomer = (id: string) => customers.find(c => c.id === id);
  const getVehicle = (id: string) => vehicles.find(v => v.id === id);

  return (
    <AppLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Repair Orders</h1>
          <p className="text-muted-foreground mt-1">
            Manage estimates, work orders, and invoices.
          </p>
        </div>
        <Link href="/ros/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            New RO
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search by RO #, Customer, or VIN..." 
            className="pl-9 bg-background"
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="w-4 h-4" />
          Filter Status
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">RO #</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Promised</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ros.map((ro) => {
              const customer = getCustomer(ro.customerId);
              const vehicle = getVehicle(ro.vehicleId);
              const total = ro.lineItems.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);

              return (
                <TableRow key={ro.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium">#{ro.roNumber}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      ro.status === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-200' : 
                      ro.status === 'WORK_IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                      'bg-gray-50 text-gray-700 border-gray-200'
                    }>
                      {ro.status.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{customer?.firstName} {customer?.lastName}</span>
                      <span className="text-xs text-muted-foreground">{customer?.phone}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{vehicle?.year} {vehicle?.make} {vehicle?.model}</span>
                      <span className="text-xs text-muted-foreground">{vehicle?.licensePlate}</span>
                    </div>
                  </TableCell>
                  <TableCell>{format(new Date(ro.createdAt), 'MMM d, yyyy')}</TableCell>
                  <TableCell>
                    {ro.promisedAt ? format(new Date(ro.promisedAt), 'MMM d') : '-'}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${total.toFixed(2)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
}

import { AppLayout } from '@/components/layout/AppLayout';
import { useRepairOrders, useCustomers } from '@/lib/hooks';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Filter, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Link, useLocation } from 'wouter';
import { useState, useMemo } from 'react';

export default function RepairOrders() {
  const { currentLocationId } = useShopStore();
  const { data: ros = [], isLoading } = useRepairOrders(currentLocationId || undefined);
  const { data: customers = [] } = useCustomers();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<'active' | 'invoiced' | 'all'>('active');
  const [searchTerm, setSearchTerm] = useState('');

  const getCustomer = (id: string) => customers.find(c => c.id === id);

  // Filter ROs based on active tab
  const filteredRos = useMemo(() => {
    let filtered = ros;
    
    // Apply tab filter
    if (activeTab === 'active') {
      // Active = not completed (excludes all invoiced/completed ROs including imports)
      filtered = ros.filter(ro => ro.status !== 'completed');
    } else if (activeTab === 'invoiced') {
      // Invoiced = completed status
      filtered = ros.filter(ro => ro.status === 'completed');
    }
    
    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(ro => {
        const customer = getCustomer(ro.customerId);
        const customerName = `${customer?.firstName || ''} ${customer?.lastName || ''}`.toLowerCase();
        return (
          ro.roNumber?.toString().includes(search) ||
          customerName.includes(search) ||
          ro.id.toLowerCase().includes(search)
        );
      });
    }
    
    return filtered;
  }, [ros, activeTab, searchTerm]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

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
          <Button className="gap-2" data-testid="button-new-ro">
            <Plus className="w-4 h-4" />
            New RO
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'active' | 'invoiced' | 'all')}>
          <TabsList>
            <TabsTrigger value="active" data-testid="tab-active">
              Active ({ros.filter(ro => ro.status !== 'completed').length})
            </TabsTrigger>
            <TabsTrigger value="invoiced" data-testid="tab-invoiced">
              Invoiced ({ros.filter(ro => ro.status === 'completed').length})
            </TabsTrigger>
            <TabsTrigger value="all" data-testid="tab-all">
              All ({ros.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search by RO #, Customer..." 
            className="pl-9 bg-background"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="input-search-ro"
          />
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">RO #</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Promised</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {ros.length === 0 
                    ? 'No repair orders yet. Create your first one!'
                    : activeTab === 'active' 
                      ? 'No active repair orders.'
                      : activeTab === 'invoiced'
                        ? 'No invoiced repair orders.'
                        : 'No repair orders match your search.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredRos.map((ro) => {
                const customer = getCustomer(ro.customerId);
                const jobs = ro.jobs as Array<{ name: string; lineItems: Array<{ unitPrice: number; quantity: number }> }>;
                const total = jobs.reduce((jobAcc, job) => 
                  jobAcc + job.lineItems.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0)
                , 0);

                return (
                  <TableRow 
                    key={ro.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setLocation(`/ros/${ro.id}`)}
                    data-testid={`row-ro-${ro.id}`}
                  >
                    <TableCell className="font-medium">#{ro.roNumber}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        ro.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' : 
                        ro.status === 'in-progress' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                        'bg-gray-50 text-gray-700 border-gray-200'
                      }>
                        {ro.status.replace(/-/g, ' ').toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{customer?.firstName} {customer?.lastName}</span>
                        <span className="text-xs text-muted-foreground">{customer?.phone}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{jobs[0]?.name || 'Service'}</span>
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
              })
            )}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
}

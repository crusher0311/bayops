import { AppLayout } from '@/components/layout/AppLayout';
import { useShopStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, 
  Car, 
  Wrench, 
  TrendingUp, 
  Plus,
  ArrowRight,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'wouter';

export default function Dashboard() {
  const { ros, currentLocation } = useShopStore();

  // Simple stat calculations
  const activeRos = ros.filter(ro => ro.status !== 'COMPLETED' && ro.status !== 'INVOICED' && ro.status !== 'PAID');
  const completedToday = ros.filter(ro => ro.status === 'COMPLETED' && new Date(ro.completedAt || '').toDateString() === new Date().toDateString());
  
  // Calculate "Sales" roughly from completed/invoiced ROs
  const totalRevenue = ros
    .filter(ro => ['INVOICED', 'PAID'].includes(ro.status))
    .reduce((sum, ro) => {
      const roTotal = ro.lineItems.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);
      return sum + roTotal;
    }, 0);

  const aro = totalRevenue / (ros.filter(ro => ['INVOICED', 'PAID'].includes(ro.status)).length || 1);

  return (
    <AppLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview for {currentLocation?.name} &bull; {format(new Date(), 'MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/customers">
            <Button variant="outline" className="gap-2">
              <Plus className="w-4 h-4" />
              New Customer
            </Button>
          </Link>
          <Link href="/ros">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Repair Order
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +20.1% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active ROs</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeRos.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeRos.filter(r => r.status === 'WORK_IN_PROGRESS').length} currently in shop
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Car Count</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedToday.length + activeRos.length}</div>
            <p className="text-xs text-muted-foreground">
              +4 since yesterday
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ARO</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${aro.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">
              Average Repair Order
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest repair orders and status updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {ros.slice(0, 5).map((ro) => (
                <div key={ro.id} className="flex items-center">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      RO #{ro.roNumber} - {ro.lineItems[0]?.description || 'Service'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(ro.createdAt), 'MMM d, h:mm a')}
                    </p>
                  </div>
                  <div className="ml-auto font-medium">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                      ${ro.status === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-200' : 
                        ro.status === 'WORK_IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                        'bg-gray-100 text-gray-800 border-gray-200'}`}>
                      {ro.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Shop Status</CardTitle>
            <CardDescription>At a glance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Wrench className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Bay Utilization</p>
                    <p className="text-sm text-muted-foreground">4 / 6 Bays Active</p>
                  </div>
                </div>
                <span className="font-bold text-lg">67%</span>
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-orange-100 rounded-full">
                    <Clock className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium">On Time</p>
                    <p className="text-sm text-muted-foreground">Promises kept today</p>
                  </div>
                </div>
                <span className="font-bold text-lg">100%</span>
              </div>

              <div className="mt-4 pt-4 border-t">
                <Link href="/job-board">
                  <Button variant="ghost" className="w-full justify-between group">
                    Go to Job Board 
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

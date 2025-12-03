import { AppLayout } from '@/components/layout/AppLayout';
import { useRepairOrders, useLocations } from '@/lib/hooks';
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
  Clock,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'wouter';
import { useEffect } from 'react';

export default function Dashboard() {
  const { currentLocationId, setCurrentLocation } = useShopStore();
  const { data: locations = [], isLoading: locationsLoading } = useLocations();
  const { data: ros = [], isLoading: rosLoading } = useRepairOrders(currentLocationId || undefined);

  // Set default location if none selected
  useEffect(() => {
    if (!currentLocationId && locations.length > 0) {
      setCurrentLocation(locations[0].id);
    }
  }, [locations, currentLocationId, setCurrentLocation]);

  const currentLocation = locations.find(l => l.id === currentLocationId);

  // Simple stat calculations
  const activeRos = ros.filter(ro => ro.status !== 'completed');
  const completedToday = ros.filter(ro => 
    ro.status === 'completed' && 
    ro.completedAt && 
    new Date(ro.completedAt).toDateString() === new Date().toDateString()
  );
  
  // Calculate "Sales" roughly from completed ROs
  const totalRevenue = ros
    .filter(ro => ro.status === 'completed')
    .reduce((sum, ro) => {
      const jobs = ro.jobs as Array<{ lineItems: Array<{ unitPrice: number; quantity: number }> }>;
      const roTotal = jobs.reduce((jobSum, job) => 
        jobSum + job.lineItems.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0)
      , 0);
      return sum + roTotal;
    }, 0);

  const completedCount = ros.filter(ro => ro.status === 'completed').length;
  const aro = completedCount > 0 ? totalRevenue / completedCount : 0;

  if (locationsLoading || rosLoading) {
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
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview for {currentLocation?.name || 'All Locations'} &bull; {format(new Date(), 'MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/customers">
            <Button variant="outline" className="gap-2" data-testid="button-new-customer">
              <Plus className="w-4 h-4" />
              New Customer
            </Button>
          </Link>
          <Link href="/ros">
            <Button className="gap-2" data-testid="button-new-ro">
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
            <div className="text-2xl font-bold" data-testid="text-total-revenue">
              ${totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              From {completedCount} completed ROs
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active ROs</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-ros">
              {activeRos.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {activeRos.filter(r => r.status === 'in-progress').length} currently in shop
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Car Count</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-car-count">
              {completedToday.length + activeRos.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Vehicles today
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ARO</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-aro">
              ${aro.toFixed(0)}
            </div>
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
              {ros.length === 0 ? (
                <p className="text-muted-foreground text-sm">No repair orders yet</p>
              ) : (
                ros.slice(0, 5).map((ro) => {
                  const jobs = ro.jobs as Array<{ name: string }>;
                  return (
                    <div key={ro.id} className="flex items-center" data-testid={`row-activity-${ro.id}`}>
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">
                          RO #{ro.roNumber} - {jobs[0]?.name || 'Service'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(ro.createdAt), 'MMM d, h:mm a')}
                        </p>
                      </div>
                      <div className="ml-auto font-medium">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                          ${ro.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' : 
                            ro.status === 'in-progress' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                            'bg-gray-100 text-gray-800 border-gray-200'}`}>
                          {ro.status.replace(/-/g, ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
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
                    <p className="font-medium">Active Jobs</p>
                    <p className="text-sm text-muted-foreground">{activeRos.length} vehicles in shop</p>
                  </div>
                </div>
                <span className="font-bold text-lg">{activeRos.length}</span>
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-orange-100 rounded-full">
                    <Clock className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium">Waiting Approval</p>
                    <p className="text-sm text-muted-foreground">Pending customer response</p>
                  </div>
                </div>
                <span className="font-bold text-lg">
                  {ros.filter(r => r.status === 'waiting-approval').length}
                </span>
              </div>

              <div className="mt-4 pt-4 border-t">
                <Link href="/job-board">
                  <Button variant="ghost" className="w-full justify-between group" data-testid="button-go-to-job-board">
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

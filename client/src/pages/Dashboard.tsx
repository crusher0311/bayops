import { AppLayout } from '@/components/layout/AppLayout';
import { useRepairOrders, useLocations, useDashboardRepairOrders } from '@/lib/hooks';
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
  Loader2,
  Zap
} from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'wouter';
import { useEffect } from 'react';

export default function Dashboard() {
  const { currentLocationId, setCurrentLocation } = useShopStore();
  const { data: locations = [], isLoading: locationsLoading } = useLocations();
  const { data: ros = [], isLoading: rosLoading } = useRepairOrders(currentLocationId || undefined);
  const { data: dashboardRos = [] } = useDashboardRepairOrders(currentLocationId || '', 10);

  // Set default location if none selected
  useEffect(() => {
    if (!currentLocationId && locations.length > 0) {
      setCurrentLocation(locations[0].id);
    }
  }, [locations, currentLocationId, setCurrentLocation]);

  const currentLocation = locations.find(l => l.id === currentLocationId) as any;

  // Helper to get the effective date for an RO (use original invoice date for imports, otherwise completion date)
  const getEffectiveDate = (ro: any): Date | null => {
    if (ro.originalInvoiceDate) {
      return new Date(ro.originalInvoiceDate);
    }
    if (ro.completedAt) {
      return new Date(ro.completedAt);
    }
    return null;
  };

  const today = new Date().toDateString();
  
  // Helper to check if RO is imported (from Protractor)
  const isImported = (ro: any): boolean => !!ro.legacySystem || !!ro.legacyId;

  // Simple stat calculations - exclude imported historical ROs from "active"
  const activeRos = ros.filter(ro => ro.status !== 'completed' && !isImported(ro));
  
  // Non-imported ROs for recent activity (real work, not historical imports)
  const recentNativeRos = ros.filter(ro => !isImported(ro));
  
  // Completed today = only ROs that were actually completed/invoiced TODAY (not historical imports)
  const completedToday = ros.filter(ro => {
    if (ro.status !== 'completed') return false;
    const effectiveDate = getEffectiveDate(ro);
    return effectiveDate && effectiveDate.toDateString() === today;
  });
  
  // Today's revenue - only from ROs completed/invoiced today
  const todayRevenue = completedToday.reduce((sum, ro) => {
    if (ro.grandTotal) return sum + ro.grandTotal;
    const jobs = ro.jobs as Array<{ lineItems: Array<{ unitPrice: number; quantity: number }> }>;
    const roTotal = jobs.reduce((jobSum, job) => 
      jobSum + job.lineItems.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0)
    , 0);
    return sum + roTotal;
  }, 0);

  // Total historical revenue (all completed ROs)
  const totalRevenue = ros
    .filter(ro => ro.status === 'completed')
    .reduce((sum, ro) => {
      if (ro.grandTotal) return sum + ro.grandTotal;
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
          <Link href="/quick-checkin">
            <Button variant="outline" className="gap-2 border-blue-500 text-blue-500 hover:bg-blue-50" data-testid="button-quick-checkin">
              <Zap className="w-4 h-4" />
              Quick Check-In
            </Button>
          </Link>
          <Link href="/customers">
            <Button variant="outline" className="gap-2" data-testid="button-new-customer">
              <Plus className="w-4 h-4" />
              New Customer
            </Button>
          </Link>
          <Link href="/ros/new">
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
            <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-today-revenue">
              ${todayRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {completedToday.length} invoiced today
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
            <div className="space-y-4">
              {dashboardRos.filter(ro => !ro.legacySystem && !ro.legacyId).length === 0 ? (
                <p className="text-muted-foreground text-sm">No repair orders yet</p>
              ) : (
                dashboardRos.filter(ro => !ro.legacySystem && !ro.legacyId).slice(0, 5).map((ro) => {
                  const customerName = ro.customer 
                    ? `${ro.customer.firstName} ${ro.customer.lastName}` 
                    : 'Walk-in';
                  const vehicleYMM = ro.vehicle 
                    ? `${ro.vehicle.year} ${ro.vehicle.make} ${ro.vehicle.model}`
                    : 'No vehicle';
                  const rvh = ro.concerns?.length > 0 
                    ? ro.concerns.map((c: any) => typeof c === 'string' ? c : c.text).join('; ')
                    : (ro.notes || '');
                  
                  return (
                    <Link key={ro.id} href={`/ros/${ro.id}`}>
                      <div className="cursor-pointer hover:bg-muted/50 rounded-lg p-3 -mx-2 transition-colors border-b last:border-b-0" data-testid={`row-activity-${ro.id}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-sm">RO #{ro.roNumber}</span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border
                                ${ro.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' : 
                                  ro.status === 'in-progress' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                                  'bg-gray-100 text-gray-800 border-gray-200'}`}>
                                {ro.status.replace(/-/g, ' ').toUpperCase()}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-foreground">{customerName}</p>
                            <p className="text-xs text-muted-foreground">{vehicleYMM}</p>
                            {rvh && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 italic">
                                RVH: {rvh}
                              </p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(ro.createdAt), 'MMM d')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(ro.createdAt), 'h:mm a')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Link>
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

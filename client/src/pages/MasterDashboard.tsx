import { AppLayout } from '@/components/layout/AppLayout';
import { useLocations, useRepairOrders } from '@/lib/hooks';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart3, DollarSign, Car, TrendingUp, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function MasterDashboard() {
  const { data: locations = [], isLoading: locationsLoading } = useLocations();
  const { data: ros = [], isLoading: rosLoading } = useRepairOrders();

  if (locationsLoading || rosLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  const totalRevenue = ros
    .filter(ro => ro.status === 'completed')
    .reduce((sum, ro) => {
      const jobs = ro.jobs as Array<{ lineItems: Array<{ unitPrice: number; quantity: number }> }>;
      const roTotal = jobs.reduce((jobSum, job) => 
        jobSum + job.lineItems.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0)
      , 0);
      return sum + roTotal;
    }, 0);

  const totalActiveROs = ros.filter(ro => ro.status !== 'completed').length;
  const completedCount = ros.filter(ro => ro.status === 'completed').length;
  const networkARO = completedCount > 0 ? totalRevenue / completedCount : 0;
  
  const locationStats = locations.map(loc => {
    const locRos = ros.filter(r => r.locationId === loc.id);
    const locRevenue = locRos
      .filter(ro => ro.status === 'completed')
      .reduce((sum, ro) => {
        const jobs = ro.jobs as Array<{ lineItems: Array<{ unitPrice: number; quantity: number }> }>;
        const roTotal = jobs.reduce((jobSum, job) => 
          jobSum + job.lineItems.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0)
        , 0);
        return sum + roTotal;
      }, 0);
      
    const activeCount = locRos.filter(ro => ro.status !== 'completed').length;

    return {
      ...loc,
      revenue: locRevenue,
      activeCount
    };
  });

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Master Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Multi-location overview for {format(new Date(), 'MMMM yyyy')}
          </p>
        </div>
        <Badge variant="secondary" className="text-sm px-3 py-1" data-testid="badge-location-count">
          {locations.length} Locations Active
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card className="bg-slate-900 text-white border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Total Network Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-network-revenue">
              ${totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-slate-400 mt-1">All locations combined</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Active Jobs</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-active-jobs">
              {totalActiveROs}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Across {locations.length} shops</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Network ARO</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-network-aro">
              ${networkARO.toFixed(0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Average Repair Order</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Performance by Location
          </CardTitle>
          <CardDescription>Real-time metrics for each shop in your organization.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Active ROs</TableHead>
                <TableHead className="text-right">Revenue (MTD)</TableHead>
                <TableHead className="text-right">Performance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locationStats.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No location data available.
                  </TableCell>
                </TableRow>
              ) : (
                locationStats.map((loc) => (
                  <TableRow key={loc.id} data-testid={`row-location-${loc.id}`}>
                    <TableCell className="font-medium">{loc.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Online
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{loc.activeCount}</TableCell>
                    <TableCell className="text-right font-bold">
                      ${loc.revenue.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                         <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                           <div 
                             className="h-full bg-primary" 
                             style={{ width: `${Math.min((loc.revenue / 5000) * 100, 100)}%` }} 
                           />
                         </div>
                         <span className="text-xs text-muted-foreground">Target</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppLayout>
  );
}

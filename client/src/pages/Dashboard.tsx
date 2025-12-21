import { AppLayout } from '@/components/layout/AppLayout';
import { useRepairOrders, useLocations } from '@/lib/hooks';
import { useShopStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  DollarSign, 
  Car, 
  Wrench, 
  TrendingUp, 
  Plus,
  ArrowRight,
  Clock,
  Loader2,
  Zap,
  QrCode,
  Smartphone,
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'wouter';
import { useEffect, useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function Dashboard() {
  const { currentLocationId, setCurrentLocation } = useShopStore();
  const { data: locations = [], isLoading: locationsLoading } = useLocations();
  const { data: ros = [], isLoading: rosLoading } = useRepairOrders(currentLocationId || undefined);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  // Set default location if none selected
  useEffect(() => {
    if (!currentLocationId && locations.length > 0) {
      setCurrentLocation(locations[0].id);
    }
  }, [locations, currentLocationId, setCurrentLocation]);

  const currentLocation = locations.find(l => l.id === currentLocationId) as any;
  const checkInToken = currentLocation?.checkInToken;
  const checkInUrl = currentLocationId && checkInToken 
    ? `${window.location.origin}/checkin/${currentLocationId}/${checkInToken}` 
    : '';

  const downloadQRCode = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;
    
    const svgClone = svg.cloneNode(true) as SVGElement;
    svgClone.setAttribute('width', '400');
    svgClone.setAttribute('height', '400');
    
    const svgData = new XMLSerializer().serializeToString(svgClone);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    
    const img = new Image();
    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 400, 400);
        ctx.drawImage(img, 0, 0, 400, 400);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const pngUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `${currentLocation?.name || 'shop'}-checkin-qr.png`;
            link.href = pngUrl;
            link.click();
            URL.revokeObjectURL(pngUrl);
          }
        }, 'image/png');
      }
      URL.revokeObjectURL(url);
    };
    
    img.src = url;
  };

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
            <div className="space-y-8">
              {recentNativeRos.length === 0 ? (
                <p className="text-muted-foreground text-sm">No repair orders yet</p>
              ) : (
                recentNativeRos.slice(0, 5).map((ro) => {
                  const jobs = ro.jobs as Array<{ name: string }>;
                  return (
                    <Link key={ro.id} href={`/ros/${ro.id}`}>
                      <div className="flex items-center cursor-pointer hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors" data-testid={`row-activity-${ro.id}`}>
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-100">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Smartphone className="w-5 h-5 text-blue-600" />
              Customer Self Check-In
            </CardTitle>
            <CardDescription>
              Let customers check in from their own phone
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full gap-2 border-blue-200 hover:bg-blue-100"
                  data-testid="button-show-qr"
                >
                  <QrCode className="w-4 h-4" />
                  Show QR Code
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                  <DialogTitle className="text-center">Customer Self Check-In</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center py-6">
                  <div ref={qrRef} className="bg-white p-4 rounded-xl shadow-lg">
                    {checkInUrl && (
                      <QRCodeSVG 
                        value={checkInUrl}
                        size={200}
                        level="H"
                        includeMargin
                      />
                    )}
                  </div>
                  <p className="text-center text-sm text-muted-foreground mt-4 max-w-[280px]">
                    Display this QR code in your waiting area. Customers scan it to check in from their phone.
                  </p>
                  <div className="flex gap-2 mt-4 w-full">
                    <Button 
                      variant="outline" 
                      className="flex-1 gap-2"
                      onClick={downloadQRCode}
                      data-testid="button-download-qr"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </Button>
                    <Button 
                      className="flex-1 gap-2"
                      onClick={() => {
                        navigator.clipboard.writeText(checkInUrl);
                      }}
                      data-testid="button-copy-link"
                    >
                      Copy Link
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

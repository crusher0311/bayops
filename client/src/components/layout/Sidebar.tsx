import { useAuthStore } from '@/lib/authStore';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  ClipboardList, 
  ClipboardCheck,
  FileText, 
  Users, 
  Package, 
  BarChart3, 
  Settings,
  Wrench,
  Building2,
  LayoutGrid,
  Kanban,
  Calendar,
  Truck,
  Clock,
  Receipt,
  UsersRound,
  MessageSquare,
  QrCode,
  Download
} from 'lucide-react';

export function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuthStore();
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  
  // Get the user's primary location ID
  const userLocationId = user?.locationIds?.[0];
  
  const { data: settings } = useQuery({
    queryKey: ['settings', userLocationId],
    queryFn: () => apiRequest(`/api/settings/all/${userLocationId}`),
    enabled: !!user && !!userLocationId,
  });
  
  const logoUrl = settings?.orgBranding?.logoUrl;
  const shopName = settings?.location?.name || 'BayOPS';
  const checkInToken = settings?.location?.checkInToken;
  const checkInUrl = userLocationId && checkInToken 
    ? `${window.location.origin}/checkin/${userLocationId}/${checkInToken}` 
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
            link.download = `${shopName}-checkin-qr.png`;
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
  
  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
    { icon: ClipboardList, label: 'Job Board', href: '/job-board' },
    { icon: Kanban, label: 'Dispatch Board', href: '/dispatch' },
    { icon: FileText, label: 'Repair Orders', href: '/ros' },
    { icon: ClipboardCheck, label: 'Inspections', href: '/inspections' },
    { icon: MessageSquare, label: 'Messages', href: '/messages' },
    { icon: Calendar, label: 'Appointments', href: '/appointments' },
    { icon: UsersRound, label: 'Service Queue', href: '/service-queue' },
    { icon: Users, label: 'Customers', href: '/customers' },
    { icon: Truck, label: 'Parts', href: '/parts' },
    { icon: Clock, label: 'Time Tracking', href: '/time-tracking' },
    { icon: Receipt, label: 'Invoices', href: '/invoices' },
    { icon: Package, label: 'Inventory', href: '/inventory' },
    { icon: BarChart3, label: 'Reports', href: '/reports' },
    { icon: Settings, label: 'Settings', href: '/settings' },
  ];

  const isOrgAdmin = user?.role === 'OWNER' || user?.role === 'MANAGER';
  
  const orgNavItems = [
    { icon: LayoutGrid, label: 'Master Dashboard', href: '/master-dashboard' },
    { icon: Building2, label: 'Organization', href: '/org-settings' },
  ];

  return (
    <div className="w-64 h-screen bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border">
      <div className="p-6 flex items-center gap-3">
        {logoUrl ? (
          <img 
            src={logoUrl} 
            alt={shopName} 
            className="h-8 max-w-[180px] object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <div className={cn("flex items-center gap-3", logoUrl && "hidden")}>
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Wrench className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight">{shopName}</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
                isActive 
                  ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )} data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}>
                <item.icon className="w-4 h-4" />
                {item.label}
              </div>
            </Link>
          );
        })}

        {isOrgAdmin && (
          <>
            <div className="pt-4 pb-2 px-3">
              <p className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider">
                Organization
              </p>
            </div>
            {orgNavItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <div className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
                    isActive 
                      ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )} data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}>
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="p-4 border-t border-sidebar-border space-y-3">
        {checkInUrl && (
          <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
            <DialogTrigger asChild>
              <button 
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                data-testid="button-sidebar-qr"
              >
                <QrCode className="w-4 h-4" />
                Customer Check-In
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle className="text-center">Customer Self Check-In</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center py-6">
                <div ref={qrRef} className="bg-white p-4 rounded-xl shadow-lg">
                  <QRCodeSVG 
                    value={checkInUrl}
                    size={200}
                    level="H"
                    includeMargin
                  />
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
        )}
        <div className="bg-sidebar-accent/50 rounded-lg p-3">
          <p className="text-xs font-medium text-sidebar-foreground/50 mb-1">Support</p>
          <div className="text-sm font-medium">Need help?</div>
          <div className="text-xs text-sidebar-foreground/70">Docs & Knowledge Base</div>
        </div>
      </div>
    </div>
  );
}

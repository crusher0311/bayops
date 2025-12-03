import { useShopStore } from '@/lib/store';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  ClipboardList, 
  FileText, 
  Users, 
  Package, 
  BarChart3, 
  Settings,
  Wrench
} from 'lucide-react';

export function Sidebar() {
  const [location] = useLocation();
  
  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
    { icon: ClipboardList, label: 'Job Board', href: '/job-board' },
    { icon: FileText, label: 'Repair Orders', href: '/ros' },
    { icon: Users, label: 'Customers', href: '/customers' },
    { icon: Package, label: 'Inventory', href: '/inventory' },
    { icon: BarChart3, label: 'Reports', href: '/reports' },
    { icon: Settings, label: 'Settings', href: '/settings' },
  ];

  return (
    <div className="w-64 h-screen bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <Wrench className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="font-display font-bold text-xl tracking-tight">ShopFlow</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <a className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                isActive 
                  ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}>
                <item.icon className="w-4 h-4" />
                {item.label}
              </a>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="bg-sidebar-accent/50 rounded-lg p-3">
          <p className="text-xs font-medium text-sidebar-foreground/50 mb-1">Support</p>
          <div className="text-sm font-medium">Need help?</div>
          <div className="text-xs text-sidebar-foreground/70">Docs & Knowledge Base</div>
        </div>
      </div>
    </div>
  );
}

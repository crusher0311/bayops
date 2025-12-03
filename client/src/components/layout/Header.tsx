import { useAuthStore } from '@/lib/authStore';
import { useShopStore } from '@/lib/store';
import { useLocations } from '@/lib/hooks';
import { 
  Bell, 
  Search, 
  MapPin,
  ChevronDown,
  LogOut
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLocation } from 'wouter';

export function Header() {
  const { user, logout } = useAuthStore();
  const { currentLocationId, setCurrentLocation } = useShopStore();
  const { data: locations = [] } = useLocations();
  const [, navigate] = useLocation();

  const currentLocation = locations.find(l => l.id === currentLocationId);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="h-16 border-b bg-card px-6 flex items-center justify-between">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-lg">Apex Automotive</h2>
          <span className="text-muted-foreground">/</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 h-8 border-dashed" data-testid="button-location-switcher">
                <MapPin className="w-3.5 h-3.5" />
                {currentLocation?.name || 'Select Location'}
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Switch Location</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {locations.map(loc => (
                <DropdownMenuItem 
                  key={loc.id} 
                  onClick={() => setCurrentLocation(loc.id)}
                  className="gap-2"
                  data-testid={`menu-location-${loc.id}`}
                >
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  {loc.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative w-64 hidden md:block">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search ROs, Customers, VINs..." 
            className="pl-9 h-9 bg-secondary/50 border-transparent focus:bg-background focus:border-input transition-all"
            data-testid="input-search"
          />
        </div>

        <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
        </Button>

        <div className="h-8 w-[1px] bg-border mx-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-3 cursor-pointer" data-testid="button-user-menu">
              <div className="text-right hidden md:block">
                <div className="text-sm font-medium">{user?.name}</div>
                <div className="text-xs text-muted-foreground">{user?.role}</div>
              </div>
              <Avatar className="h-9 w-9 border">
                <AvatarImage src={user?.avatarUrl || undefined} />
                <AvatarFallback>{user?.name?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="gap-2 text-red-600" data-testid="button-logout">
              <LogOut className="w-4 h-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

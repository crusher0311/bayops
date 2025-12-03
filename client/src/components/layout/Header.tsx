import { useShopStore } from '@/lib/store';
import { 
  Bell, 
  Search, 
  MapPin,
  ChevronDown
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

export function Header() {
  const { currentUser, currentLocation, locations, setCurrentLocation, organization } = useShopStore();

  return (
    <header className="h-16 border-b bg-card px-6 flex items-center justify-between">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-lg">{organization.name}</h2>
          <span className="text-muted-foreground">/</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 h-8 border-dashed">
                <MapPin className="w-3.5 h-3.5" />
                {currentLocation?.name}
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
          />
        </div>

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
        </Button>

        <div className="h-8 w-[1px] bg-border mx-1" />

        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <div className="text-sm font-medium">{currentUser?.name}</div>
            <div className="text-xs text-muted-foreground">{currentUser?.role}</div>
          </div>
          <Avatar className="h-9 w-9 border">
            <AvatarImage src={currentUser?.avatarUrl} />
            <AvatarFallback>{currentUser?.name.charAt(0)}</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}

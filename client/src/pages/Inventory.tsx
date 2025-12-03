import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useInventory, useLocations } from '@/lib/hooks';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Package, Disc, Loader2 } from 'lucide-react';

export default function Inventory() {
  const { currentLocationId, setCurrentLocation } = useShopStore();
  const { data: locations = [] } = useLocations();
  const [search, setSearch] = useState('');
  
  useEffect(() => {
    if (!currentLocationId && locations.length > 0) {
      setCurrentLocation(locations[0].id);
    }
  }, [locations, currentLocationId, setCurrentLocation]);

  const { data: inventory = [], isLoading } = useInventory(
    currentLocationId || '', 
    search || undefined
  );

  const tires = inventory.filter(i => i.type === 'TIRE');
  const parts = inventory.filter(i => i.type !== 'TIRE');

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
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground mt-1">
            Manage tires, parts, and stock levels.
          </p>
        </div>
        <Button className="gap-2" data-testid="button-add-item">
          <Plus className="w-4 h-4" />
          Add Item
        </Button>
      </div>

      <Tabs defaultValue="tires" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="tires" className="gap-2" data-testid="tab-tires">
              <Disc className="w-4 h-4" /> Tires ({tires.length})
            </TabsTrigger>
            <TabsTrigger value="parts" className="gap-2" data-testid="tab-parts">
              <Package className="w-4 h-4" /> Parts & Supplies ({parts.length})
            </TabsTrigger>
          </TabsList>
          
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search SKU, Brand, Size..." 
              className="pl-9 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search-inventory"
            />
          </div>
        </div>

        <TabsContent value="tires" className="space-y-4">
          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Brand / Model</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Specs</TableHead>
                  <TableHead className="text-right">On Hand</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tires.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No tires in inventory. Add your first tire!
                    </TableCell>
                  </TableRow>
                ) : (
                  tires.map((item) => (
                    <TableRow key={item.id} data-testid={`row-tire-${item.id}`}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{item.brand}</span>
                          <span className="text-muted-foreground">{item.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{item.tireSize}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{item.category?.replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.loadIndex}{item.speedRating}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        <span className={item.quantityOnHand < 4 ? "text-red-500" : ""}>
                          {item.quantityOnHand}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        ${parseFloat(item.cost).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        ${parseFloat(item.price).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" data-testid={`button-edit-${item.id}`}>Edit</Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="parts" className="space-y-4">
          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Bin</TableHead>
                  <TableHead className="text-right">On Hand</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No parts in inventory. Add your first part!
                    </TableCell>
                  </TableRow>
                ) : (
                  parts.map((item) => (
                    <TableRow key={item.id} data-testid={`row-part-${item.id}`}>
                      <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.brand}</TableCell>
                      <TableCell className="text-muted-foreground">{item.binLocation}</TableCell>
                      <TableCell className="text-right font-medium">
                        <span className={item.quantityOnHand < 5 ? "text-red-500" : ""}>
                          {item.quantityOnHand}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        ${parseFloat(item.cost).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        ${parseFloat(item.price).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" data-testid={`button-edit-${item.id}`}>Edit</Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}

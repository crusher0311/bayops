import { AppLayout } from '@/components/layout/AppLayout';
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
import { Plus, Search, Package, Disc } from 'lucide-react';

export default function Inventory() {
  const { inventory } = useShopStore();

  const tires = inventory.filter(i => i.type === 'TIRE');
  const parts = inventory.filter(i => i.type !== 'TIRE');

  return (
    <AppLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground mt-1">
            Manage tires, parts, and stock levels.
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Item
        </Button>
      </div>

      <Tabs defaultValue="tires" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="tires" className="gap-2">
              <Disc className="w-4 h-4" /> Tires
            </TabsTrigger>
            <TabsTrigger value="parts" className="gap-2">
              <Package className="w-4 h-4" /> Parts & Supplies
            </TabsTrigger>
          </TabsList>
          
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search SKU, Brand, Size..." 
              className="pl-9 h-9"
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
                {tires.map((item) => (
                  <TableRow key={item.id}>
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
                      ${item.cost.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      ${item.price.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">Edit</Button>
                    </TableCell>
                  </TableRow>
                ))}
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
                {parts.map((item) => (
                  <TableRow key={item.id}>
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
                      ${item.cost.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      ${item.price.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">Edit</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}

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
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Search, 
  Package, 
  Disc, 
  Loader2, 
  Edit, 
  Trash2, 
  AlertTriangle,
  DollarSign,
  TrendingDown,
  PackageCheck,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { InventoryItem, InsertInventoryItem } from '@shared/schema';

const TIRE_CATEGORIES = [
  { value: 'ALL_SEASON', label: 'All Season' },
  { value: 'WINTER', label: 'Winter' },
  { value: 'PERFORMANCE', label: 'Performance' },
  { value: 'LT', label: 'Light Truck' },
  { value: 'AT', label: 'All Terrain' },
];

const INVENTORY_TYPES = [
  { value: 'TIRE', label: 'Tire' },
  { value: 'PART', label: 'Part' },
  { value: 'OTHER', label: 'Other/Supply' },
];

interface ItemFormData {
  type: 'TIRE' | 'PART' | 'OTHER';
  sku: string;
  brand: string;
  name: string;
  description: string;
  tireSize: string;
  speedRating: string;
  loadIndex: string;
  category: string;
  cost: string;
  price: string;
  quantityOnHand: string;
  minQuantity: string;
  maxQuantity: string;
  binLocation: string;
  vendorPartNumber: string;
  upc: string;
}

const defaultFormData: ItemFormData = {
  type: 'PART',
  sku: '',
  brand: '',
  name: '',
  description: '',
  tireSize: '',
  speedRating: '',
  loadIndex: '',
  category: '',
  cost: '',
  price: '',
  quantityOnHand: '0',
  minQuantity: '0',
  maxQuantity: '',
  binLocation: '',
  vendorPartNumber: '',
  upc: '',
};

export default function Inventory() {
  const { currentLocationId, setCurrentLocation } = useShopStore();
  const { data: locations = [] } = useLocations();
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState<ItemFormData>(defaultFormData);
  const [adjustmentType, setAdjustmentType] = useState<string>('RECEIVE');
  const [adjustmentQuantity, setAdjustmentQuantity] = useState<string>('');
  const [adjustmentNotes, setAdjustmentNotes] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  useEffect(() => {
    if (!currentLocationId && locations.length > 0) {
      setCurrentLocation(locations[0].id);
    }
  }, [locations, currentLocationId, setCurrentLocation]);

  const { data: inventory = [], isLoading } = useInventory(
    currentLocationId || '', 
    search || undefined
  );

  const { data: lowStockItems = [] } = useQuery({
    queryKey: ['low-stock', currentLocationId],
    queryFn: () => api.getLowStockItems(currentLocationId!),
    enabled: !!currentLocationId,
  });

  const tires = inventory.filter(i => i.type === 'TIRE');
  const parts = inventory.filter(i => i.type !== 'TIRE');

  const totalValue = inventory.reduce((sum, item) => {
    return sum + (parseFloat(item.cost) * item.quantityOnHand);
  }, 0);

  const totalItems = inventory.reduce((sum, item) => sum + item.quantityOnHand, 0);

  const createMutation = useMutation({
    mutationFn: (data: InsertInventoryItem) => api.createInventoryItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock'] });
      toast({ title: 'Item created successfully' });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating item', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<InsertInventoryItem> }) => 
      api.updateInventoryItem(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock'] });
      toast({ title: 'Item updated successfully' });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating item', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteInventoryItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock'] });
      toast({ title: 'Item deleted successfully' });
      setIsDeleteDialogOpen(false);
      setDeletingItem(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting item', description: error.message, variant: 'destructive' });
    },
  });

  const adjustMutation = useMutation({
    mutationFn: ({ itemId, adjustment }: { itemId: string; adjustment: { type: string; quantity: number; notes?: string } }) => 
      api.adjustInventory(itemId, adjustment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock'] });
      toast({ title: 'Stock adjusted successfully' });
      handleCloseAdjustDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Error adjusting stock', description: error.message, variant: 'destructive' });
    },
  });

  const handleOpenAdjustDialog = (item: InventoryItem) => {
    setAdjustingItem(item);
    setAdjustmentType('RECEIVE');
    setAdjustmentQuantity('');
    setAdjustmentNotes('');
    setIsAdjustDialogOpen(true);
  };

  const handleCloseAdjustDialog = () => {
    setIsAdjustDialogOpen(false);
    setAdjustingItem(null);
    setAdjustmentType('RECEIVE');
    setAdjustmentQuantity('');
    setAdjustmentNotes('');
  };

  const handleAdjustSubmit = () => {
    if (!adjustingItem || !adjustmentQuantity) return;
    
    const quantity = parseInt(adjustmentQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast({ title: 'Invalid quantity', description: 'Please enter a positive number', variant: 'destructive' });
      return;
    }

    adjustMutation.mutate({
      itemId: adjustingItem.id,
      adjustment: {
        type: adjustmentType,
        quantity: adjustmentType === 'COUNT' || adjustmentType === 'ADJUST' ? quantity : quantity,
        notes: adjustmentNotes || undefined,
      },
    });
  };

  const handleOpenDialog = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        type: item.type,
        sku: item.sku,
        brand: item.brand,
        name: item.name,
        description: item.description || '',
        tireSize: item.tireSize || '',
        speedRating: item.speedRating || '',
        loadIndex: item.loadIndex || '',
        category: item.category || '',
        cost: item.cost,
        price: item.price,
        quantityOnHand: item.quantityOnHand.toString(),
        minQuantity: item.minQuantity.toString(),
        maxQuantity: item.maxQuantity?.toString() || '',
        binLocation: item.binLocation || '',
        vendorPartNumber: item.vendorPartNumber || '',
        upc: item.upc || '',
      });
    } else {
      setEditingItem(null);
      setFormData(defaultFormData);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setFormData(defaultFormData);
  };

  const handleSubmit = () => {
    if (!currentLocationId) return;

    const itemData: InsertInventoryItem = {
      locationId: currentLocationId,
      orgId: '', // Will be set by backend
      type: formData.type,
      sku: formData.sku,
      brand: formData.brand,
      name: formData.name,
      description: formData.description || undefined,
      tireSize: formData.type === 'TIRE' ? formData.tireSize : undefined,
      speedRating: formData.type === 'TIRE' ? formData.speedRating : undefined,
      loadIndex: formData.type === 'TIRE' ? formData.loadIndex : undefined,
      category: formData.type === 'TIRE' && formData.category ? formData.category as any : undefined,
      cost: formData.cost,
      price: formData.price,
      quantityOnHand: parseInt(formData.quantityOnHand) || 0,
      minQuantity: parseInt(formData.minQuantity) || 0,
      maxQuantity: formData.maxQuantity ? parseInt(formData.maxQuantity) : undefined,
      binLocation: formData.binLocation || undefined,
      vendorPartNumber: formData.vendorPartNumber || undefined,
      upc: formData.upc || undefined,
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, updates: itemData });
    } else {
      createMutation.mutate(itemData);
    }
  };

  const handleDelete = (item: InventoryItem) => {
    setDeletingItem(item);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deletingItem) {
      deleteMutation.mutate(deletingItem.id);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  const renderInventoryRow = (item: InventoryItem, type: 'tire' | 'part') => {
    const isLowStock = item.quantityOnHand <= item.minQuantity;
    
    return (
      <TableRow key={item.id} data-testid={`row-${type}-${item.id}`}>
        {type === 'tire' ? (
          <>
            <TableCell>
              <div className="flex flex-col">
                <span className="font-medium">{item.brand}</span>
                <span className="text-muted-foreground text-sm">{item.name}</span>
              </div>
            </TableCell>
            <TableCell className="font-mono text-sm">{item.tireSize}</TableCell>
            <TableCell>
              {item.category && (
                <Badge variant="secondary">{item.category.replace('_', ' ')}</Badge>
              )}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {item.loadIndex}{item.speedRating}
            </TableCell>
          </>
        ) : (
          <>
            <TableCell className="font-mono text-sm">{item.sku}</TableCell>
            <TableCell>
              <div className="flex flex-col">
                <span className="font-medium">{item.name}</span>
                {item.description && (
                  <span className="text-muted-foreground text-sm truncate max-w-xs">
                    {item.description}
                  </span>
                )}
              </div>
            </TableCell>
            <TableCell>{item.brand}</TableCell>
            <TableCell className="text-muted-foreground">{item.binLocation || '-'}</TableCell>
          </>
        )}
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-2">
            {isLowStock && (
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            )}
            <span className={isLowStock ? "text-amber-600 font-medium" : ""}>
              {item.quantityOnHand}
            </span>
            {item.minQuantity > 0 && (
              <span className="text-xs text-muted-foreground">
                (min: {item.minQuantity})
              </span>
            )}
          </div>
        </TableCell>
        <TableCell className="text-right text-muted-foreground">
          ${parseFloat(item.cost).toFixed(2)}
        </TableCell>
        <TableCell className="text-right font-bold">
          ${parseFloat(item.price).toFixed(2)}
        </TableCell>
        <TableCell className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" data-testid={`button-menu-${item.id}`}>
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleOpenAdjustDialog(item)}>
                <PackageCheck className="w-4 h-4 mr-2" />
                Adjust Stock
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleOpenDialog(item)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleDelete(item)}
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <AppLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground mt-1">
            Manage tires, parts, and stock levels.
          </p>
        </div>
        <Button className="gap-2" onClick={() => handleOpenDialog()} data-testid="button-add-item">
          <Plus className="w-4 h-4" />
          Add Item
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mt-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {inventory.length} unique SKUs
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">At cost</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tires</CardTitle>
            <Disc className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tires.reduce((sum, t) => sum + t.quantityOnHand, 0)}</div>
            <p className="text-xs text-muted-foreground">{tires.length} SKUs</p>
          </CardContent>
        </Card>
        <Card className={lowStockItems.length > 0 ? "border-amber-500" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <TrendingDown className={`h-4 w-4 ${lowStockItems.length > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${lowStockItems.length > 0 ? "text-amber-600" : ""}`}>
              {lowStockItems.length}
            </div>
            <p className="text-xs text-muted-foreground">Below minimum quantity</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tires" className="space-y-4 mt-6">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="tires" className="gap-2" data-testid="tab-tires">
              <Disc className="w-4 h-4" /> Tires ({tires.length})
            </TabsTrigger>
            <TabsTrigger value="parts" className="gap-2" data-testid="tab-parts">
              <Package className="w-4 h-4" /> Parts & Supplies ({parts.length})
            </TabsTrigger>
            {lowStockItems.length > 0 && (
              <TabsTrigger value="low-stock" className="gap-2" data-testid="tab-low-stock">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Low Stock ({lowStockItems.length})
              </TabsTrigger>
            )}
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
                  tires.map((item) => renderInventoryRow(item, 'tire'))
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
                  parts.map((item) => renderInventoryRow(item, 'part'))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {lowStockItems.length > 0 && (
          <TabsContent value="low-stock" className="space-y-4">
            <div className="rounded-md border bg-card border-amber-200">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">On Hand</TableHead>
                    <TableHead className="text-right">Min Qty</TableHead>
                    <TableHead className="text-right">Needed</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockItems.map((item) => (
                    <TableRow key={item.id} data-testid={`row-lowstock-${item.id}`}>
                      <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.brand}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.type}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-amber-600 font-medium">
                        {item.quantityOnHand}
                      </TableCell>
                      <TableCell className="text-right">{item.minQuantity}</TableCell>
                      <TableCell className="text-right font-bold text-red-600">
                        {Math.max(0, item.minQuantity - item.quantityOnHand)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleOpenDialog(item)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Item' : 'Add New Item'}</DialogTitle>
            <DialogDescription>
              {editingItem ? 'Update inventory item details.' : 'Add a new item to your inventory.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Item Type</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value) => setFormData({ ...formData, type: value as any })}
                >
                  <SelectTrigger data-testid="select-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INVENTORY_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">SKU / Part Number</Label>
                <Input 
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="e.g., BFG-KO2-285"
                  data-testid="input-sku"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <Input 
                  id="brand"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  placeholder="e.g., BFGoodrich"
                  data-testid="input-brand"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name / Model</Label>
                <Input 
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., All-Terrain T/A KO2"
                  data-testid="input-name"
                />
              </div>
            </div>

            {formData.type === 'TIRE' && (
              <>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="tireSize">Tire Size</Label>
                    <Input 
                      id="tireSize"
                      value={formData.tireSize}
                      onChange={(e) => setFormData({ ...formData, tireSize: e.target.value })}
                      placeholder="e.g., 285/70R17"
                      data-testid="input-tire-size"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="loadIndex">Load Index</Label>
                    <Input 
                      id="loadIndex"
                      value={formData.loadIndex}
                      onChange={(e) => setFormData({ ...formData, loadIndex: e.target.value })}
                      placeholder="e.g., 116"
                      data-testid="input-load-index"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="speedRating">Speed Rating</Label>
                    <Input 
                      id="speedRating"
                      value={formData.speedRating}
                      onChange={(e) => setFormData({ ...formData, speedRating: e.target.value })}
                      placeholder="e.g., S"
                      data-testid="input-speed-rating"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger data-testid="select-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIRE_CATEGORIES.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description..."
                rows={2}
                data-testid="input-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cost">Cost</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                  <Input 
                    id="cost"
                    type="number"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    className="pl-7"
                    placeholder="0.00"
                    data-testid="input-cost"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Selling Price</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                  <Input 
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="pl-7"
                    placeholder="0.00"
                    data-testid="input-price"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantityOnHand">Quantity On Hand</Label>
                <Input 
                  id="quantityOnHand"
                  type="number"
                  value={formData.quantityOnHand}
                  onChange={(e) => setFormData({ ...formData, quantityOnHand: e.target.value })}
                  data-testid="input-quantity"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minQuantity">Min Quantity (Reorder Point)</Label>
                <Input 
                  id="minQuantity"
                  type="number"
                  value={formData.minQuantity}
                  onChange={(e) => setFormData({ ...formData, minQuantity: e.target.value })}
                  data-testid="input-min-quantity"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxQuantity">Max Quantity (Optional)</Label>
                <Input 
                  id="maxQuantity"
                  type="number"
                  value={formData.maxQuantity}
                  onChange={(e) => setFormData({ ...formData, maxQuantity: e.target.value })}
                  placeholder="No limit"
                  data-testid="input-max-quantity"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="binLocation">Bin Location</Label>
                <Input 
                  id="binLocation"
                  value={formData.binLocation}
                  onChange={(e) => setFormData({ ...formData, binLocation: e.target.value })}
                  placeholder="e.g., A-12"
                  data-testid="input-bin-location"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendorPartNumber">Vendor Part #</Label>
                <Input 
                  id="vendorPartNumber"
                  value={formData.vendorPartNumber}
                  onChange={(e) => setFormData({ ...formData, vendorPartNumber: e.target.value })}
                  placeholder="Vendor's part number"
                  data-testid="input-vendor-part"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="upc">UPC / Barcode</Label>
                <Input 
                  id="upc"
                  value={formData.upc}
                  onChange={(e) => setFormData({ ...formData, upc: e.target.value })}
                  placeholder="UPC barcode"
                  data-testid="input-upc"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.sku || !formData.brand || !formData.name || !formData.cost || !formData.price || createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-item"
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {editingItem ? 'Update Item' : 'Add Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Inventory Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingItem?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingItem(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
            <DialogDescription>
              {adjustingItem && (
                <>Adjust stock for <strong>{adjustingItem.name}</strong> (Current: {adjustingItem.quantityOnHand})</>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="adjustmentType">Adjustment Type</Label>
              <Select 
                value={adjustmentType} 
                onValueChange={setAdjustmentType}
              >
                <SelectTrigger data-testid="select-adjustment-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RECEIVE">Receive Stock (+)</SelectItem>
                  <SelectItem value="SALE">Sold / Used (-)</SelectItem>
                  <SelectItem value="RETURN">Return (+)</SelectItem>
                  <SelectItem value="ADJUST">Manual Adjustment (Set to)</SelectItem>
                  <SelectItem value="COUNT">Physical Count (Set to)</SelectItem>
                  <SelectItem value="TRANSFER_IN">Transfer In (+)</SelectItem>
                  <SelectItem value="TRANSFER_OUT">Transfer Out (-)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adjustmentQuantity">
                {adjustmentType === 'COUNT' || adjustmentType === 'ADJUST' 
                  ? 'New Quantity' 
                  : 'Quantity'}
              </Label>
              <Input 
                id="adjustmentQuantity"
                type="number"
                min="0"
                value={adjustmentQuantity}
                onChange={(e) => setAdjustmentQuantity(e.target.value)}
                placeholder={adjustmentType === 'COUNT' || adjustmentType === 'ADJUST' ? 'Enter new quantity' : 'Enter quantity'}
                data-testid="input-adjustment-quantity"
              />
              {adjustingItem && adjustmentQuantity && (adjustmentType === 'RECEIVE' || adjustmentType === 'RETURN' || adjustmentType === 'TRANSFER_IN') && (
                <p className="text-sm text-muted-foreground">
                  New quantity will be: {adjustingItem.quantityOnHand + parseInt(adjustmentQuantity || '0')}
                </p>
              )}
              {adjustingItem && adjustmentQuantity && (adjustmentType === 'SALE' || adjustmentType === 'TRANSFER_OUT') && (
                <p className="text-sm text-muted-foreground">
                  New quantity will be: {Math.max(0, adjustingItem.quantityOnHand - parseInt(adjustmentQuantity || '0'))}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="adjustmentNotes">Notes (Optional)</Label>
              <Textarea 
                id="adjustmentNotes"
                value={adjustmentNotes}
                onChange={(e) => setAdjustmentNotes(e.target.value)}
                placeholder="Reason for adjustment, PO number, etc."
                rows={2}
                data-testid="input-adjustment-notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseAdjustDialog}>
              Cancel
            </Button>
            <Button 
              onClick={handleAdjustSubmit}
              disabled={!adjustmentQuantity || adjustMutation.isPending}
              data-testid="button-adjust-stock"
            >
              {adjustMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Apply Adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

import { useState } from 'react';
import { useShopStore } from '@/lib/store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Check } from 'lucide-react';
import { InventoryItem } from '@/lib/types';

interface TireQuoteBuilderProps {
  vehicleTireSize?: string;
  onAddTires: (selection: { good?: InventoryItem, better?: InventoryItem, best?: InventoryItem }) => void;
}

export function TireQuoteBuilder({ vehicleTireSize, onAddTires }: TireQuoteBuilderProps) {
  const { inventory } = useShopStore();
  const [searchSize, setSearchSize] = useState(vehicleTireSize || '');
  const [selection, setSelection] = useState<{ good?: InventoryItem, better?: InventoryItem, best?: InventoryItem }>({});

  const matchingTires = inventory.filter(i => 
    i.type === 'TIRE' && i.tireSize?.includes(searchSize)
  );

  const handleSelect = (tier: 'good' | 'better' | 'best', item: InventoryItem) => {
    setSelection(prev => ({ ...prev, [tier]: item }));
  };

  const handleCommit = () => {
    onAddTires(selection);
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4 items-end">
        <div className="space-y-2 flex-1">
          <label className="text-sm font-medium">Tire Size</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input 
              value={searchSize} 
              onChange={(e) => setSearchSize(e.target.value)}
              className="pl-9" 
              placeholder="e.g. 235/45R18" 
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['good', 'better', 'best'] as const).map((tier) => (
          <Card key={tier} className={`border-2 ${selection[tier] ? 'border-primary' : 'border-dashed'}`}>
            <CardContent className="p-4 min-h-[200px] flex flex-col">
              <div className="text-center uppercase tracking-wider text-xs font-bold text-muted-foreground mb-4">
                {tier} Option
              </div>
              
              {selection[tier] ? (
                <div className="flex-1 space-y-2">
                  <div className="font-bold text-lg">{selection[tier]?.brand}</div>
                  <div className="text-sm text-muted-foreground">{selection[tier]?.name}</div>
                  <div className="text-xl font-mono mt-2">${selection[tier]?.price.toFixed(2)}</div>
                  <Button variant="ghost" size="sm" onClick={() => handleSelect(tier, null as any)} className="w-full mt-4 text-destructive">
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm italic">
                  Select a tire below
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-2">
        <h4 className="font-medium text-sm">Available Tires ({matchingTires.length})</h4>
        <div className="border rounded-md divide-y max-h-[300px] overflow-y-auto">
          {matchingTires.map(tire => (
            <div key={tire.id} className="p-3 flex items-center justify-between hover:bg-muted/50">
              <div>
                <div className="font-medium">{tire.brand} {tire.name}</div>
                <div className="text-xs text-muted-foreground">
                  {tire.tireSize} • {tire.loadIndex}{tire.speedRating} • {tire.category}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="font-mono font-bold">${tire.price}</div>
                <div className="flex gap-1">
                  <Button 
                    size="sm" 
                    variant={selection.good?.id === tire.id ? "default" : "outline"}
                    onClick={() => handleSelect('good', tire)}
                    className="h-7 text-[10px]"
                  >
                    Good
                  </Button>
                  <Button 
                    size="sm" 
                    variant={selection.better?.id === tire.id ? "default" : "outline"}
                    onClick={() => handleSelect('better', tire)}
                    className="h-7 text-[10px]"
                  >
                    Better
                  </Button>
                  <Button 
                    size="sm" 
                    variant={selection.best?.id === tire.id ? "default" : "outline"}
                    onClick={() => handleSelect('best', tire)}
                    className="h-7 text-[10px]"
                  >
                    Best
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <DialogTrigger asChild>
          <Button onClick={handleCommit} disabled={!selection.good && !selection.better && !selection.best}>
            Add Selected Tires to Quote
          </Button>
        </DialogTrigger>
      </div>
    </div>
  );
}

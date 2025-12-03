import { useState } from 'react';
import { useShopStore } from '@/lib/store';
import { Inspection, InspectionTemplate, InspectionItemResult, InspectionStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, AlertTriangle, XCircle, Camera, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InspectionBuilderProps {
  inspection: Inspection;
  template: InspectionTemplate;
}

export function InspectionBuilder({ inspection, template }: InspectionBuilderProps) {
  const { updateInspectionItem, completeInspection } = useShopStore();
  
  const itemsByCategory = template.items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof template.items>);

  const handleStatusChange = (itemId: string, status: InspectionStatus) => {
    updateInspectionItem(inspection.id, { itemId, status });
  };

  const handleNotesChange = (itemId: string, notes: string) => {
    updateInspectionItem(inspection.id, { itemId, status: getStatus(itemId), notes });
  };

  const getStatus = (itemId: string) => {
    return inspection.items.find(i => i.itemId === itemId)?.status || 'GREEN';
  };

  const getNotes = (itemId: string) => {
    return inspection.items.find(i => i.itemId === itemId)?.notes || '';
  };

  const completedCount = inspection.items.length;
  const totalCount = template.items.length;

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{template.name}</h2>
          <p className="text-muted-foreground">
            {completedCount}/{totalCount} Items Checked
          </p>
        </div>
        <Button 
          onClick={() => completeInspection(inspection.id)} 
          disabled={!!inspection.completedAt}
          variant={inspection.completedAt ? "outline" : "default"}
        >
          {inspection.completedAt ? "Completed" : "Mark Inspection Complete"}
        </Button>
      </div>

      {Object.entries(itemsByCategory).map(([category, items]) => (
        <Card key={category} className="border-l-4 border-l-primary">
          <CardHeader className="bg-muted/20 pb-3">
            <CardTitle className="text-lg">{category}</CardTitle>
          </CardHeader>
          <CardContent className="divide-y p-0">
            {items.map(item => {
              const status = getStatus(item.id);
              return (
                <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1 pt-1">
                    <div className="font-medium">{item.label}</div>
                  </div>
                  
                  <div className="flex flex-col gap-3 w-full sm:w-auto">
                    <div className="flex bg-muted/50 p-1 rounded-lg">
                      <button
                        onClick={() => handleStatusChange(item.id, 'GREEN')}
                        className={cn(
                          "flex-1 px-4 py-2 rounded-md flex items-center justify-center gap-2 transition-all",
                          status === 'GREEN' 
                            ? "bg-green-500 text-white shadow-sm" 
                            : "text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-sm font-medium">Good</span>
                      </button>
                      <button
                        onClick={() => handleStatusChange(item.id, 'YELLOW')}
                        className={cn(
                          "flex-1 px-4 py-2 rounded-md flex items-center justify-center gap-2 transition-all",
                          status === 'YELLOW' 
                            ? "bg-yellow-500 text-white shadow-sm" 
                            : "text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm font-medium">Watch</span>
                      </button>
                      <button
                        onClick={() => handleStatusChange(item.id, 'RED')}
                        className={cn(
                          "flex-1 px-4 py-2 rounded-md flex items-center justify-center gap-2 transition-all",
                          status === 'RED' 
                            ? "bg-red-500 text-white shadow-sm" 
                            : "text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <XCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Fail</span>
                      </button>
                    </div>

                    {(status === 'YELLOW' || status === 'RED') && (
                      <div className="animate-in fade-in slide-in-from-top-2 space-y-2">
                        <Textarea 
                          placeholder="Add technician notes..." 
                          className="min-h-[60px] text-sm"
                          value={getNotes(item.id)}
                          onChange={(e) => handleNotesChange(item.id, e.target.value)}
                        />
                        <Button variant="outline" size="sm" className="w-full gap-2 border-dashed">
                          <Camera className="w-4 h-4" /> Add Photo
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

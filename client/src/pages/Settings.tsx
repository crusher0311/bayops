import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useShopStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  GripVertical, 
  Plus, 
  Trash2, 
  Pencil,
  Check,
  X
} from 'lucide-react';
import { WorkflowStage } from '@/lib/types';

export default function Settings() {
  const { workflowStages, updateWorkflowStages } = useShopStore();
  const [editingStage, setEditingStage] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  
  const [newStageLabel, setNewStageLabel] = useState('');

  const handleAddStage = () => {
    if (!newStageLabel.trim()) return;
    
    const newStage: WorkflowStage = {
      id: newStageLabel.toUpperCase().replace(/ /g, '_'),
      label: newStageLabel,
      color: 'bg-gray-50 border-gray-200',
      type: 'CUSTOM',
      order: workflowStages.length + 1,
      isEnabled: true
    };
    
    updateWorkflowStages([...workflowStages, newStage]);
    setNewStageLabel('');
  };

  const handleRemoveStage = (id: string) => {
    updateWorkflowStages(workflowStages.filter(s => s.id !== id));
  };

  const handleMoveStage = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === workflowStages.length - 1)
    ) return;

    const newStages = [...workflowStages];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap
    [newStages[index], newStages[targetIndex]] = [newStages[targetIndex], newStages[index]];
    
    // Re-index order
    newStages.forEach((s, i) => s.order = i + 1);
    
    updateWorkflowStages(newStages);
  };

  const startEditing = (stage: WorkflowStage) => {
    setEditingStage(stage.id);
    setEditValue(stage.label);
  };

  const saveEdit = () => {
    if (!editingStage) return;
    const newStages = workflowStages.map(s => 
      s.id === editingStage ? { ...s, label: editValue } : s
    );
    updateWorkflowStages(newStages);
    setEditingStage(null);
  };

  return (
    <AppLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure your shop workflow and preferences.
          </p>
        </div>
      </div>

      <div className="grid gap-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Repair Order Workflow</CardTitle>
            <CardDescription>
              Customize the stages of your repair order lifecycle. 
              Drag and drop to reorder, or add custom steps.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Stage Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workflowStages.sort((a, b) => a.order - b.order).map((stage, index) => (
                    <TableRow key={stage.id}>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-4 w-4" 
                            disabled={index === 0}
                            onClick={() => handleMoveStage(index, 'up')}
                          >
                            ▲
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-4 w-4"
                            disabled={index === workflowStages.length - 1}
                            onClick={() => handleMoveStage(index, 'down')}
                          >
                            ▼
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {editingStage === stage.id ? (
                          <div className="flex items-center gap-2">
                            <Input 
                              value={editValue} 
                              onChange={(e) => setEditValue(e.target.value)}
                              className="h-8 w-48"
                            />
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={saveEdit}>
                              <Check className="w-4 h-4 text-green-600" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingStage(null)}>
                              <X className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${stage.color.replace('bg-', 'bg-slate-400 ')}`}></div>
                            {stage.label}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={stage.type === 'SYSTEM' ? 'secondary' : 'outline'}>
                          {stage.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => startEditing(stage)}>
                            <Pencil className="w-4 h-4 text-muted-foreground" />
                          </Button>
                          {stage.type === 'CUSTOM' && (
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveStage(stage.id)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex gap-4 items-end border-t pt-4">
              <div className="grid gap-2 flex-1">
                <label className="text-sm font-medium">Add New Stage</label>
                <Input 
                  placeholder="e.g. Parts Ordered, Quality Check..." 
                  value={newStageLabel}
                  onChange={(e) => setNewStageLabel(e.target.value)}
                />
              </div>
              <Button onClick={handleAddStage} disabled={!newStageLabel}>
                <Plus className="w-4 h-4 mr-2" />
                Add Stage
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

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
  Plus, 
  Trash2, 
  Pencil,
  Check,
  X,
  Copy
} from 'lucide-react';
import { WorkflowStage, WorkflowDefinition } from '@/lib/types';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function Settings() {
  const { workflows, updateWorkflows } = useShopStore();
  const [activeWorkflowId, setActiveWorkflowId] = useState(workflows[0]?.id || '');
  
  const [editingStage, setEditingStage] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newStageLabel, setNewStageLabel] = useState('');
  const [newWorkflowName, setNewWorkflowName] = useState('');

  const activeWorkflow = workflows.find(w => w.id === activeWorkflowId);

  const handleCreateWorkflow = () => {
    if (!newWorkflowName.trim()) return;
    
    const newWorkflow: WorkflowDefinition = {
      id: `wf-${Date.now()}`,
      name: newWorkflowName,
      description: 'Custom workflow',
      isDefault: false,
      stages: [
        { id: 'CHECK_IN', label: 'Check In', color: 'bg-gray-100 border-gray-200', type: 'CUSTOM', order: 1 },
        { id: 'COMPLETED', label: 'Completed', color: 'bg-green-50 border-green-200', type: 'SYSTEM', order: 2 },
      ]
    };
    
    updateWorkflows([...workflows, newWorkflow]);
    setNewWorkflowName('');
    setActiveWorkflowId(newWorkflow.id);
  };

  const handleAddStage = () => {
    if (!newStageLabel.trim() || !activeWorkflow) return;
    
    const newStage: WorkflowStage = {
      id: newStageLabel.toUpperCase().replace(/ /g, '_'),
      label: newStageLabel,
      color: 'bg-gray-50 border-gray-200',
      type: 'CUSTOM',
      order: activeWorkflow.stages.length + 1
    };
    
    const updatedWorkflows = workflows.map(w => 
      w.id === activeWorkflowId 
        ? { ...w, stages: [...w.stages, newStage] }
        : w
    );
    
    updateWorkflows(updatedWorkflows);
    setNewStageLabel('');
  };

  const handleRemoveStage = (stageId: string) => {
    if (!activeWorkflow) return;
    
    const updatedWorkflows = workflows.map(w => 
      w.id === activeWorkflowId 
        ? { ...w, stages: w.stages.filter(s => s.id !== stageId) }
        : w
    );
    
    updateWorkflows(updatedWorkflows);
  };

  const handleMoveStage = (index: number, direction: 'up' | 'down') => {
    if (!activeWorkflow) return;
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === activeWorkflow.stages.length - 1)
    ) return;

    const newStages = [...activeWorkflow.stages];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap
    [newStages[index], newStages[targetIndex]] = [newStages[targetIndex], newStages[index]];
    
    // Re-index order
    newStages.forEach((s, i) => s.order = i + 1);
    
    const updatedWorkflows = workflows.map(w => 
      w.id === activeWorkflowId 
        ? { ...w, stages: newStages }
        : w
    );
    
    updateWorkflows(updatedWorkflows);
  };

  const startEditing = (stage: WorkflowStage) => {
    setEditingStage(stage.id);
    setEditValue(stage.label);
  };

  const saveEdit = () => {
    if (!editingStage || !activeWorkflow) return;
    
    const newStages = activeWorkflow.stages.map(s => 
      s.id === editingStage ? { ...s, label: editValue } : s
    );
    
    const updatedWorkflows = workflows.map(w => 
      w.id === activeWorkflowId 
        ? { ...w, stages: newStages }
        : w
    );
    
    updateWorkflows(updatedWorkflows);
    setEditingStage(null);
  };

  return (
    <AppLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure workflows and shop preferences.
          </p>
        </div>
      </div>

      <div className="grid gap-6 max-w-5xl">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle>Workflow Editor</CardTitle>
              <CardDescription>
                Manage different workflows for different job types (e.g., Standard Repair, Quick Lube).
              </CardDescription>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Plus className="w-4 h-4" /> New Workflow
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Workflow</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Workflow Name</label>
                    <Input 
                      placeholder="e.g. Drop Off Service" 
                      value={newWorkflowName}
                      onChange={(e) => setNewWorkflowName(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleCreateWorkflow} disabled={!newWorkflowName} className="w-full">
                    Create Workflow
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Tabs value={activeWorkflowId} onValueChange={setActiveWorkflowId} className="space-y-6">
              <TabsList>
                {workflows.map(wf => (
                  <TabsTrigger key={wf.id} value={wf.id}>
                    {wf.name}
                    {wf.isDefault && <span className="ml-2 text-[10px] opacity-50">(Default)</span>}
                  </TabsTrigger>
                ))}
              </TabsList>

              {activeWorkflow && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                  <div className="flex justify-between items-center bg-muted/30 p-4 rounded-lg">
                     <div>
                       <h3 className="font-semibold">{activeWorkflow.name}</h3>
                       <p className="text-sm text-muted-foreground">{activeWorkflow.description}</p>
                     </div>
                     <Badge variant="outline">{activeWorkflow.stages.length} Stages</Badge>
                  </div>

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
                        {/* SAFEGUARD: avoid mutating state directly and handle possible undefined */}
                        {[...activeWorkflow.stages].sort((a, b) => a.order - b.order).map((stage, index) => (
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
                                  disabled={index === activeWorkflow.stages.length - 1}
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
                      <label className="text-sm font-medium">Add New Stage to {activeWorkflow.name}</label>
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
                </div>
              )}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

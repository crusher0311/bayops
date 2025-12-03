import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useWorkflows } from '@/lib/hooks';
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
  Loader2
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface WorkflowStage {
  id: string;
  label: string;
  color: string;
  type: 'SYSTEM' | 'CUSTOM';
  order: number;
}

export default function Settings() {
  const { data: workflows = [], isLoading } = useWorkflows();
  const [activeWorkflowId, setActiveWorkflowId] = useState('');
  
  const [editingStage, setEditingStage] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newStageLabel, setNewStageLabel] = useState('');
  const [newWorkflowName, setNewWorkflowName] = useState('');

  useEffect(() => {
    if (workflows.length > 0 && !activeWorkflowId) {
      setActiveWorkflowId(workflows[0].id);
    }
  }, [workflows, activeWorkflowId]);

  const activeWorkflow = workflows.find(w => w.id === activeWorkflowId);
  const stages = (activeWorkflow?.stages || []) as WorkflowStage[];

  const startEditing = (stage: WorkflowStage) => {
    setEditingStage(stage.id);
    setEditValue(stage.label);
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
                <Button variant="outline" className="gap-2" data-testid="button-new-workflow">
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
                      data-testid="input-workflow-name"
                    />
                  </div>
                  <Button disabled={!newWorkflowName} className="w-full" data-testid="button-create-workflow">
                    Create Workflow
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {workflows.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No workflows configured. Create your first workflow!
              </div>
            ) : (
              <Tabs value={activeWorkflowId} onValueChange={setActiveWorkflowId} className="space-y-6">
                <TabsList>
                  {workflows.map(wf => (
                    <TabsTrigger key={wf.id} value={wf.id} data-testid={`tab-workflow-${wf.id}`}>
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
                       <Badge variant="outline">{stages.length} Stages</Badge>
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
                          {[...stages].sort((a, b) => a.order - b.order).map((stage, index) => (
                            <TableRow key={stage.id} data-testid={`row-stage-${stage.id}`}>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-4 w-4" 
                                    disabled={index === 0}
                                  >
                                    ▲
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-4 w-4"
                                    disabled={index === stages.length - 1}
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
                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingStage(null)}>
                                      <Check className="w-4 h-4 text-green-600" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingStage(null)}>
                                      <X className="w-4 h-4 text-red-600" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="w-3 h-3 rounded-full" 
                                      style={{ backgroundColor: stage.color || '#94a3b8' }}
                                    />
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
                                    <Button variant="ghost" size="icon">
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
                          data-testid="input-stage-name"
                        />
                      </div>
                      <Button disabled={!newStageLabel} data-testid="button-add-stage">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Stage
                      </Button>
                    </div>
                  </div>
                )}
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useRepairOrders, useCustomers, useWorkflows, useUsers, useUpdateRepairOrder } from '@/lib/hooks';
import { useShopStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MoreHorizontal, 
  Clock, 
  ArrowRight, 
  ArrowLeft,
  Settings2,
  Plus,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { Link, useLocation } from 'wouter';
import type { RepairOrder, Customer, Workflow } from '@shared/schema';

export default function JobBoard() {
  const { currentLocationId } = useShopStore();
  const { data: ros = [], isLoading: rosLoading } = useRepairOrders(currentLocationId || undefined);
  const { data: customers = [] } = useCustomers();
  const { data: workflows = [], isLoading: workflowsLoading } = useWorkflows();
  const { data: users = [] } = useUsers();
  const updateRO = useUpdateRepairOrder();
  
  const [activeWorkflowId, setActiveWorkflowId] = useState('');
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (workflows.length > 0 && !activeWorkflowId) {
      setActiveWorkflowId(workflows[0].id);
    }
  }, [workflows, activeWorkflowId]);

  const activeWorkflow = workflows.find(w => w.id === activeWorkflowId) || workflows[0];

  const getCustomer = (id: string) => customers.find(c => c.id === id);
  const getTech = (id?: string | null) => users.find((u: any) => u.id === id);

  const moveRO = (e: React.MouseEvent, ro: RepairOrder, direction: 'next' | 'prev') => {
    e.stopPropagation();
    if (!activeWorkflow) return;
    
    const stages = activeWorkflow.stages as Array<{ id: string; order: number }>;
    const sortedStages = [...stages].sort((a, b) => a.order - b.order);
    const currentIndex = sortedStages.findIndex(s => s.id === ro.status);
    if (currentIndex === -1) return;

    const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    
    if (nextIndex >= 0 && nextIndex < sortedStages.length) {
      updateRO.mutate({
        id: ro.id,
        updates: { status: sortedStages[nextIndex].id },
      });
    }
  };

  if (rosLoading || workflowsLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!activeWorkflow) {
    return (
      <AppLayout>
        <div className="text-center py-12 text-muted-foreground">
          No workflows configured. Please add a workflow in Settings.
        </div>
      </AppLayout>
    );
  }

  const stages = activeWorkflow.stages as Array<{ id: string; label: string; color: string; order: number }>;
  const activeStages = [...stages].sort((a, b) => a.order - b.order);

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Job Board</h1>
          <p className="text-muted-foreground mt-1">
            Manage repair orders across workflows.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/settings">
            <Button variant="outline" className="gap-2" data-testid="button-edit-workflow">
              <Settings2 className="w-4 h-4" />
              Edit Workflow
            </Button>
          </Link>
          <Link href="/ros/new">
            <Button className="gap-2" data-testid="button-new-ro">
              <Plus className="w-4 h-4" />
              New RO
            </Button>
          </Link>
        </div>
      </div>

      <Tabs value={activeWorkflowId} onValueChange={setActiveWorkflowId} className="mb-6">
        <TabsList>
          {workflows.map(wf => (
            <TabsTrigger key={wf.id} value={wf.id} data-testid={`tab-workflow-${wf.id}`}>
              {wf.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex h-[calc(100vh-14rem)] overflow-x-auto gap-4 pb-4">
        {activeStages.map((col, idx) => {
          const colROs = ros.filter(r => r.status === col.id && r.workflowId === activeWorkflowId);
          
          return (
            <div key={col.id} className="flex-shrink-0 w-80 flex flex-col" data-testid={`column-${col.id}`}>
              <div className="p-3 rounded-t-lg border-t border-x flex items-center justify-between" style={{ backgroundColor: col.color + '20', borderColor: col.color }}>
                <h3 className="font-semibold text-sm">{col.label}</h3>
                <Badge variant="secondary" className="bg-white/50">{colROs.length}</Badge>
              </div>
              <div className="flex-1 bg-muted/20 border-x border-b rounded-b-lg p-2 space-y-3 overflow-y-auto min-h-[200px]">
                {colROs.map(ro => {
                  const customer = getCustomer(ro.customerId);
                  const tech = getTech(ro.technicianId);
                  const jobs = ro.jobs as Array<{ name: string }>;

                  return (
                    <Card 
                      key={ro.id} 
                      className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-primary"
                      onClick={() => setLocation(`/ros/${ro.id}`)}
                      data-testid={`card-ro-${ro.id}`}
                    >
                      <CardContent className="p-3 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xs font-mono text-muted-foreground">#{ro.roNumber}</span>
                            <h4 className="font-semibold text-sm truncate w-40">
                              {customer?.firstName} {customer?.lastName}
                            </h4>
                            <p className="text-xs text-muted-foreground truncate w-40">
                              {jobs[0]?.name || 'Service'}
                            </p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{ro.promisedAt ? format(new Date(ro.promisedAt), 'MMM d') : 'No date'}</span>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t mt-2">
                          <div className="flex items-center gap-2">
                            {tech ? (
                              <Avatar className="w-6 h-6">
                                <AvatarImage src={(tech as any).avatarUrl} />
                                <AvatarFallback>{(tech as any).name?.[0] || 'T'}</AvatarFallback>
                              </Avatar>
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-muted border border-dashed flex items-center justify-center">
                                <span className="text-[10px] text-muted-foreground">?</span>
                              </div>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {(tech as any)?.name?.split(' ')[0] || 'Unassigned'}
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between pt-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 px-2 text-xs"
                            onClick={(e) => moveRO(e, ro, 'prev')}
                            disabled={idx === 0 || updateRO.isPending}
                            data-testid={`button-prev-${ro.id}`}
                          >
                            <ArrowLeft className="w-3 h-3 mr-1" /> Prev
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 px-2 text-xs"
                            onClick={(e) => moveRO(e, ro, 'next')}
                            disabled={idx === activeStages.length - 1 || updateRO.isPending}
                            data-testid={`button-next-${ro.id}`}
                          >
                            Next <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {colROs.length === 0 && (
                  <div className="h-24 flex items-center justify-center text-muted-foreground/40 text-xs italic border-2 border-dashed rounded-lg m-2">
                    No orders
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </AppLayout>
  );
}

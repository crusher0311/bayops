import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
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
  Plus
} from 'lucide-react';
import { ROStatus } from '@/lib/types';
import { format } from 'date-fns';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';

export default function JobBoard() {
  const { ros, users, customers, vehicles, updateROStatus, workflows } = useShopStore();
  const [activeWorkflowId, setActiveWorkflowId] = useState(workflows[0]?.id || '');
  const [, setLocation] = useLocation();

  const activeWorkflow = workflows.find(w => w.id === activeWorkflowId) || workflows[0];
  
  if (!activeWorkflow) return null;

  // Create a copy to sort to avoid mutating state
  const activeStages = [...activeWorkflow.stages].sort((a, b) => a.order - b.order);

  const getCustomer = (id: string) => customers.find(c => c.id === id);
  const getVehicle = (id: string) => vehicles.find(v => v.id === id);
  const getTech = (id?: string) => users.find(u => u.id === id);

  const moveRO = (e: React.MouseEvent, roId: string, currentStatus: ROStatus, direction: 'next' | 'prev') => {
    e.stopPropagation(); // Prevent card click
    const currentIndex = activeStages.findIndex(s => s.id === currentStatus);
    if (currentIndex === -1) return;

    const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    
    if (nextIndex >= 0 && nextIndex < activeStages.length) {
      updateROStatus(roId, activeStages[nextIndex].id);
    }
  };

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
            <Button variant="outline" className="gap-2">
              <Settings2 className="w-4 h-4" />
              Edit Workflow
            </Button>
          </Link>
          <Link href="/ros/new">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New RO
            </Button>
          </Link>
        </div>
      </div>

      <Tabs value={activeWorkflowId} onValueChange={setActiveWorkflowId} className="mb-6">
        <TabsList>
          {workflows.map(wf => (
            <TabsTrigger key={wf.id} value={wf.id}>
              {wf.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex h-[calc(100vh-14rem)] overflow-x-auto gap-4 pb-4">
        {activeStages.map((col, idx) => {
          const colROs = ros.filter(r => r.status === col.id && r.workflowId === activeWorkflowId);
          
          return (
            <div key={col.id} className="flex-shrink-0 w-80 flex flex-col">
              <div className={`p-3 rounded-t-lg border-t border-x ${col.color} flex items-center justify-between`}>
                <h3 className="font-semibold text-sm">{col.label}</h3>
                <Badge variant="secondary" className="bg-white/50">{colROs.length}</Badge>
              </div>
              <div className={`flex-1 bg-muted/20 border-x border-b rounded-b-lg p-2 space-y-3 overflow-y-auto min-h-[200px]`}>
                {colROs.map(ro => {
                  const customer = getCustomer(ro.customerId);
                  const vehicle = getVehicle(ro.vehicleId);
                  const tech = getTech(ro.technicianId);

                  return (
                    <Card 
                      key={ro.id} 
                      className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-primary"
                      onClick={() => setLocation(`/ros/${ro.id}`)}
                    >
                      <CardContent className="p-3 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xs font-mono text-muted-foreground">#{ro.roNumber}</span>
                            <h4 className="font-semibold text-sm truncate w-40">{customer?.firstName} {customer?.lastName}</h4>
                            <p className="text-xs text-muted-foreground truncate w-40">
                              {vehicle?.year} {vehicle?.make} {vehicle?.model}
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
                                <AvatarImage src={tech.avatarUrl} />
                                <AvatarFallback>{tech.name[0]}</AvatarFallback>
                              </Avatar>
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-muted border border-dashed flex items-center justify-center">
                                <span className="text-[10px] text-muted-foreground">?</span>
                              </div>
                            )}
                            <span className="text-xs text-muted-foreground">{tech?.name.split(' ')[0] || 'Unassigned'}</span>
                          </div>
                        </div>

                        {/* Quick Actions for MVP Movement */}
                        <div className="flex justify-between pt-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 px-2 text-xs"
                            onClick={(e) => moveRO(e, ro.id, ro.status, 'prev')}
                            disabled={idx === 0}
                          >
                            <ArrowLeft className="w-3 h-3 mr-1" /> Prev
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 px-2 text-xs"
                            onClick={(e) => moveRO(e, ro.id, ro.status, 'next')}
                            disabled={idx === activeStages.length - 1}
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

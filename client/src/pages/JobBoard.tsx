import { AppLayout } from '@/components/layout/AppLayout';
import { useShopStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  MoreHorizontal, 
  Clock, 
  Calendar, 
  ArrowRight, 
  ArrowLeft 
} from 'lucide-react';
import { ROStatus, RepairOrder } from '@/lib/types';
import { format } from 'date-fns';

const COLUMNS: { id: ROStatus; label: string; color: string }[] = [
  { id: 'ESTIMATE', label: 'Estimates', color: 'bg-gray-100 border-gray-200' },
  { id: 'AWAITING_APPROVAL', label: 'Approval Needed', color: 'bg-orange-50 border-orange-200' },
  { id: 'WORK_IN_PROGRESS', label: 'In Progress', color: 'bg-blue-50 border-blue-200' },
  { id: 'COMPLETED', label: 'Completed', color: 'bg-green-50 border-green-200' },
  { id: 'INVOICED', label: 'Ready for Pickup', color: 'bg-purple-50 border-purple-200' },
];

export default function JobBoard() {
  const { ros, users, customers, vehicles, updateROStatus } = useShopStore();

  const getCustomer = (id: string) => customers.find(c => c.id === id);
  const getVehicle = (id: string) => vehicles.find(v => v.id === id);
  const getTech = (id?: string) => users.find(u => u.id === id);

  const moveRO = (roId: string, currentStatus: ROStatus, direction: 'next' | 'prev') => {
    const statusOrder: ROStatus[] = ['ESTIMATE', 'AWAITING_APPROVAL', 'WORK_IN_PROGRESS', 'COMPLETED', 'INVOICED', 'PAID'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    
    if (nextIndex >= 0 && nextIndex < statusOrder.length) {
      updateROStatus(roId, statusOrder[nextIndex]);
    }
  };

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Job Board</h1>
          <p className="text-muted-foreground mt-1">
            Drag and drop repair orders to update status
          </p>
        </div>
      </div>

      <div className="flex h-[calc(100vh-12rem)] overflow-x-auto gap-4 pb-4">
        {COLUMNS.map(col => {
          const colROs = ros.filter(r => r.status === col.id);
          
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
                    <Card key={ro.id} className="cursor-move hover:shadow-md transition-shadow border-l-4 border-l-primary">
                      <CardContent className="p-3 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xs font-mono text-muted-foreground">#{ro.roNumber}</span>
                            <h4 className="font-semibold text-sm truncate w-40">{customer?.firstName} {customer?.lastName}</h4>
                            <p className="text-xs text-muted-foreground truncate w-40">
                              {vehicle?.year} {vehicle?.make} {vehicle?.model}
                            </p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
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
                            onClick={() => moveRO(ro.id, ro.status, 'prev')}
                            disabled={col.id === 'ESTIMATE'}
                          >
                            <ArrowLeft className="w-3 h-3 mr-1" /> Prev
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 px-2 text-xs"
                            onClick={() => moveRO(ro.id, ro.status, 'next')}
                            disabled={col.id === 'INVOICED'}
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

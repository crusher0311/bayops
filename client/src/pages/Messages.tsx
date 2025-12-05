import { AppLayout } from '@/components/layout/AppLayout';
import { useShopStore } from '@/lib/store';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { 
  MessageSquare, 
  Phone, 
  Mail, 
  Send, 
  Search, 
  Plus, 
  User, 
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Archive,
  ArrowLeft
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/lib/queryClient';
import type { Conversation, Message, Customer } from '@shared/schema';

type ConversationWithCustomer = Conversation & { 
  customer: Customer | null;
  messages?: Message[];
};

export default function Messages() {
  const { currentLocationId } = useShopStore();
  const queryClient = useQueryClient();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageText, setMessageText] = useState('');
  const [sendChannel, setSendChannel] = useState<'SMS' | 'EMAIL'>('SMS');
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<ConversationWithCustomer[]>({
    queryKey: ['/api/conversations', currentLocationId],
    queryFn: () => apiRequest(`/api/conversations?locationId=${currentLocationId}`),
    enabled: !!currentLocationId,
    refetchInterval: 10000,
  });

  const { data: selectedConversation, isLoading: conversationLoading } = useQuery<ConversationWithCustomer>({
    queryKey: ['/api/conversations', selectedConversationId],
    queryFn: () => apiRequest(`/api/conversations/${selectedConversationId}`),
    enabled: !!selectedConversationId,
    refetchInterval: 5000,
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['/api/customers', currentLocationId],
    queryFn: () => apiRequest(`/api/customers?locationId=${currentLocationId}`),
    enabled: !!currentLocationId && newConversationOpen,
  });

  const createConversationMutation = useMutation({
    mutationFn: (data: { customerId: string; locationId: string; phoneNumber?: string; email?: string }) =>
      apiRequest('/api/conversations', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (newConv: ConversationWithCustomer) => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      setSelectedConversationId(newConv.id);
      setNewConversationOpen(false);
      setSelectedCustomerId('');
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: (data: { content: string; channel: 'SMS' | 'EMAIL' }) =>
      apiRequest(`/api/conversations/${selectedConversationId}/messages`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', selectedConversationId] });
      setMessageText('');
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (conversationId: string) =>
      apiRequest(`/api/conversations/${conversationId}/read`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (conversationId: string) =>
      apiRequest(`/api/conversations/${conversationId}/archive`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      setSelectedConversationId(null);
    },
  });

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedConversation?.messages]);

  useEffect(() => {
    if (selectedConversationId && selectedConversation?.unreadCount && selectedConversation.unreadCount > 0) {
      markReadMutation.mutate(selectedConversationId);
    }
  }, [selectedConversationId, selectedConversation?.unreadCount]);

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return !conv.isArchived;
    const customer = conv.customer;
    const searchLower = searchQuery.toLowerCase();
    return (
      !conv.isArchived &&
      (customer?.firstName?.toLowerCase().includes(searchLower) ||
       customer?.lastName?.toLowerCase().includes(searchLower) ||
       conv.phoneNumber?.includes(searchQuery) ||
       conv.email?.toLowerCase().includes(searchLower))
    );
  });

  const filteredCustomers = customers.filter(c => {
    if (!customerSearch) return true;
    const searchLower = customerSearch.toLowerCase();
    return (
      c.firstName?.toLowerCase().includes(searchLower) ||
      c.lastName?.toLowerCase().includes(searchLower) ||
      c.phone?.includes(customerSearch) ||
      c.email?.toLowerCase().includes(searchLower)
    );
  });

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedConversationId) return;
    sendMessageMutation.mutate({ content: messageText.trim(), channel: sendChannel });
  };

  const handleCreateConversation = (customer: Customer) => {
    if (!currentLocationId) return;
    createConversationMutation.mutate({
      customerId: customer.id,
      locationId: currentLocationId,
      phoneNumber: customer.phone || undefined,
      email: customer.email || undefined,
    });
  };

  const getCustomerDisplayName = (customer: Customer | null) => {
    if (!customer) return 'Unknown Customer';
    return `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Unknown';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SENT':
      case 'DELIVERED':
        return <CheckCircle2 className="h-3 w-3 text-green-500" />;
      case 'FAILED':
        return <XCircle className="h-3 w-3 text-red-500" />;
      case 'PENDING':
        return <Loader2 className="h-3 w-3 text-gray-400 animate-spin" />;
      default:
        return null;
    }
  };

  if (!currentLocationId) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <p className="text-slate-500">Please select a location first</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-bold">Messages</h1>
          </div>
          <Dialog open={newConversationOpen} onOpenChange={setNewConversationOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-conversation">
                <Plus className="h-4 w-4 mr-2" />
                New Conversation
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Start New Conversation</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Search Customers</Label>
                  <Input
                    placeholder="Search by name, phone, or email..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    data-testid="input-customer-search"
                  />
                </div>
                <ScrollArea className="h-[300px] border rounded-md">
                  <div className="p-2 space-y-1">
                    {filteredCustomers.slice(0, 20).map(customer => (
                      <button
                        key={customer.id}
                        className="w-full p-3 text-left rounded-md hover:bg-slate-100 transition-colors flex items-center gap-3"
                        onClick={() => handleCreateConversation(customer)}
                        data-testid={`button-select-customer-${customer.id}`}
                      >
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-medium">
                          {customer.firstName?.[0] || customer.lastName?.[0] || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{getCustomerDisplayName(customer)}</p>
                          <div className="flex items-center gap-3 text-sm text-slate-500">
                            {customer.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {customer.phone}
                              </span>
                            )}
                            {customer.email && (
                              <span className="flex items-center gap-1 truncate">
                                <Mail className="h-3 w-3" /> {customer.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                    {filteredCustomers.length === 0 && (
                      <p className="text-center text-slate-500 py-8">No customers found</p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-80 border-r flex flex-col bg-slate-50">
            <div className="p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search conversations..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search-conversations"
                />
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {conversationsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No conversations yet</p>
                    <p className="text-sm">Start by messaging a customer</p>
                  </div>
                ) : (
                  filteredConversations.map(conv => (
                    <button
                      key={conv.id}
                      className={cn(
                        "w-full p-3 rounded-lg text-left transition-colors",
                        selectedConversationId === conv.id 
                          ? "bg-blue-100 border border-blue-200" 
                          : "hover:bg-white border border-transparent"
                      )}
                      onClick={() => setSelectedConversationId(conv.id)}
                      data-testid={`button-conversation-${conv.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium flex-shrink-0">
                          {conv.customer?.firstName?.[0] || conv.customer?.lastName?.[0] || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium truncate">{getCustomerDisplayName(conv.customer)}</p>
                            {(conv.unreadCount || 0) > 0 && (
                              <Badge variant="destructive" className="h-5 min-w-[20px] flex items-center justify-center">
                                {conv.unreadCount}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-500 truncate mt-0.5">
                            {conv.lastMessagePreview || 'No messages yet'}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {conv.lastMessageAt 
                              ? formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })
                              : format(new Date(conv.createdAt), 'MMM d')
                            }
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="flex-1 flex flex-col bg-white">
            {!selectedConversationId ? (
              <div className="flex-1 flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-medium">Select a conversation</p>
                  <p className="text-sm">or start a new one to begin messaging</p>
                </div>
              </div>
            ) : conversationLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : selectedConversation ? (
              <>
                <div className="p-4 border-b flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="md:hidden"
                      onClick={() => setSelectedConversationId(null)}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                      {selectedConversation.customer?.firstName?.[0] || selectedConversation.customer?.lastName?.[0] || '?'}
                    </div>
                    <div>
                      <p className="font-semibold">{getCustomerDisplayName(selectedConversation.customer)}</p>
                      <div className="flex items-center gap-3 text-sm text-slate-500">
                        {selectedConversation.phoneNumber && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {selectedConversation.phoneNumber}
                          </span>
                        )}
                        {selectedConversation.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {selectedConversation.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => archiveMutation.mutate(selectedConversationId)}
                    title="Archive conversation"
                    data-testid="button-archive-conversation"
                  >
                    <Archive className="h-4 w-4" />
                  </Button>
                </div>

                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {(!selectedConversation.messages || selectedConversation.messages.length === 0) ? (
                      <div className="text-center py-12 text-slate-500">
                        <p>No messages yet</p>
                        <p className="text-sm">Send a message to start the conversation</p>
                      </div>
                    ) : (
                      selectedConversation.messages.map(msg => (
                        <div
                          key={msg.id}
                          className={cn(
                            "flex",
                            msg.direction === 'OUTBOUND' ? "justify-end" : "justify-start"
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[70%] rounded-lg px-4 py-2",
                              msg.direction === 'OUTBOUND'
                                ? "bg-blue-600 text-white"
                                : "bg-slate-100 text-slate-900"
                            )}
                          >
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                            <div className={cn(
                              "flex items-center gap-1 mt-1 text-xs",
                              msg.direction === 'OUTBOUND' ? "text-blue-200" : "text-slate-400"
                            )}>
                              <span className="flex items-center gap-1">
                                {msg.channel === 'SMS' ? <Phone className="h-3 w-3" /> : <Mail className="h-3 w-3" />}
                              </span>
                              <span>{format(new Date(msg.createdAt), 'h:mm a')}</span>
                              {msg.direction === 'OUTBOUND' && getStatusIcon(msg.status)}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <div className="p-4 border-t bg-slate-50">
                  <div className="flex items-center gap-2 mb-2">
                    <Tabs value={sendChannel} onValueChange={(v) => setSendChannel(v as 'SMS' | 'EMAIL')}>
                      <TabsList className="h-8">
                        <TabsTrigger value="SMS" className="h-6 px-3 text-xs" disabled={!selectedConversation.phoneNumber}>
                          <Phone className="h-3 w-3 mr-1" /> SMS
                        </TabsTrigger>
                        <TabsTrigger value="EMAIL" className="h-6 px-3 text-xs" disabled={!selectedConversation.email}>
                          <Mail className="h-3 w-3 mr-1" /> Email
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                  <div className="flex gap-2">
                    <Textarea
                      placeholder={`Type your ${sendChannel === 'SMS' ? 'text message' : 'email'}...`}
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      className="min-h-[60px] resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      data-testid="input-message"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!messageText.trim() || sendMessageMutation.isPending}
                      className="self-end"
                      data-testid="button-send-message"
                    >
                      {sendMessageMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {sendChannel === 'SMS' && (
                    <p className="text-xs text-slate-400 mt-1">Press Enter to send, Shift+Enter for new line</p>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

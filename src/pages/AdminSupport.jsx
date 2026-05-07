import React, { useState, useEffect } from "react";
import { SupportTicket } from "@/entities/SupportTicket";
import { TicketMessage } from "@/entities/TicketMessage";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Send, User as UserIcon, Shield } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

export default function AdminSupport() {
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: "open", priority: "all" });

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [allTickets, allUsers, me] = await Promise.all([
        SupportTicket.list("-updated_date"),
        User.list(),
        User.me()
      ]);
      setTickets(allTickets);
      setUsers(allUsers);
      setCurrentUser(me);
    } catch (error) {
      console.error("Error loading support data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTicket) {
      loadMessages(selectedTicket.id);
    } else {
      setMessages([]);
    }
  }, [selectedTicket]);

  const loadMessages = async (ticketId) => {
    const ticketMessages = await TicketMessage.filter({ ticket_id: ticketId }, "created_date");
    setMessages(ticketMessages);
  };
  
  const handleUpdateTicket = async (ticketId, field, value) => {
    try {
      await SupportTicket.update(ticketId, { [field]: value });
      const updatedTickets = tickets.map(t => t.id === ticketId ? {...t, [field]: value} : t);
      setTickets(updatedTickets);
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => ({...prev, [field]: value}));
      }
    } catch (error) {
      console.error(`Error updating ticket ${field}:`, error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;
    try {
      await TicketMessage.create({
        ticket_id: selectedTicket.id,
        sender_email: currentUser.email,
        message: newMessage,
      });
      setNewMessage("");
      loadMessages(selectedTicket.id);
      // Also update ticket's updated_date to bring it to top
      await SupportTicket.update(selectedTicket.id, {});
      loadInitialData();
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const getUserName = (email) => users.find(u => u.email === email)?.full_name || email;
  
  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-900 text-red-400 border-red-700';
      case 'high': return 'bg-orange-900 text-orange-400 border-orange-700';
      case 'medium': return 'bg-[#b38922]/25 text-[#fedea0] border-[#8a6a1a]/45';
      default: return 'bg-zinc-800 text-zinc-300 border-zinc-600';
    }
  };
  
  const getStatusBadge = (status) => {
    switch (status) {
      case 'open': return 'bg-blue-900 text-blue-400 border-blue-700';
      case 'in_progress': return 'bg-purple-900 text-purple-400 border-purple-700';
      case 'resolved': return 'bg-green-900 text-green-400 border-green-700';
      default: return 'bg-zinc-900 text-[#ccab6c]/90 border-[#ccab6c]/20';
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const statusMatch = filters.status === 'all' || ticket.status === filters.status;
    const priorityMatch = filters.priority === 'all' || ticket.priority === filters.priority;
    return statusMatch && priorityMatch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading support queue...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white">Support Queue</h1>
          <p className="text-[#ccab6c]/90">Manage all investor support tickets</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
          {/* Ticket List */}
          <Card className="lg:col-span-1 bg-zinc-950 border border-[#ccab6c]/30 flex flex-col">
            <CardHeader>
              <CardTitle className="text-white">Ticket Queue</CardTitle>
              <div className="flex gap-2 mt-4">
                <Select value={filters.status} onValueChange={(val) => setFilters(f => ({...f, status: val}))}>
                  <SelectTrigger className="bg-zinc-900 border-[#ccab6c]/20"><SelectValue/></SelectTrigger>
                  <SelectContent className="bg-zinc-900 text-white"><SelectItem value="all">All Statuses</SelectItem><SelectItem value="open">Open</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="resolved">Resolved</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent>
                </Select>
                <Select value={filters.priority} onValueChange={(val) => setFilters(f => ({...f, priority: val}))}>
                  <SelectTrigger className="bg-zinc-900 border-[#ccab6c]/20"><SelectValue/></SelectTrigger>
                  <SelectContent className="bg-zinc-900 text-white"><SelectItem value="all">All Priorities</SelectItem><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="overflow-y-auto flex-1">
              <div className="space-y-3">
                {filteredTickets.map(ticket => (
                  <div key={ticket.id} onClick={() => setSelectedTicket(ticket)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedTicket?.id === ticket.id ? 'bg-zinc-900' : 'hover:bg-zinc-900/50'}`}>
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-medium text-white truncate pr-2">{ticket.subject}</p>
                      <Badge variant="outline" className={`capitalize text-xs ${getPriorityBadge(ticket.priority)}`}>{ticket.priority}</Badge>
                    </div>
                    <p className="text-sm text-[#ccab6c]/90 truncate">{getUserName(ticket.investor_email)}</p>
                    <div className="flex justify-between items-center mt-2">
                       <Badge variant="outline" className={`capitalize text-xs ${getStatusBadge(ticket.status)}`}>{ticket.status.replace('_', ' ')}</Badge>
                       <p className="text-xs text-zinc-500">{formatDistanceToNow(new Date(ticket.updated_date), { addSuffix: true })}</p>
                    </div>
                  </div>
                ))}
                {filteredTickets.length === 0 && <p className="text-center text-zinc-500 py-8">No tickets match filters.</p>}
              </div>
            </CardContent>
          </Card>

          {/* Ticket Details */}
          <Card className="lg:col-span-2 bg-zinc-950 border border-[#ccab6c]/30 flex flex-col">
            {selectedTicket ? (
              <>
                <CardHeader className="border-b border-[#ccab6c]/25">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-white">{selectedTicket.subject}</CardTitle>
                    <div className="flex gap-2">
                      <Select value={selectedTicket.status} onValueChange={(val) => handleUpdateTicket(selectedTicket.id, 'status', val)}>
                         <SelectTrigger className="w-[140px] bg-zinc-900 border-[#ccab6c]/20"><SelectValue/></SelectTrigger>
                         <SelectContent className="bg-zinc-900 text-white"><SelectItem value="open">Open</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="resolved">Resolved</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent>
                      </Select>
                       <Select value={selectedTicket.priority} onValueChange={(val) => handleUpdateTicket(selectedTicket.id, 'priority', val)}>
                         <SelectTrigger className="w-[120px] bg-zinc-900 border-[#ccab6c]/20"><SelectValue/></SelectTrigger>
                         <SelectContent className="bg-zinc-900 text-white"><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent>
                      </Select>
                    </div>
                  </div>
                  <p className="text-sm text-[#ccab6c]/90">From: {getUserName(selectedTicket.investor_email)}</p>
                </CardHeader>
                <CardContent className="flex-1 space-y-4 overflow-y-auto p-4">
                  <div className="bg-zinc-900/50 p-4 rounded-lg">
                    <p className="text-sm font-semibold text-zinc-300 mb-2">Initial Description</p>
                    <p className="text-zinc-300 whitespace-pre-wrap">{selectedTicket.description}</p>
                  </div>
                  {messages.map(msg => (
                    <div key={msg.id} className={`flex gap-3 ${msg.sender_email === currentUser.email ? 'justify-end' : 'justify-start'}`}>
                      <div className={`p-3 rounded-lg max-w-lg ${msg.sender_email === currentUser.email ? 'bg-[#b38922]/30 text-[#fef3d6]' : 'bg-zinc-900 text-zinc-300'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          {msg.sender_email === currentUser.email ? <Shield className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                          <p className="font-semibold text-sm">{getUserName(msg.sender_email)}</p>
                        </div>
                        <p className="whitespace-pre-wrap">{msg.message}</p>
                        <p className="text-xs text-right mt-1 opacity-70">{format(new Date(msg.created_date), 'p, MMM dd')}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
                <CardFooter className="p-4 border-t border-[#ccab6c]/25">
                  <div className="relative w-full">
                    <Textarea 
                      value={newMessage} 
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your response..."
                      className="bg-zinc-900 border-[#ccab6c]/20 pr-12"
                      rows={3}
                    />
                    <Button size="icon" onClick={handleSendMessage} className="absolute top-1/2 right-2 transform -translate-y-1/2 bg-[#fedea0] hover:bg-[#ccab6c]">
                      <Send className="w-4 h-4 text-black"/>
                    </Button>
                  </div>
                </CardFooter>
              </>
            ) : (
              <div className="flex-grow flex items-center justify-center">
                <p className="text-zinc-500">Select a ticket to view details</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { SupportTicket } from "@/entities/SupportTicket";
import { TicketMessage } from "@/entities/TicketMessage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Send, Paperclip } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";


const NewTicketForm = ({ user, onTicketCreated }) => {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await SupportTicket.create({
        investor_email: user.email,
        subject,
        description,
        category,
      });
      setSubject('');
      setDescription('');
      setCategory('general');
      onTicketCreated();
    } catch (error) {
      console.error("Error creating ticket:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="subject" className="text-zinc-300">Subject</Label>
        <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} required className="bg-zinc-900 border-[#ccab6c]/20"/>
      </div>
      <div>
        <Label htmlFor="category" className="text-zinc-300">Category</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="bg-zinc-900 border-[#ccab6c]/20">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-[#ccab6c]/20 text-white">
            <SelectItem value="general">General Inquiry</SelectItem>
            <SelectItem value="account">Account</SelectItem>
            <SelectItem value="investment">Investment</SelectItem>
            <SelectItem value="redemption">Redemption</SelectItem>
            <SelectItem value="technical">Technical</SelectItem>
            <SelectItem value="compliance">Compliance</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="description" className="text-zinc-300">Description</Label>
        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} required rows={5} className="bg-zinc-900 border-[#ccab6c]/20"/>
      </div>
      <Button type="submit" disabled={isSubmitting} className="w-full bg-[#fedea0] text-black hover:bg-[#ccab6c]">
        {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
      </Button>
    </form>
  );
};

export default function Support() {
  const [user, setUser] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isNewTicketDialogOpen, setIsNewTicketDialogOpen] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);
  
  const loadInitialData = async () => {
    setLoading(true);
    try {
      const userData = await User.me();
      setUser(userData);
      await loadTickets(userData.email);
    } catch (error) {
      console.error("Error loading support data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadTickets = async (email) => {
    const userTickets = await SupportTicket.filter({ investor_email: email }, '-created_date');
    setTickets(userTickets);
  };

  useEffect(() => {
    if (selectedTicket) {
      loadMessages(selectedTicket.id);
    } else {
      setMessages([]);
    }
  }, [selectedTicket]);

  const loadMessages = async (ticketId) => {
    const ticketMessages = await TicketMessage.filter({ ticket_id: ticketId }, 'created_date');
    setMessages(ticketMessages);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;
    try {
      await TicketMessage.create({
        ticket_id: selectedTicket.id,
        sender_email: user.email,
        message: newMessage,
      });
      setNewMessage('');
      loadMessages(selectedTicket.id);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading support center...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white">Support Center</h1>
            <p className="text-[#ccab6c]/90">Create and track your support requests</p>
            <p className="text-[#ccab6c]/90 text-sm">
              For urgent enquiries, please email <a href="mailto:support@varmacapital.io" className="text-[#fedea0] hover:text-[#fedea0] underline">support@varmacapital.io</a>
            </p>
          </div>
          <Dialog open={isNewTicketDialogOpen} onOpenChange={setIsNewTicketDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#fedea0] text-black hover:bg-[#ccab6c]">
                <PlusCircle className="w-4 h-4 mr-2" />
                New Ticket
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-950 border border-[#ccab6c]/30">
              <DialogHeader>
                <DialogTitle className="text-white">Create a New Support Ticket</DialogTitle>
              </DialogHeader>
              <NewTicketForm user={user} onTicketCreated={() => {
                setIsNewTicketDialogOpen(false);
                loadTickets(user.email);
              }}/>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Ticket List */}
          <Card className="lg:col-span-1 bg-zinc-950 border border-[#ccab6c]/30">
            <CardHeader><CardTitle className="text-white">Your Tickets</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tickets.map(ticket => (
                  <div key={ticket.id} onClick={() => setSelectedTicket(ticket)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedTicket?.id === ticket.id ? 'bg-zinc-900' : 'hover:bg-zinc-900'
                    }`}>
                    <div className="flex justify-between items-start">
                      <p className="font-medium text-white">{ticket.subject}</p>
                      <Badge variant={ticket.status === 'open' ? 'destructive' : 'default'} className="capitalize">{ticket.status}</Badge>
                    </div>
                    <p className="text-sm text-[#ccab6c]/90">
                      {format(new Date(ticket.created_date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                ))}
                {tickets.length === 0 && (
                  <p className="text-center text-zinc-500 py-8">No tickets found.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Ticket Details */}
          <Card className="lg:col-span-2 bg-zinc-950 border border-[#ccab6c]/30 flex flex-col">
            {selectedTicket ? (
              <>
                <CardHeader>
                  <CardTitle className="text-white">{selectedTicket.subject}</CardTitle>
                  <div className="text-sm text-[#ccab6c]/90">
                    Category: {selectedTicket.category} | Status: <span className="capitalize">{selectedTicket.status}</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow space-y-4 overflow-y-auto">
                  {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.sender_email === user.email ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-lg p-3 rounded-lg ${msg.sender_email === user.email ? 'bg-[#b38922]/25 text-[#fef3d6]' : 'bg-zinc-900 text-zinc-300'}`}>
                        <p>{msg.message}</p>
                        <p className="text-xs text-right mt-1 opacity-70">
                          {format(new Date(msg.created_date), 'p, MMM dd')}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
                <div className="p-4 border-t border-[#ccab6c]/25">
                  <div className="relative">
                    <Textarea 
                      value={newMessage} 
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="bg-zinc-900 border-[#ccab6c]/20 pr-20"
                    />
                    <div className="absolute top-1/2 right-2 transform -translate-y-1/2 flex items-center gap-1">
                      <Button variant="ghost" size="icon"><Paperclip className="w-4 h-4 text-[#ccab6c]/90"/></Button>
                      <Button size="icon" onClick={handleSendMessage} className="bg-[#fedea0] hover:bg-[#ccab6c]">
                        <Send className="w-4 h-4 text-black"/>
                      </Button>
                    </div>
                  </div>
                </div>
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
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Send, ArrowLeft, MessageSquare, Plus, ExternalLink, MapPin, Phone, Store, User, X, Check, Stethoscope, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/store/toastStore';
import { Button, Modal, Badge, Avatar } from '@/components/ui';
import { api } from '@/services/api';

interface Contact {
  id: string;
  name: string;
  businessName: string;
  role?: string;
  type?: string;
  avatar?: string;
  logo?: string;
  phone?: string;
  address?: string;
  city?: string;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  timestamp: string;
}

export default function ChatPage() {
  const { currentUser } = useAuthStore();
  const toast = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [msgText, setMsgText] = useState('');
  
  // Modals
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [newChatModalOpen, setNewChatModalOpen] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState('');
  const [newChatFilter, setNewChatFilter] = useState<'ALL' | 'ESTABLISHMENT' | 'PROFESSIONAL'>('ALL');

  // Messages state
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm1',
      conversationId: 'default',
      senderId: 'other',
      content: 'Olá! Como podemos ajudar seu pet hoje? 🐾',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
    }
  ]);

  useEffect(() => {
    fetchEstablishments();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeContactId]);

  const fetchEstablishments = async () => {
    try {
      const res = await api.get('/establishments');
      const list: Contact[] = res.data.map((e: any) => ({
        id: e.id,
        name: e.name,
        businessName: e.businessName || e.name,
        role: e.role,
        type: e.type || (e.role === 'PROFESSIONAL' ? 'Veterinário(a)' : 'Pet Shop & Clínica'),
        logo: e.avatar || e.photos?.[0] || (e.role === 'PROFESSIONAL' ? '/jorginho_derpy_shepherd_1788367498390.jpg' : '/salsicha_borzoi_1788367580508.jpg'),
        phone: e.phone || '',
        address: e.address || '',
        city: e.city || '',
      }));
      setContacts(list);
      if (list.length > 0 && !activeContactId) {
        setActiveContactId(list[0].id);
      }
    } catch (error) {
      console.error('Error loading chat contacts:', error);
    }
  };

  const activeContact = contacts.find(c => c.id === activeContactId);

  const filteredContacts = contacts.filter(c => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    const bName = c.businessName.toLowerCase();
    const uName = c.name.toLowerCase();
    return bName.startsWith(q) || uName.startsWith(q) || bName.includes(q) || uName.includes(q);
  });

  const availableForNewChat = contacts.filter(c => {
    if (newChatFilter === 'ESTABLISHMENT' && c.role !== 'ESTABLISHMENT') return false;
    if (newChatFilter === 'PROFESSIONAL' && c.role !== 'PROFESSIONAL') return false;
    const q = newChatSearch.toLowerCase().trim();
    if (!q) return true;
    return c.businessName.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || (c.city && c.city.toLowerCase().includes(q));
  });

  const activeMessages = messages.filter(
    m => m.conversationId === activeContactId || (m.conversationId === 'default' && activeContactId === contacts[0]?.id)
  );

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!msgText.trim() || !activeContactId) return;

    const newMsg: Message = {
      id: String(Date.now()),
      conversationId: activeContactId,
      senderId: currentUser?.id || 'me',
      content: msgText.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, newMsg]);
    setMsgText('');

    // Simulated reply
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          id: String(Date.now() + 1),
          conversationId: activeContactId,
          senderId: 'other',
          content: 'Olá! Recebemos sua mensagem e entraremos em contato em instantes.',
          timestamp: new Date().toISOString(),
        }
      ]);
    }, 1200);
  };

  const handleSelectNewChat = (contact: Contact) => {
    setActiveContactId(contact.id);
    setNewChatModalOpen(false);
    setNewChatSearch('');
    toast.success(`Conversa com ${contact.businessName} iniciada!`);
  };

  const handleOpenWhatsApp = (phoneStr?: string) => {
    if (!phoneStr) {
      toast.error('Este estabelecimento não possui WhatsApp cadastrado.');
      return;
    }
    const cleanDigits = phoneStr.replace(/\D/g, '');
    if (!cleanDigits) {
      toast.error('Número de WhatsApp inválido.');
      return;
    }
    const fullNumber = cleanDigits.length <= 11 ? `55${cleanDigits}` : cleanDigits;
    window.open(`https://wa.me/${fullNumber}`, '_blank');
  };

  return (
    <div className="max-w-6xl mx-auto flex h-[calc(100vh-theme(spacing.16)-theme(spacing.16))] lg:h-[calc(100vh-theme(spacing.16))] bg-white dark:bg-[#1E1F20] lg:border-x border-neutral-100 dark:border-[#313335] relative overflow-hidden rounded-2xl shadow-sm my-2">
      {/* Sidebar - Contacts List */}
      <div className={`w-full lg:w-80 flex flex-col border-r border-neutral-100 dark:border-[#313335] bg-white dark:bg-[#1E1F20] ${activeContactId ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-4 border-b border-neutral-100 dark:border-[#313335] space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-neutral-900 dark:text-[#E3E3E3]">Mensagens</h1>
            <button
              onClick={() => setNewChatModalOpen(true)}
              className="flex items-center gap-1 text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 dark:hover:bg-orange-950/60 px-3 py-1.5 rounded-xl transition-colors shadow-2xs"
              title="Iniciar nova conversa"
            >
              <Plus size={14} />
              <span>Nova conversa</span>
            </button>
          </div>

          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-[#8E918F]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar conversas..."
              className="w-full pl-9 pr-4 py-2 bg-neutral-50 dark:bg-[#282A2C] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all border border-neutral-200 dark:border-[#313335] text-neutral-900 dark:text-[#E3E3E3] placeholder:text-neutral-400 dark:placeholder:text-[#8E918F]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredContacts.length === 0 ? (
            <div className="p-6 text-center text-neutral-400 dark:text-[#8E918F] text-sm">
              <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
              <p className="font-semibold text-neutral-600 dark:text-[#C4C7C5]">Nenhuma conversa encontrada</p>
              <button
                onClick={() => setNewChatModalOpen(true)}
                className="mt-3 text-xs text-orange-600 dark:text-orange-400 font-bold hover:underline"
              >
                + Iniciar nova conversa
              </button>
            </div>
          ) : (
            filteredContacts.map(contact => {
              const isSelected = activeContactId === contact.id;
              return (
                <button
                  key={contact.id}
                  onClick={() => setActiveContactId(contact.id)}
                  className={`w-full flex items-center gap-3 p-3.5 border-b border-neutral-50 dark:border-[#313335] transition-colors text-left ${
                    isSelected ? 'bg-orange-50/70 dark:bg-orange-950/30 border-l-4 border-l-orange-500' : 'hover:bg-neutral-50 dark:hover:bg-[#282A2C]'
                  }`}
                >
                  <div className="relative shrink-0">
                    <Avatar src={contact.logo || contact.avatar} name={contact.businessName} size="md" isEstablishment={true} />
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-[#1E1F20] rounded-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-semibold truncate ${isSelected ? 'text-orange-950 dark:text-orange-300' : 'text-neutral-800 dark:text-[#E3E3E3]'}`}>
                        {contact.businessName}
                      </p>
                    </div>
                    <p className="text-xs text-neutral-400 dark:text-[#8E918F] truncate mt-0.5">
                      {contact.type} {contact.city ? `· ${contact.city}` : ''}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col bg-[#F8F9FA] dark:bg-[#131314] ${!activeContactId ? 'hidden lg:flex' : 'flex'}`}>
        {!activeContact ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-20 h-20 bg-white dark:bg-[#1E1F20] rounded-full shadow-sm flex items-center justify-center mb-4 text-3xl">
              💬
            </div>
            <h2 className="text-lg font-bold text-neutral-800 dark:text-[#E3E3E3] mb-1">Suas mensagens</h2>
            <p className="text-neutral-400 dark:text-[#8E918F] text-xs max-w-sm mb-4">
              Selecione um estabelecimento ou profissional ao lado para conversar em tempo real.
            </p>
            <Button size="sm" onClick={() => setNewChatModalOpen(true)} leftIcon={<Plus size={15} />}>
              Nova conversa
            </Button>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="h-16 px-4 bg-white dark:bg-[#1E1F20] border-b border-neutral-100 dark:border-[#313335] flex items-center justify-between shrink-0 shadow-sm z-10">
              <div
                onClick={() => setContactModalOpen(true)}
                className="flex items-center gap-3 cursor-pointer hover:opacity-85 transition-opacity"
                title="Ver perfil"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveContactId(null);
                  }}
                  className="lg:hidden p-1.5 -ml-1 text-neutral-500 dark:text-[#C4C7C5] hover:text-neutral-900 dark:hover:text-white"
                >
                  <ArrowLeft size={18} />
                </button>
                <Avatar src={activeContact.logo || activeContact.avatar} name={activeContact.businessName} size="md" isEstablishment={true} />
                <div>
                  <h2 className="font-bold text-sm text-neutral-900 dark:text-[#E3E3E3] flex items-center gap-1.5">
                    {activeContact.businessName}
                    <span className="text-[10px] text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 px-1.5 py-0.5 rounded font-medium">Ver detalhes</span>
                  </h2>
                  <p className="text-[11px] text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Online para atendimento
                  </p>
                </div>
              </div>

              {/* WhatsApp Quick Link */}
              {activeContact.phone && (
                <button
                  onClick={() => handleOpenWhatsApp(activeContact.phone)}
                  className="flex items-center gap-1.5 bg-green-50 dark:bg-green-950/40 hover:bg-green-100 dark:hover:bg-green-950/60 text-green-700 dark:text-green-300 text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
                >
                  <span>💬 WhatsApp</span>
                </button>
              )}
            </div>

            {/* Messages Stream with Strict Left/Right Alignment */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="text-center my-2">
                <span className="text-[11px] text-neutral-400 dark:text-[#8E918F] bg-white dark:bg-[#1E1F20] px-3 py-1 rounded-full font-medium shadow-2xs border border-neutral-100 dark:border-[#313335]">
                  Início da conversa com {activeContact.businessName}
                </span>
              </div>

              {activeMessages.map((msg) => {
                const isMe = msg.senderId === (currentUser?.id || 'me');
                return (
                  <div
                    key={msg.id}
                    className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[78%] sm:max-w-[65%] rounded-2xl px-4 py-2.5 shadow-sm ${
                        isMe
                          ? 'bg-orange-500 text-white rounded-br-xs'
                          : 'bg-white dark:bg-[#282A2C] text-neutral-800 dark:text-[#E3E3E3] rounded-bl-xs border border-neutral-100 dark:border-[#313335]'
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {msg.content}
                      </p>
                      <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-white/70' : 'text-neutral-400 dark:text-[#8E918F]'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="p-3.5 bg-white dark:bg-[#1E1F20] border-t border-neutral-100 dark:border-[#313335] flex items-center gap-2">
              <input
                type="text"
                value={msgText}
                onChange={(e) => setMsgText(e.target.value)}
                placeholder="Digite sua mensagem..."
                className="flex-1 bg-neutral-100 dark:bg-[#282A2C] text-sm text-neutral-900 dark:text-[#E3E3E3] placeholder:text-neutral-400 dark:placeholder:text-[#8E918F] rounded-full px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all border border-transparent dark:border-[#313335]"
              />
              <button
                type="submit"
                disabled={!msgText.trim()}
                className="p-2.5 bg-orange-500 disabled:bg-neutral-200 dark:disabled:bg-[#282A2C] disabled:text-neutral-400 text-white rounded-full transition-colors shrink-0 shadow-sm hover:bg-orange-600"
              >
                <Send size={16} />
              </button>
            </form>
          </>
        )}
      </div>

      {/* New Conversation Modal */}
      <Modal
        isOpen={newChatModalOpen}
        onClose={() => setNewChatModalOpen(false)}
        title="➕ Iniciar Nova Conversa"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-neutral-500 dark:text-[#C4C7C5]">
            Selecione um pet shop, clínica ou profissional veterinário ativo para iniciar o atendimento:
          </p>

          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-[#8E918F]" />
            <input
              type="text"
              value={newChatSearch}
              onChange={(e) => setNewChatSearch(e.target.value)}
              placeholder="Buscar por nome, especialidade ou cidade..."
              className="w-full pl-9 pr-4 py-2 bg-neutral-50 dark:bg-[#282A2C] rounded-xl text-sm border border-neutral-200 dark:border-[#313335] text-neutral-900 dark:text-[#E3E3E3] placeholder:text-neutral-400 dark:placeholder:text-[#8E918F] focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>

          <div className="flex gap-2 text-xs font-semibold">
            {[
              { id: 'ALL', label: 'Todos' },
              { id: 'ESTABLISHMENT', label: 'Pet Shops / Clínicas' },
              { id: 'PROFESSIONAL', label: 'Veterinários' },
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setNewChatFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  newChatFilter === f.id
                    ? 'bg-orange-500 text-white'
                    : 'bg-neutral-100 dark:bg-[#282A2C] text-neutral-600 dark:text-[#C4C7C5] hover:bg-neutral-200 dark:hover:bg-[#313335]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
            {availableForNewChat.length === 0 ? (
              <div className="p-8 text-center text-neutral-400 dark:text-[#8E918F] text-sm">
                <Store size={36} className="mx-auto mb-2 opacity-30" />
                <p className="font-semibold text-neutral-600 dark:text-[#C4C7C5]">Nenhum estabelecimento ou profissional encontrado</p>
              </div>
            ) : (
              availableForNewChat.map(c => (
                <div
                  key={c.id}
                  onClick={() => handleSelectNewChat(c)}
                  className="flex items-center justify-between p-3 rounded-xl border border-neutral-100 dark:border-[#313335] hover:border-orange-200 dark:hover:border-orange-800/60 hover:bg-orange-50/50 dark:hover:bg-orange-950/20 cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={c.logo} alt="" className="w-11 h-11 rounded-full object-cover border border-neutral-200 dark:border-[#313335] shrink-0" />
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-neutral-900 dark:text-[#E3E3E3] truncate group-hover:text-orange-600 transition-colors">
                        {c.businessName}
                      </h4>
                      <p className="text-xs text-neutral-400 dark:text-[#8E918F] truncate mt-0.5 flex items-center gap-1">
                        <span>{c.type}</span>
                        {c.city && <span>· {c.city}</span>}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="shrink-0 text-orange-600 dark:text-orange-400 font-bold group-hover:bg-orange-500 group-hover:text-white">
                    Conversar
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* Contact Profile Modal */}
      <Modal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        title={activeContact?.businessName || 'Detalhes do Contato'}
        size="sm"
      >
        {activeContact && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-[#282A2C] rounded-2xl">
              <img src={activeContact.logo} alt="" className="w-14 h-14 rounded-full object-cover border border-neutral-200 dark:border-[#313335]" />
              <div>
                <h3 className="font-bold text-base text-neutral-900 dark:text-[#E3E3E3]">{activeContact.businessName}</h3>
                <p className="text-xs text-neutral-500 dark:text-[#C4C7C5]">{activeContact.type || activeContact.name}</p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              {activeContact.phone && (
                <div className="flex items-center gap-2 text-neutral-700 dark:text-[#E3E3E3]">
                  <Phone size={16} className="text-neutral-400 dark:text-[#8E918F] shrink-0" />
                  <span>{activeContact.phone}</span>
                </div>
              )}
              {activeContact.address && (
                <div className="flex items-center gap-2 text-neutral-700 dark:text-[#E3E3E3]">
                  <MapPin size={16} className="text-neutral-400 dark:text-[#8E918F] shrink-0" />
                  <span>{activeContact.address}</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-neutral-100 dark:border-[#313335] flex flex-col gap-2">
              {activeContact.phone ? (
                <Button
                  fullWidth
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleOpenWhatsApp(activeContact.phone)}
                >
                  Conversar no WhatsApp 💬
                </Button>
              ) : (
                <p className="text-xs text-neutral-400 dark:text-[#8E918F] text-center">Nenhum telefone cadastrado para este contato.</p>
              )}
              <Button variant="ghost" fullWidth onClick={() => setContactModalOpen(false)}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

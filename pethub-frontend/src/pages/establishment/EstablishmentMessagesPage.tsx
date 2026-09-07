import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/store/toastStore';
import { formatMessageTimestamp } from '@/utils/date';
import {
  Search,
  Send,
  ArrowLeft,
  MessageSquare,
  Plus,
  Phone,
  User,
  X,
  CheckCheck,
  Clock,
} from 'lucide-react';
import { WhatsAppIcon } from '@/components/shared/WhatsAppIcon';
import { Button, Modal, Badge, Avatar } from '@/components/ui';

interface Participant {
  id: string;
  name: string;
  businessName?: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: string;
}

interface MessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  read: boolean;
  createdAt: string;
}

interface ConversationItem {
  id: string;
  participant1Id: string;
  participant2Id: string;
  lastMessageAt: string;
  createdAt: string;
  unreadCount: number;
  lastMessage: {
    id: string;
    content: string;
    senderId: string;
    read: boolean;
    createdAt: string;
  } | null;
  otherUser: Participant;
}

interface ContactItem {
  id: string;
  name: string;
  businessName: string;
  role: string;
  type?: string;
  avatar?: string;
  phone?: string;
  address?: string;
  city?: string;
}

const getFullImageUrl = (url?: string | null) => {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const baseUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:3000';
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};

export default function EstablishmentMessagesPage() {
  const { currentUser } = useAuthStore();
  const toast = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [msgText, setMsgText] = useState('');

  // New Chat Modal
  const [newChatModalOpen, setNewChatModalOpen] = useState(false);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactSearch, setContactSearch] = useState('');

  // Fetch conversations list
  const fetchConversations = async (silent = false) => {
    if (!silent) setLoadingConversations(true);
    try {
      const res = await api.get('/messages/conversations');
      setConversations(res.data || []);
      if (!silent && res.data?.length > 0 && !activeConversationId) {
        setActiveConversationId(res.data[0].id);
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      if (!silent) setLoadingConversations(false);
    }
  };

  // Fetch active conversation messages
  const fetchActiveConversation = async (convId: string, silent = false) => {
    if (!silent) setLoadingMessages(true);
    try {
      const res = await api.get(`/messages/conversations/${convId}`);
      setMessages(res.data?.messages || []);
      // Update unread count for this conversation in list
      setConversations(prev =>
        prev.map(c => (c.id === convId ? { ...c, unreadCount: 0 } : c))
      );
    } catch (err) {
      console.error('Error loading conversation messages:', err);
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  // When active conversation changes, load messages
  useEffect(() => {
    if (activeConversationId) {
      fetchActiveConversation(activeConversationId);
    } else {
      setMessages([]);
    }
  }, [activeConversationId]);

  // Polling for new messages every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations(true);
      if (activeConversationId) {
        fetchActiveConversation(activeConversationId, true);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [activeConversationId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message handler
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = msgText.trim();
    if (!text || !activeConversationId || sending) return;

    setSending(true);
    try {
      const res = await api.post('/messages', {
        conversationId: activeConversationId,
        content: text,
      });

      if (res.data?.message) {
        setMessages(prev => [...prev, res.data.message]);
        setMsgText('');
        // Update last message in conversation list
        setConversations(prev =>
          prev.map(c =>
            c.id === activeConversationId
              ? {
                  ...c,
                  lastMessage: res.data.message,
                  lastMessageAt: res.data.message.createdAt,
                }
              : c
          )
        );
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Erro ao enviar mensagem.';
      toast.error(errMsg);
    } finally {
      setSending(false);
    }
  };

  // Open New Chat Modal
  const handleOpenNewChat = async () => {
    setNewChatModalOpen(true);
    setLoadingContacts(true);
    try {
      const res = await api.get('/messages/contacts');
      setContacts(res.data || []);
    } catch (err) {
      console.error('Error fetching contacts:', err);
    } finally {
      setLoadingContacts(false);
    }
  };

  // Select contact to start or open chat
  const handleSelectContact = async (contact: ContactItem) => {
    const existing = conversations.find(c => c.otherUser.id === contact.id);
    if (existing) {
      setActiveConversationId(existing.id);
      setNewChatModalOpen(false);
      return;
    }

    try {
      const res = await api.post('/messages', {
        recipientId: contact.id,
        content: 'Olá! Como posso ajudar você e seu pet?',
      });

      if (res.data?.conversationId) {
        await fetchConversations();
        setActiveConversationId(res.data.conversationId);
        setNewChatModalOpen(false);
        toast.success(`Conversa iniciada com ${contact.name}!`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao iniciar conversa.');
    }
  };

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  const filteredConversations = conversations.filter(c => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    const name = c.otherUser.name.toLowerCase();
    const bName = (c.otherUser.businessName || '').toLowerCase();
    return name.includes(q) || bName.includes(q);
  });

  const filteredContacts = contacts.filter(c => {
    const q = contactSearch.toLowerCase().trim();
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q));
  });

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto h-[calc(100vh-4rem)] flex flex-col">
      {/* Container Box */}
      <div className="flex-1 flex bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-200/80 dark:border-[#313335] shadow-xs overflow-hidden">
        {/* Left Column: Conversations List */}
        <div
          className={`w-full md:w-80 lg:w-96 flex flex-col border-r border-neutral-200/80 dark:border-[#313335] bg-white dark:bg-[#1E1F20] ${
            activeConversationId ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Header */}
          <div className="p-4 border-b border-neutral-200/80 dark:border-[#313335] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="text-orange-500" size={20} />
                <h2 className="font-bold text-lg text-neutral-900 dark:text-[#E3E3E3]">Mensagens</h2>
              </div>
              <button
                onClick={handleOpenNewChat}
                className="flex items-center gap-1 text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 dark:hover:bg-orange-950/60 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                title="Nova conversa"
              >
                <Plus size={14} />
                <span>Nova Conversa</span>
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Buscar conversas..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-neutral-100 dark:bg-[#282A2C] border border-neutral-200 dark:border-[#313335] rounded-xl text-xs text-neutral-900 dark:text-[#E3E3E3] placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
          </div>

          {/* Conversations Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 dark:divide-[#313335]">
            {loadingConversations ? (
              <div className="p-8 text-center text-neutral-400 dark:text-[#8E918F]">
                <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs">Carregando conversas...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-neutral-400 dark:text-[#8E918F] space-y-2">
                <MessageSquare size={32} className="mx-auto text-neutral-300 dark:text-neutral-600" />
                <p className="text-xs font-semibold text-neutral-600 dark:text-[#C4C7C5]">
                  Nenhuma conversa encontrada
                </p>
                <p className="text-[11px] text-neutral-400 dark:text-[#8E918F]">
                  Inicie uma nova conversa clicando no botão acima.
                </p>
              </div>
            ) : (
              filteredConversations.map(conv => {
                const isActive = conv.id === activeConversationId;
                const other = conv.otherUser;
                const lastMsg = conv.lastMessage;
                const isMyLastMsg = lastMsg?.senderId === currentUser?.id;

                return (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConversationId(conv.id)}
                    className={`w-full p-3.5 flex items-start gap-3 text-left transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-orange-50/60 dark:bg-orange-950/30 border-l-4 border-orange-500'
                        : 'hover:bg-neutral-50 dark:hover:bg-[#282A2C]'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <Avatar
                        src={getFullImageUrl(other.avatar)}
                        name={other.name}
                        size="md"
                      />
                      {conv.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-bold text-xs text-neutral-900 dark:text-[#E3E3E3] truncate">
                          {other.name}
                        </span>
                        {lastMsg && (
                          <span className="text-[10px] text-neutral-400 dark:text-[#8E918F] shrink-0">
                            {formatMessageTimestamp(lastMsg.createdAt)}
                          </span>
                        )}
                      </div>

                      <p
                        className={`text-xs truncate ${
                          conv.unreadCount > 0
                            ? 'font-bold text-neutral-900 dark:text-[#E3E3E3]'
                            : 'text-neutral-500 dark:text-[#8E918F]'
                        }`}
                      >
                        {lastMsg ? (
                          <>
                            {isMyLastMsg && <span className="text-neutral-400">Você: </span>}
                            {lastMsg.content}
                          </>
                        ) : (
                          <span className="italic text-neutral-400">Conversa iniciada</span>
                        )}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Chat Area */}
        <div
          className={`flex-1 flex flex-col bg-neutral-50/50 dark:bg-[#131314] ${
            !activeConversationId ? 'hidden md:flex' : 'flex'
          }`}
        >
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 bg-white dark:bg-[#1E1F20] border-b border-neutral-200/80 dark:border-[#313335] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveConversationId(null)}
                    className="p-1.5 -ml-1 text-neutral-600 dark:text-[#C4C7C5] hover:bg-neutral-100 dark:hover:bg-[#282A2C] rounded-lg md:hidden cursor-pointer"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <Avatar
                    src={getFullImageUrl(activeConversation.otherUser.avatar)}
                    name={activeConversation.otherUser.name}
                    size="md"
                  />
                  <div>
                    <h3 className="font-bold text-sm text-neutral-900 dark:text-[#E3E3E3]">
                      {activeConversation.otherUser.name}
                    </h3>
                    <p className="text-[11px] text-neutral-400 dark:text-[#8E918F]">
                      {activeConversation.otherUser.phone
                        ? `Tel: ${activeConversation.otherUser.phone}`
                        : activeConversation.otherUser.email}
                    </p>
                  </div>
                </div>

                {activeConversation.otherUser.phone && (
                  <button
                    onClick={() => {
                      const digits = activeConversation.otherUser.phone?.replace(/\D/g, '');
                      if (digits) {
                        const num = digits.length <= 11 ? `55${digits}` : digits;
                        window.open(`https://wa.me/${num}`, '_blank');
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    title="Conversar via WhatsApp"
                  >
                    <WhatsAppIcon size={16} />
                    <span className="hidden sm:inline">WhatsApp</span>
                  </button>
                )}
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMessages ? (
                  <div className="p-12 text-center text-neutral-400">
                    <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-xs">Carregando histórico...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-400">
                    <MessageSquare size={36} className="text-neutral-300 dark:text-neutral-600 mb-2" />
                    <p className="text-xs font-semibold text-neutral-700 dark:text-[#C4C7C5]">
                      Nenhuma mensagem trocada ainda
                    </p>
                    <p className="text-[11px]">Envie uma mensagem abaixo para começar a conversa.</p>
                  </div>
                ) : (
                  messages.map(m => {
                    const isMe = m.senderId === currentUser?.id;
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[80%] sm:max-w-md px-4 py-2.5 rounded-2xl text-xs break-words shadow-2xs ${
                            isMe
                              ? 'bg-orange-500 text-white rounded-tr-xs'
                              : 'bg-white dark:bg-[#1E1F20] text-neutral-900 dark:text-[#E3E3E3] border border-neutral-200/80 dark:border-[#313335] rounded-tl-xs'
                          }`}
                        >
                          <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                        </div>
                        <div className="flex items-center gap-1 mt-1 px-1">
                          <span className="text-[10px] text-neutral-400 dark:text-[#8E918F]">
                            {formatMessageTimestamp(m.createdAt)}
                          </span>
                          {isMe && (
                            <CheckCheck
                              size={12}
                              className={m.read ? 'text-blue-500' : 'text-neutral-400'}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-3 bg-white dark:bg-[#1E1F20] border-t border-neutral-200/80 dark:border-[#313335] shrink-0">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={msgText}
                    onChange={e => setMsgText(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    disabled={sending}
                    className="flex-1 bg-neutral-100 dark:bg-[#282A2C] border border-neutral-200 dark:border-[#313335] rounded-xl px-4 py-2.5 text-xs text-neutral-900 dark:text-[#E3E3E3] placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                  <Button
                    type="submit"
                    disabled={!msgText.trim() || sending}
                    isLoading={sending}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl shadow-2xs shrink-0"
                  >
                    <Send size={15} />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-neutral-400 dark:text-[#8E918F]">
              <div className="w-16 h-16 rounded-3xl bg-orange-50 dark:bg-orange-950/40 text-orange-500 flex items-center justify-center mb-3">
                <MessageSquare size={32} />
              </div>
              <h3 className="font-bold text-base text-neutral-800 dark:text-[#E3E3E3] mb-1">
                Central de Mensagens
              </h3>
              <p className="text-xs max-w-sm">
                Selecione uma conversa ao lado para visualizar o histórico e responder aos seus clientes em tempo real.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Chat Modal */}
      {newChatModalOpen && (
        <Modal
          isOpen={newChatModalOpen}
          onClose={() => setNewChatModalOpen(false)}
          title="Iniciar Nova Conversa"
          size="md"
        >
          <div className="space-y-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Buscar cliente por nome ou telefone..."
                value={contactSearch}
                onChange={e => setContactSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-neutral-100 dark:bg-[#282A2C] border border-neutral-200 dark:border-[#313335] rounded-xl text-xs text-neutral-900 dark:text-[#E3E3E3] placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-neutral-100 dark:divide-[#313335] border border-neutral-200 dark:border-[#313335] rounded-xl">
              {loadingContacts ? (
                <div className="p-8 text-center text-neutral-400">
                  <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs">Carregando contatos...</p>
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="p-8 text-center text-neutral-400 text-xs">
                  Nenhum cliente disponível encontrado.
                </div>
              ) : (
                filteredContacts.map(contact => (
                  <button
                    key={contact.id}
                    onClick={() => handleSelectContact(contact)}
                    className="w-full p-3 flex items-center gap-3 text-left hover:bg-neutral-50 dark:hover:bg-[#282A2C] transition-colors cursor-pointer"
                  >
                    <Avatar
                      src={getFullImageUrl(contact.avatar)}
                      name={contact.name}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-neutral-900 dark:text-[#E3E3E3] truncate">
                        {contact.name}
                      </p>
                      <p className="text-[11px] text-neutral-400 dark:text-[#8E918F] truncate">
                        {contact.phone || contact.type || 'Tutor'}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Send, Image as ImageIcon, Smile, ArrowLeft, MoreVertical, Phone, Video } from 'lucide-react';
import { conversations, messages } from '@/data/messages';
import { establishments } from '@/data/users';
import { useAuthStore } from '@/store/authStore';
import { EmptyState } from '@/components/ui';

export default function ChatPage() {
  const { currentUser } = useAuthStore();
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [msgText, setMsgText] = useState('');

  const myConvs = conversations;
  const activeConv = myConvs.find(c => c.id === activeConvId);
  
  const getOtherParticipant = (conv: typeof myConvs[0]) => {
    return establishments.find(e => e.id === conv.participantId);
  };

  const activeMessages = messages.filter(m => m.conversationId === activeConvId).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const activeOther = activeConv ? getOtherParticipant(activeConv) : null;

  return (
    <div className="max-w-6xl mx-auto flex h-[calc(100vh-theme(spacing.16)-theme(spacing.16))] lg:h-[calc(100vh-theme(spacing.16))] bg-white lg:border-x border-neutral-100 relative overflow-hidden">
      
      {/* Sidebar - Conversation List */}
      <div className={`w-full lg:w-80 flex flex-col border-r border-neutral-100 ${activeConvId ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-4 border-b border-neutral-100">
          <h1 className="text-xl font-bold text-neutral-900 mb-4">Mensagens</h1>
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input 
              type="text" 
              placeholder="Buscar conversas..." 
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all border border-transparent"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {myConvs.length === 0 ? (
            <div className="p-4 text-center text-neutral-500 mt-10">
              Nenhuma conversa ativa
            </div>
          ) : (
            myConvs.map(conv => {
              const other = getOtherParticipant(conv);
              if (!other) return null;
              
              const isUnread = conv.unreadCount > 0;
              
              return (
                <button
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={`w-full flex items-center gap-3 p-4 border-b border-neutral-50 transition-colors ${activeConvId === conv.id ? 'bg-orange-50' : 'hover:bg-neutral-50'}`}
                >
                  <div className="relative shrink-0">
                    <img src={other.logo || other.coverPhoto} alt="" className="w-12 h-12 rounded-full object-cover border border-neutral-100" />
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex justify-between items-baseline mb-1">
                      <p className={`font-semibold text-sm truncate ${isUnread ? 'text-neutral-900' : 'text-neutral-700'}`}>{other.businessName}</p>
                      <p className={`text-xs ${isUnread ? 'text-orange-500 font-bold' : 'text-neutral-400'}`}>
                        {new Date(conv.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className={`text-xs truncate ${isUnread ? 'text-neutral-900 font-medium' : 'text-neutral-500'}`}>
                        {conv.lastMessage.content}
                      </p>
                      {isUnread && (
                        <span className="shrink-0 w-5 h-5 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col bg-[#F8F9FA] ${!activeConvId ? 'hidden lg:flex' : 'flex'}`}>
        {!activeConvId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-24 h-24 bg-white rounded-full shadow-sm flex items-center justify-center mb-6">
              <span className="text-4xl">💬</span>
            </div>
            <h2 className="text-xl font-bold text-neutral-900 mb-2">Suas mensagens</h2>
            <p className="text-neutral-500 max-w-sm">Selecione uma conversa ao lado para começar a falar com estabelecimentos e profissionais.</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="h-16 px-4 bg-white border-b border-neutral-100 flex items-center justify-between shrink-0 shadow-sm z-10">
              <div className="flex items-center gap-3">
                <button onClick={() => setActiveConvId(null)} className="lg:hidden p-2 -ml-2 text-neutral-500 hover:text-neutral-900">
                  <ArrowLeft size={20} />
                </button>
                <img src={activeOther?.logo || activeOther?.coverPhoto} alt="" className="w-10 h-10 rounded-full object-cover" />
                <div>
                  <h2 className="font-bold text-sm text-neutral-900">{activeOther?.businessName}</h2>
                  <p className="text-xs text-green-500 font-medium">Online agora</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-neutral-400">
                <button className="p-2 hover:text-orange-500 transition-colors hidden sm:block"><Phone size={18} /></button>
                <button className="p-2 hover:text-orange-500 transition-colors hidden sm:block"><Video size={18} /></button>
                <button className="p-2 hover:text-orange-500 transition-colors"><MoreVertical size={18} /></button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="text-center">
                <span className="text-xs text-neutral-400 bg-black/5 px-3 py-1 rounded-full font-medium">
                  Início da conversa
                </span>
              </div>
              
              {activeMessages.map((msg, i) => {
                const isMe = msg.senderId === currentUser?.id;
                return (
                  <motion.div 
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[75%] sm:max-w-[60%] rounded-2xl px-4 py-2 ${isMe ? 'bg-orange-500 text-white rounded-tr-sm' : 'bg-white text-neutral-800 rounded-tl-sm shadow-sm border border-neutral-100'}`}>
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                      <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-white/70' : 'text-neutral-400'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Message Input */}
            <div className="p-4 bg-white border-t border-neutral-100">
              <div className="flex items-center gap-2">
                <button className="p-2 text-neutral-400 hover:text-orange-500 transition-colors rounded-full hover:bg-neutral-50 shrink-0">
                  <ImageIcon size={20} />
                </button>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={msgText}
                    onChange={(e) => setMsgText(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    className="w-full bg-neutral-100 text-sm rounded-full pl-4 pr-10 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all border border-transparent"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && msgText.trim()) {
                        setMsgText('');
                      }
                    }}
                  />
                  <button className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-orange-500 transition-colors">
                    <Smile size={18} />
                  </button>
                </div>
                <button 
                  disabled={!msgText.trim()}
                  className="p-3 bg-orange-500 disabled:bg-neutral-200 text-white rounded-full transition-colors shrink-0"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

    </div>
  );
}

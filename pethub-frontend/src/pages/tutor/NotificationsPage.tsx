import React from 'react';
import { motion } from 'framer-motion';
import { notifications } from '@/data/notifications';

export default function NotificationsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-neutral-900 mb-6">Notificações</h1>
      <div className="space-y-4">
        {notifications.map((notif, i) => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ scale: 1.01 }}
            className={`p-5 rounded-2xl border transition-all cursor-pointer ${
              !notif.isRead 
                ? 'bg-orange-50 border-orange-200 shadow-sm shadow-orange-100' 
                : 'bg-white border-neutral-100 shadow-sm hover:shadow-md'
            }`}
          >
            <div className="flex justify-between items-start mb-1">
              <h3 className={`font-bold ${!notif.isRead ? 'text-neutral-900' : 'text-neutral-700'}`}>
                {notif.title}
              </h3>
              {!notif.isRead && <span className="w-2.5 h-2.5 bg-orange-500 rounded-full shrink-0" />}
            </div>
            <p className="text-sm text-neutral-600 leading-relaxed mb-3">{notif.message}</p>
            <p className="text-xs font-medium text-neutral-400">
              {new Date(notif.date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

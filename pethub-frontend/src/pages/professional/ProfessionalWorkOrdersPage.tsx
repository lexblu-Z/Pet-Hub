import React, { useState } from 'react';
import { ClipboardList, Plus, FileText, CheckCircle, Clock, AlertCircle, Search } from 'lucide-react';
import { Button, Badge, Input, Modal } from '@/components/ui';

interface WorkOrder {
  id: string;
  code: string;
  date: string;
  patient: string;
  tutor: string;
  service: string;
  value: number;
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE';
  notes?: string;
}

export default function ProfessionalWorkOrdersPage() {
  const [orders, setOrders] = useState<WorkOrder[]>([
    {
      id: '1',
      code: 'OS-2026-089',
      date: '03/09/2026',
      patient: 'Thor (Golden Retriever)',
      tutor: 'Mariana Silva',
      service: 'Exame de Sangue + Hemograma Completo',
      value: 160.00,
      status: 'IN_PROGRESS',
      notes: 'Aguardando liberação do laboratório.',
    },
    {
      id: '2',
      code: 'OS-2026-088',
      date: '02/09/2026',
      patient: 'Mel (Yorkshire)',
      tutor: 'Roberto Lima',
      service: 'Limpeza de Tártaro e Avaliação Bucal',
      value: 280.00,
      status: 'DONE',
      notes: 'Procedimento finalizado sem intercorrências.',
    },
    {
      id: '3',
      code: 'OS-2026-087',
      date: '01/09/2026',
      patient: 'Mia (Gato SRD)',
      tutor: 'Juliana Costa',
      service: 'Aplicação Antirrábica + Vermífugo',
      value: 95.00,
      status: 'DONE',
      notes: 'Próxima dose prevista em 12 meses.',
    }
  ]);

  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);

  const filtered = orders.filter(o =>
    !search ||
    o.code.toLowerCase().includes(search.toLowerCase()) ||
    o.patient.toLowerCase().includes(search.toLowerCase()) ||
    o.tutor.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Ordens de Serviço</h1>
          <p className="text-neutral-500 text-sm mt-0.5">Histórico clínico de procedimentos, laudos e cobranças</p>
        </div>
        <div className="flex gap-2 text-xs font-semibold">
          <span className="px-3 py-1.5 bg-neutral-100 rounded-xl text-neutral-700">
            Total: {orders.length} OS
          </span>
          <span className="px-3 py-1.5 bg-teal-50 text-teal-800 rounded-xl border border-teal-200">
            Concluídas: {orders.filter(o => o.status === 'DONE').length}
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-neutral-100 p-4 shadow-xs">
        <Input
          placeholder="Buscar por código de OS, paciente ou tutor..."
          leftIcon={<Search size={16} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50/80 text-neutral-500 font-semibold border-b border-neutral-100 text-xs uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Código OS</th>
                <th className="py-3.5 px-4">Paciente & Tutor</th>
                <th className="py-3.5 px-4">Procedimento / Serviço</th>
                <th className="py-3.5 px-4">Valor</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map((o) => (
                <tr key={o.id} className="hover:bg-neutral-50/60 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-teal-700 text-xs">
                    {o.code}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-neutral-900">{o.patient}</div>
                    <div className="text-xs text-neutral-400">Tutor: {o.tutor}</div>
                  </td>
                  <td className="py-3.5 px-4 text-neutral-700 text-xs font-medium">
                    {o.service}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-neutral-900 text-xs">
                    R$ {o.value.toFixed(2).replace('.', ',')}
                  </td>
                  <td className="py-3.5 px-4">
                    {o.status === 'DONE' && <Badge variant="success">✓ Finalizada</Badge>}
                    {o.status === 'IN_PROGRESS' && <Badge variant="warning">⏳ Em Andamento</Badge>}
                    {o.status === 'OPEN' && <Badge variant="default">Aberta</Badge>}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => setSelectedOrder(o)}
                    >
                      <FileText size={14} className="mr-1" /> Laudo
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Details */}
      {selectedOrder && (
        <Modal
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          title={`Ordem de Serviço - ${selectedOrder.code}`}
          size="md"
        >
          <div className="space-y-4 text-sm">
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-neutral-400">Data de emissão: {selectedOrder.date}</span>
                {selectedOrder.status === 'DONE' ? <Badge variant="success">Concluída</Badge> : <Badge variant="warning">Em aberto</Badge>}
              </div>
              <p className="font-bold text-base text-neutral-900">{selectedOrder.patient}</p>
              <p className="text-xs text-neutral-500">Responsável: {selectedOrder.tutor}</p>
            </div>

            <div className="space-y-2 border border-neutral-100 rounded-xl p-3 text-xs">
              <div className="flex justify-between py-1 border-b border-neutral-50">
                <span className="text-neutral-500">Serviço:</span>
                <span className="font-semibold text-neutral-900">{selectedOrder.service}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-50">
                <span className="text-neutral-500">Valor cobrado:</span>
                <span className="font-bold text-teal-700">R$ {selectedOrder.value.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="pt-2">
                <span className="text-neutral-500 block mb-1 font-semibold">Observações Clínicas:</span>
                <p className="text-neutral-700 bg-neutral-50 p-2.5 rounded-lg">
                  {selectedOrder.notes || 'Sem observações registradas.'}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setSelectedOrder(null)}>Fechar</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

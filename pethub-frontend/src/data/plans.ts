import type { Plan, UserPlan } from '@/types';

export const availablePlans: Plan[] = [
  {
    id: 'plan-1',
    name: 'Plano Banho & Tosa',
    establishmentId: 'est-1',
    establishmentName: 'PetCare Ourinhos',
    price: 89,
    billingCycle: 'monthly',
    benefits: [
      '4 banhos por mês',
      '1 tosa higiênica por mês',
      '10% de desconto em produtos',
      'Agendamento prioritário',
    ],
    servicesIncluded: [
      {
        serviceId: 'svc-1',
        serviceName: 'Banho Simples',
        quantity: 4,
        usedThisMonth: 1,
      },
      {
        serviceId: 'svc-2',
        serviceName: 'Tosa Higiênica',
        quantity: 1,
        usedThisMonth: 0,
      },
    ],
    isActive: true,
    color: 'blue',
    icon: '🛁',
  },
  {
    id: 'plan-2',
    name: 'Plano Premium',
    establishmentId: 'est-1',
    establishmentName: 'PetCare Ourinhos',
    price: 149,
    billingCycle: 'monthly',
    benefits: [
      '4 banhos por mês',
      '2 tosas completas por mês',
      '1 consulta veterinária',
      '15% de desconto em produtos',
      'Agendamento prioritário',
      'Cashback em dobro',
    ],
    servicesIncluded: [
      {
        serviceId: 'svc-1',
        serviceName: 'Banho Simples',
        quantity: 4,
        usedThisMonth: 2,
      },
      {
        serviceId: 'svc-3',
        serviceName: 'Tosa Completa',
        quantity: 2,
        usedThisMonth: 1,
      },
      {
        serviceId: 'svc-6',
        serviceName: 'Consulta Veterinária',
        quantity: 1,
        usedThisMonth: 0,
      },
    ],
    isActive: true,
    color: 'orange',
    icon: '⭐',
  },
  {
    id: 'plan-3',
    name: 'Plano Veterinário',
    establishmentId: 'est-3',
    establishmentName: 'VetLife Clínica Veterinária',
    price: 199,
    billingCycle: 'monthly',
    benefits: [
      '2 consultas veterinárias por mês',
      'Vacinas inclusas no protocolo',
      'Exames de rotina com desconto',
      '20% de desconto em procedimentos',
      'Teleconsulta disponível',
      'Histórico digital do pet',
    ],
    servicesIncluded: [
      {
        serviceId: 'svc-6',
        serviceName: 'Consulta Veterinária',
        quantity: 2,
        usedThisMonth: 0,
      },
      {
        serviceId: 'svc-7',
        serviceName: 'Vacinação',
        quantity: 3,
        usedThisMonth: 0,
      },
    ],
    isActive: true,
    color: 'green',
    icon: '🏥',
  },
];

export const userPlans: UserPlan[] = [
  {
    id: 'uplan-1',
    userId: 'tutor-1',
    planId: 'plan-2',
    plan: availablePlans[1],
    startDate: '2026-08-07',
    nextRenewal: '2026-09-07',
    status: 'active',
  },
];

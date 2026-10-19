import { prisma } from '../lib/prisma';
import { reportsController } from '../controllers/reports.controller';

async function main() {
  const estUser = await prisma.user.findFirst({
    where: { email: 'pethub@gmail.com' },
    include: { establishmentProfile: true }
  });

  if (!estUser) return;

  const mockReq: any = {
    user: { id: estUser.id, role: estUser.role },
    query: {
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      operationType: 'ALL'
    }
  };

  let resData: any = null;
  const mockReply: any = {
    status: (code: number) => {
      console.log('Status:', code);
      return mockReply;
    },
    send: (data: any) => {
      resData = data;
      return mockReply;
    }
  };

  await reportsController.getEstablishmentFinancial(mockReq, mockReply);
  console.log('Financial report result:', JSON.stringify(resData?.summary, null, 2));
  console.log('Cash flow count:', resData?.cashFlow?.length);
  console.log('Transactions count:', resData?.transactions?.length);

  await reportsController.getEstablishmentServices(mockReq, mockReply);
  console.log('Services report summary:', JSON.stringify(resData?.summary, null, 2));
  console.log('Services ranking:', JSON.stringify(resData?.servicesRanking, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());

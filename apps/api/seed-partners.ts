import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const partners = [
    {
      name: 'Pousada Recanto da Natureza',
      category: 'Pousadas',
      description: 'Uma pousada aconchegante no meio da floresta, perfeita para relaxar após um dia de trilha.',
      coverImage: '/uploads/placeholder-pousada.jpg',
      address: 'Rua das Flores, 123',
      city: 'Serra do Mar',
      phone: '11999999999',
      whatsapp: '11999999999',
      instagram: '@recantonatureza',
      website: 'www.recantonatureza.com.br',
      openingHours: 'Recepção 24h',
      status: true,
    },
    {
      name: 'Guia Local João Silva',
      category: 'Guias',
      description: 'Guia especializado em trilhas na Mata Atlântica com foco em observação de aves.',
      coverImage: '',
      address: 'Centro',
      city: 'Serra do Mar',
      phone: '11988888888',
      whatsapp: '11988888888',
      instagram: '@joaosilvaguia',
      website: '',
      openingHours: 'Agendamento prévio',
      status: true,
    },
    {
      name: 'Restaurante Sabor da Terra',
      category: 'Restaurantes',
      description: 'Comida caseira feita no fogão a lenha, utilizando ingredientes locais e orgânicos.',
      coverImage: '',
      address: 'Av. Principal, 456',
      city: 'Serra do Mar',
      phone: '11977777777',
      whatsapp: '11977777777',
      instagram: '@sabordaterra',
      website: '',
      openingHours: 'Terça a Domingo, das 11h às 16h',
      status: true,
    }
  ];

  for (const p of partners) {
    await prisma.partner.create({ data: p });
  }
  console.log('Parceiros criados com sucesso!');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });

import 'dotenv/config';
import { PrismaClient, Role, Difficulty } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. Limpar banco
  await prisma.story.deleteMany({});
  await prisma.feedComment.deleteMany({});
  await prisma.feedLike.deleteMany({});
  await prisma.feedPost.deleteMany({});
  await prisma.libraryContent.deleteMany({});
  await prisma.partnerPhoto.deleteMany({});
  await prisma.partner.deleteMany({});
  await prisma.biodiversityItem.deleteMany({});
  await prisma.qrCode.deleteMany({});
  await prisma.educationalPoint.deleteMany({});
  await prisma.trailPhoto.deleteMany({});
  await prisma.trailLike.deleteMany({});
  await prisma.savedTrail.deleteMany({});
  await prisma.trail.deleteMany({});
  await prisma.schoolFollower.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.school.deleteMany({});

  console.log('Banco de dados limpo.');

  // Hashes de senha
  const hashAdmin = await bcrypt.hash('AdminEcotech123', 10);
  const hashEscola = await bcrypt.hash('EscolaEcotech123', 10);
  const hashProfessor = await bcrypt.hash('ProfessorEcotech123', 10);
  const hashEstudante = await bcrypt.hash('EstudanteEcotech123', 10);

  // 2. Criar Admin Geral
  const admin = await prisma.user.create({
    data: {
      name: 'Administrador Ecotech',
      email: 'admin@ecotech.com',
      password: hashAdmin,
      role: Role.ADMIN,
      status: true,
    },
  });
  console.log('Seeded Admin:', admin.email);

  // 3. Criar Escola
  const school = await prisma.school.create({
    data: {
      name: 'Escola Central do Mangue',
      city: 'Florianópolis',
      location: 'Bairro do Mangue, SC',
      territory: 'Comunidade Costeira',
      responsibleName: 'Diretora Maria',
      email: 'contato@escolamangue.edu.br',
      phone: '48999999999',
      description: 'Escola pioneira em educação ambiental costeira.',
      coverImage: 'https://ecotech-storage.s3.amazonaws.com/schools/escola-capa.jpg',
      status: true,
    },
  });
  console.log('Seeded School:', school.name);

  // 4. Criar Usuários vinculados à Escola
  await prisma.user.create({
    data: {
      name: 'Maria Gestora',
      email: 'escola@ecotech.com',
      password: hashEscola,
      role: Role.SCHOOL_MANAGER,
      schoolId: school.id,
      status: true,
    },
  });

  await prisma.user.create({
    data: {
      name: 'João Professor',
      email: 'professor@ecotech.com',
      password: hashProfessor,
      role: Role.TEACHER,
      schoolId: school.id,
      status: true,
    },
  });

  await prisma.user.create({
    data: {
      name: 'Gabriel Aluno',
      email: 'estudante@ecotech.com',
      password: hashEstudante,
      role: Role.STUDENT,
      schoolId: school.id,
      status: true,
    },
  });
  console.log('Seeded users (Escola, Professor, Estudante)');

  // 5. Criar Trilha exemplo
  const trail = await prisma.trail.create({
    data: {
      schoolId: school.id,
      title: 'Trilha do Mangue Vermelho',
      slug: 'trilha-do-mangue-vermelho',
      shortDescription: 'Explore a rica flora e fauna de transição do manguezal.',
      fullDescription: 'Uma caminhada pedagógica guiada que cruza áreas de transição ecológica...',
      city: 'Florianópolis',
      coverImage: 'https://ecotech-storage.s3.amazonaws.com/trails/mangue-capa.jpg',
      biome: 'Mata Atlântica',
      distanceKm: 1.8,
      duration: '1h 30m',
      difficulty: Difficulty.FACIL,
      wikilocUrl: 'https://www.wikiloc.com/ecotech-trail-example',
      safetyWarnings: 'Levar água, repelente e usar sapatos fechados.',
      status: true,
    },
  });
  console.log('Seeded Trail:', trail.title);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

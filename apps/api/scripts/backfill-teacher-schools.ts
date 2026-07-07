/**
 * One-time backfill: mirror the legacy single-school teacher link
 * (User.schoolId) into the new N:N TeacherSchool table.
 *
 * Safe to re-run (idempotent — upserts on the [teacherId, schoolId] unique).
 * Does NOT touch User.role / User.roleStatus / User.schoolId, so no teacher
 * loses access while the data is migrated. Wrapped in a single transaction.
 *
 * Run (from apps/api):
 *   npx tsx scripts/backfill-teacher-schools.ts
 *   # or: npx ts-node scripts/backfill-teacher-schools.ts
 *
 * Prerequisite: `npx prisma db push` must have created the TeacherSchool table.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    // Approved teachers: role TEACHER with a school -> APROVADO link.
    const approvedTeachers = await prisma.user.findMany({
      where: { role: 'TEACHER', schoolId: { not: null } },
      select: { id: true, schoolId: true },
    });

    // Pending/rejected teacher registrations are stored as role USER with a
    // schoolId while awaiting approval -> mirror their roleStatus.
    const pendingTeachers = await prisma.user.findMany({
      where: { role: 'USER', schoolId: { not: null }, roleStatus: { in: ['PENDENTE', 'REPROVADO'] } },
      select: { id: true, schoolId: true, roleStatus: true },
    });

    const rows = [
      ...approvedTeachers.map((u) => ({ teacherId: u.id, schoolId: u.schoolId as string, status: 'APROVADO' as const })),
      ...pendingTeachers.map((u) => ({ teacherId: u.id, schoolId: u.schoolId as string, status: u.roleStatus as 'PENDENTE' | 'REPROVADO' })),
    ];

    console.log(`Backfilling ${rows.length} teacher link(s) (${approvedTeachers.length} approved, ${pendingTeachers.length} pending/rejected)...`);

    let created = 0;
    let skipped = 0;

    await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        const existing = await tx.teacherSchool.findUnique({
          where: { teacherId_schoolId: { teacherId: row.teacherId, schoolId: row.schoolId } },
        });
        if (existing) {
          skipped++;
          continue;
        }
        await tx.teacherSchool.create({ data: row });
        created++;
      }
    });

    console.log(`Done. Created ${created}, skipped ${skipped} (already existed).`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});

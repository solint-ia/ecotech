-- AlterEnum
ALTER TYPE "PointType" ADD VALUE 'FLORA';

-- DropForeignKey
ALTER TABLE "Trail" DROP CONSTRAINT "Trail_schoolId_fkey";

-- AlterTable
ALTER TABLE "EducationalPoint" ADD COLUMN     "pdfUrl" TEXT;

-- AlterTable
ALTER TABLE "FeedPost" ADD COLUMN     "trailId" TEXT;

-- AlterTable
ALTER TABLE "Trail" ALTER COLUMN "schoolId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Trail" ADD CONSTRAINT "Trail_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedPost" ADD CONSTRAINT "FeedPost_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "Trail"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Trail" ADD COLUMN "createdById" TEXT;

-- AddForeignKey
ALTER TABLE "Trail" ADD CONSTRAINT "Trail_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Trail_createdById_idx" ON "Trail"("createdById");

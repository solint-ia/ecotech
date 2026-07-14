-- Justification an admin must give when rejecting a submission, shown back to
-- its author. Nullable: existing rows (and anything not rejected) carry no reason.

-- AlterTable
ALTER TABLE "Trail" ADD COLUMN     "rejectionReason" TEXT;

-- AlterTable
ALTER TABLE "LibraryContent" ADD COLUMN     "rejectionReason" TEXT;

-- AlterTable
ALTER TABLE "Partner" ADD COLUMN     "rejectionReason" TEXT;

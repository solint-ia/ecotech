-- Enum already exists

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "roleStatus" "ApprovalStatus" NOT NULL DEFAULT 'APROVADO';

-- CreateEnum
CREATE TYPE "VerificationType" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

-- DropForeignKey
ALTER TABLE "BiodiversityItem" DROP CONSTRAINT "BiodiversityItem_trailId_fkey";

-- DropForeignKey
ALTER TABLE "EducationalPoint" DROP CONSTRAINT "EducationalPoint_trailId_fkey";

-- DropForeignKey
ALTER TABLE "QrCode" DROP CONSTRAINT "QrCode_educationalPointId_fkey";

-- DropForeignKey
ALTER TABLE "SavedTrail" DROP CONSTRAINT "SavedTrail_trailId_fkey";

-- DropForeignKey
ALTER TABLE "TrailLike" DROP CONSTRAINT "TrailLike_trailId_fkey";

-- DropForeignKey
ALTER TABLE "TrailPhoto" DROP CONSTRAINT "TrailPhoto_trailId_fkey";

-- AlterTable
ALTER TABLE "FeedComment" ADD COLUMN     "likesCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Partner" ADD COLUMN     "state" TEXT;

-- AlterTable
ALTER TABLE "School" ADD COLUMN     "state" TEXT;

-- AlterTable
ALTER TABLE "Story" ADD COLUMN     "caption" TEXT,
ADD COLUMN     "location" TEXT;

-- AlterTable
ALTER TABLE "Trail" ADD COLUMN     "state" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerified" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "type" "VerificationType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedCommentLike" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedCommentLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryComment" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoryComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_email_token_key" ON "VerificationToken"("email", "token");

-- CreateIndex
CREATE UNIQUE INDEX "FeedCommentLike_commentId_userId_key" ON "FeedCommentLike"("commentId", "userId");

-- AddForeignKey
ALTER TABLE "TrailPhoto" ADD CONSTRAINT "TrailPhoto_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "Trail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrailLike" ADD CONSTRAINT "TrailLike_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "Trail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedTrail" ADD CONSTRAINT "SavedTrail_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "Trail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationalPoint" ADD CONSTRAINT "EducationalPoint_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "Trail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QrCode" ADD CONSTRAINT "QrCode_educationalPointId_fkey" FOREIGN KEY ("educationalPointId") REFERENCES "EducationalPoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BiodiversityItem" ADD CONSTRAINT "BiodiversityItem_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "Trail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedCommentLike" ADD CONSTRAINT "FeedCommentLike_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "FeedComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedCommentLike" ADD CONSTRAINT "FeedCommentLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryComment" ADD CONSTRAINT "StoryComment_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryComment" ADD CONSTRAINT "StoryComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

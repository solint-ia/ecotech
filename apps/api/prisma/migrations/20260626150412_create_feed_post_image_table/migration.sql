/*
  Warnings:

  - You are about to drop the column `mediaUrl` on the `FeedPost` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "FeedPost" DROP COLUMN "mediaUrl";

-- CreateTable
CREATE TABLE "FeedPostImage" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "feedPostId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedPostImage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FeedPostImage" ADD CONSTRAINT "FeedPostImage_feedPostId_fkey" FOREIGN KEY ("feedPostId") REFERENCES "FeedPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "xp" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Contest" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "GameId" TEXT NOT NULL,
    "quizSet" JSONB[],
    "players" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Contest_GameId_key" ON "Contest"("GameId");

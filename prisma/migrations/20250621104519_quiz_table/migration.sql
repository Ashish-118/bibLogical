/*
  Warnings:

  - You are about to drop the column `Level` on the `QuizBank` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `QuizBank` table. All the data in the column will be lost.
  - Added the required column `explanation` to the `QuizBank` table without a default value. This is not possible if the table is not empty.
  - Added the required column `level` to the `QuizBank` table without a default value. This is not possible if the table is not empty.
  - Added the required column `topic` to the `QuizBank` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `QuizBank` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "QuizType" AS ENUM ('mcq', 'true_false', 'order_sequence');

-- AlterTable
ALTER TABLE "QuizBank" DROP COLUMN "Level",
DROP COLUMN "category",
ADD COLUMN     "AiGenerated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "Verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "explanation" TEXT NOT NULL,
ADD COLUMN     "formatHints" TEXT[],
ADD COLUMN     "level" INTEGER NOT NULL,
ADD COLUMN     "topic" TEXT NOT NULL,
ADD COLUMN     "type" "QuizType" NOT NULL,
ADD COLUMN     "useCount" INTEGER NOT NULL DEFAULT 0;

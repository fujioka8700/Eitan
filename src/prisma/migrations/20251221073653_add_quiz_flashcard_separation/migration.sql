-- AlterTable
ALTER TABLE "UserWord" ADD COLUMN     "flashcardLearnedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "quizCorrectCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "quizMistakeCount" INTEGER NOT NULL DEFAULT 0;

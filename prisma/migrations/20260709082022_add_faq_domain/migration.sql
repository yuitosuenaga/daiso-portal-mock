-- CreateEnum
CREATE TYPE "FaqCategory" AS ENUM ('inquiry_method', 'form_input', 'status', 'other');

-- CreateTable
CREATE TABLE "Faq" (
    "id" TEXT NOT NULL,
    "category" "FaqCategory" NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Faq_pkey" PRIMARY KEY ("id")
);

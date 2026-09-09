-- CreateEnum
CREATE TYPE "MonthlyMaterialDepartment" AS ENUM ('seasonalEvent', 'storage', 'kitchen', 'cleaning', 'beautyHealth', 'stationery', 'interior', 'craftDiy', 'food', 'other');

-- AlterTable
ALTER TABLE "MonthlyMaterial" ADD COLUMN "department" "MonthlyMaterialDepartment" NOT NULL DEFAULT 'other';

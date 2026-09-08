-- DropIndex
DROP INDEX "MonthlyMaterial_category_year_month_key";

-- CreateIndex
CREATE INDEX "MonthlyMaterial_category_year_month_idx" ON "MonthlyMaterial"("category", "year", "month");

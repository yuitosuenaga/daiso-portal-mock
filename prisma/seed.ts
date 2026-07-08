import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SEED_PASSWORD = "password1234";

async function main() {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  const company = await prisma.company.upsert({
    where: { companyCode: "vn-daiso-vietnam" },
    update: {},
    create: {
      name: "Daiso Vietnam Co., Ltd.",
      country: "VN",
      companyCode: "vn-daiso-vietnam",
    },
  });

  const applicantUser = await prisma.applicantUser.upsert({
    where: { email: "applicant@daiso-vietnam.example.com" },
    update: {},
    create: {
      email: "applicant@daiso-vietnam.example.com",
      passwordHash,
      displayName: "Nguyen Van A",
      companyId: company.id,
    },
  });

  const helpdeskStaff = await prisma.helpdeskStaff.upsert({
    where: { email: "staff@helpdesk.example.com" },
    update: {},
    create: {
      email: "staff@helpdesk.example.com",
      passwordHash,
      displayName: "田中 太郎",
    },
  });

  const inquiry = await prisma.inquiry.upsert({
    where: { id: "seed-inquiry-001" },
    update: {},
    create: {
      id: "seed-inquiry-001",
      category: "defect",
      urgency: "high",
      storeRegion: "Ho Chi Minh City",
      originalText: "納品された商品に破損が見られます。至急対応をお願いします。",
      originalLanguage: "ja",
      status: "new",
      companyId: company.id,
      submittedByCompanyName: company.name,
      submittedByCountry: company.country,
    },
  });

  console.log("Seed complete:", {
    company: company.companyCode,
    applicantUser: applicantUser.email,
    helpdeskStaff: helpdeskStaff.email,
    inquiry: inquiry.id,
  });
  console.log(`Seed password for both accounts: ${SEED_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import "server-only";

import type { Document as PrismaDocument } from "@prisma/client";

import type { Document, DocumentTargeting } from "@/types/document";

export function mapTargeting(record: PrismaDocument): DocumentTargeting {
  if (record.targetingScope === "countries") {
    return { scope: "countries", countries: record.targetingCountries };
  }
  if (record.targetingScope === "companies") {
    return { scope: "companies", companyCodes: record.targetingCompanyCodes };
  }
  return { scope: "all" };
}

export function targetingToColumns(targeting: DocumentTargeting): {
  targetingScope: "all" | "countries" | "companies";
  targetingCountries: string[];
  targetingCompanyCodes: string[];
} {
  if (targeting.scope === "countries") {
    return {
      targetingScope: "countries",
      targetingCountries: targeting.countries,
      targetingCompanyCodes: [],
    };
  }
  if (targeting.scope === "companies") {
    return {
      targetingScope: "companies",
      targetingCountries: [],
      targetingCompanyCodes: targeting.companyCodes,
    };
  }
  return { targetingScope: "all", targetingCountries: [], targetingCompanyCodes: [] };
}

export function mapDocument(record: PrismaDocument): Document {
  return {
    id: record.id,
    title: record.title,
    description: record.description ?? undefined,
    fileName: record.fileName,
    fileType: "application/pdf",
    fileSize: record.fileSize,
    dataUrl: record.dataUrl,
    targeting: mapTargeting(record),
    uploadedAt: record.uploadedAt.toISOString(),
  };
}

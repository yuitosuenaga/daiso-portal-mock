import { createPageMetadata } from "@/lib/page-metadata";
import { logLoadFailure } from "@/lib/server/load-failure";
import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { InquiryForm } from "@/components/features/inquiry-form/InquiryForm";
import { listCompaniesForHelpdesk } from "@/lib/server/company-service";

export const generateMetadata = createPageMetadata("inquiryForm", "title");

export default async function HelpdeskInquiryNewPage() {
  const t = await getTranslations("inquiryForm");

  let companies;
  try {
    companies = await listCompaniesForHelpdesk();
  } catch (error) {
    logLoadFailure("HelpdeskInquiryNewPage", error);
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">{t("loadError")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <InquiryForm
      listHref="/helpdesk/inquiries"
      mode="helpdeskProxy"
      companies={companies}
    />
  );
}

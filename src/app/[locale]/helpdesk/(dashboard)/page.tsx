import { Suspense } from "react";
import {
  Bell,
  Building2,
  FilePlus,
  FileText,
  FolderOpen,
  HelpCircle,
  Link2,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

import { InquiryListCard } from "@/components/features/dashboard/InquiryListCard";
import { NavigationCard } from "@/components/features/dashboard/NavigationCard";
import { NavigationCardSkeleton } from "@/components/features/dashboard/NavigationCardSkeleton";
import {
  PriorityInquiriesPreviewPanel,
  PriorityInquiriesPreviewPanelSkeleton,
} from "@/components/features/dashboard/PriorityInquiriesPreviewPanel";
import {
  UnresolvedInquiriesKpiPanel,
  UnresolvedInquiriesKpiPanelSkeleton,
} from "@/components/features/dashboard/UnresolvedInquiriesKpiPanel";

export default async function HelpdeskHomePage() {
  const t = await getTranslations("helpdeskDashboard");
  const nav = await getTranslations("helpdeskNav");

  return (
    <div className="space-y-6">
      <Suspense fallback={<UnresolvedInquiriesKpiPanelSkeleton />}>
        <UnresolvedInquiriesKpiPanel viewAllHref="/helpdesk/inquiries" />
      </Suspense>

      <Suspense fallback={<PriorityInquiriesPreviewPanelSkeleton />}>
        <PriorityInquiriesPreviewPanel viewAllHref="/helpdesk/inquiries" />
      </Suspense>

      <section aria-labelledby="helpdesk-dashboard-support-heading">
        <h2
          id="helpdesk-dashboard-support-heading"
          className="mb-3 text-xl font-semibold"
        >
          {t("sections.support")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Suspense fallback={<NavigationCardSkeleton />}>
            <InquiryListCard
              scope="all"
              href="/helpdesk/inquiries"
              titleKey="helpdeskNav.inquiries"
              descriptionKey="helpdeskDashboard.inquiries.description"
            />
          </Suspense>
          <NavigationCard
            title={nav("templates")}
            description={t("templates.description")}
            href="/helpdesk/templates"
            icon={FileText}
          />
          <NavigationCard
            title={nav("announcements")}
            description={t("announcements.description")}
            href="/helpdesk/announcements"
            icon={Bell}
          />
          <NavigationCard
            title={nav("documents")}
            description={t("documents.description")}
            href="/helpdesk/documents"
            icon={FolderOpen}
          />
          <NavigationCard
            title={nav("inquiryForm")}
            description={t("inquiryForm.description")}
            href="/helpdesk/inquiry/new"
            icon={FilePlus}
          />
          <NavigationCard
            title={nav("companies")}
            description={t("companies.description")}
            href="/helpdesk/companies"
            icon={Building2}
          />
        </div>
      </section>

      <section aria-labelledby="helpdesk-dashboard-reference-heading">
        <h2
          id="helpdesk-dashboard-reference-heading"
          className="mb-3 text-xl font-semibold"
        >
          {t("sections.reference")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <NavigationCard
            title={nav("links")}
            description={t("links.description")}
            href="/helpdesk/links"
            icon={Link2}
          />
          <NavigationCard
            title={nav("faq")}
            description={t("faq.description")}
            href="/helpdesk/faq"
            icon={HelpCircle}
          />
        </div>
      </section>
    </div>
  );
}

import { Suspense } from "react";
import { Bell, FilePlus, FileText, HelpCircle, Link2 } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { InquiryListCard } from "@/components/features/dashboard/InquiryListCard";
import { NavigationCard } from "@/components/features/dashboard/NavigationCard";
import { NavigationCardSkeleton } from "@/components/features/dashboard/NavigationCardSkeleton";

export default async function HelpdeskHomePage() {
  const t = await getTranslations("helpdeskDashboard");

  return (
    <div className="max-w-6xl space-y-8">
      <section aria-labelledby="helpdesk-dashboard-support-heading">
        <h2
          id="helpdesk-dashboard-support-heading"
          className="mb-4 text-lg font-semibold"
        >
          {t("sections.support")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Suspense fallback={<NavigationCardSkeleton />}>
            <InquiryListCard
              scope="all"
              href="/helpdesk/inquiries"
              titleKey="helpdeskDashboard.inquiries.title"
              descriptionKey="helpdeskDashboard.inquiries.description"
            />
          </Suspense>
          <NavigationCard
            title={t("templates.title")}
            description={t("templates.description")}
            href="/helpdesk/templates"
            icon={FileText}
          />
          <NavigationCard
            title={t("announcements.title")}
            description={t("announcements.description")}
            href="/helpdesk/announcements"
            icon={Bell}
          />
        </div>
      </section>

      <section aria-labelledby="helpdesk-dashboard-reference-heading">
        <h2
          id="helpdesk-dashboard-reference-heading"
          className="mb-4 text-lg font-semibold"
        >
          {t("sections.reference")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <NavigationCard
            title={t("inquiryForm.title")}
            description={t("inquiryForm.description")}
            href="/inquiry/new"
            icon={FilePlus}
          />
          <NavigationCard
            title={t("links.title")}
            description={t("links.description")}
            href="/helpdesk/links"
            icon={Link2}
          />
          <NavigationCard
            title={t("faq.title")}
            description={t("faq.description")}
            href="/helpdesk/faq"
            icon={HelpCircle}
          />
        </div>
      </section>
    </div>
  );
}

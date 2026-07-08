import { Suspense } from "react";
import { FilePlus, FolderOpen, HelpCircle, Link2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { NavigationCard } from "@/components/features/dashboard/NavigationCard";
import { NavigationCardSkeleton } from "@/components/features/dashboard/NavigationCardSkeleton";
import { InquiryListCard } from "@/components/features/dashboard/InquiryListCard";
import { AnnouncementsCard } from "@/components/features/dashboard/AnnouncementsCard";
import {
  AnnouncementsPreviewPanel,
  AnnouncementsPreviewPanelSkeleton,
} from "@/components/features/dashboard/AnnouncementsPreviewPanel";
import { ReminderAnnouncementsPanel } from "@/components/features/dashboard/ReminderAnnouncementsPanel";

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");

  return (
    <div className="max-w-6xl space-y-6">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <NavigationCard
          title={t("inquiryForm.title")}
          description={t("inquiryForm.description")}
          href="/inquiry/new"
          icon={FilePlus}
        />
        <Suspense fallback={<NavigationCardSkeleton />}>
          <InquiryListCard
            scope="own"
            href="/inquiry"
            titleKey="dashboard.inquiryList.title"
            descriptionKey="dashboard.inquiryList.description"
          />
        </Suspense>
        <Suspense fallback={<NavigationCardSkeleton />}>
          <AnnouncementsCard
            href="/announcements"
            titleKey="dashboard.announcements.title"
            descriptionKey="dashboard.announcements.description"
          />
        </Suspense>
        <NavigationCard
          title={t("documents.title")}
          description={t("documents.description")}
          href="/documents"
          icon={FolderOpen}
        />
        <NavigationCard
          title={t("links.title")}
          description={t("links.description")}
          href="/links"
          icon={Link2}
        />
        <NavigationCard
          title={t("faq.title")}
          description={t("faq.description")}
          href="/faq"
          icon={HelpCircle}
        />
      </div>
      <Suspense fallback={null}>
        <ReminderAnnouncementsPanel />
      </Suspense>
      <Suspense fallback={<AnnouncementsPreviewPanelSkeleton />}>
        <AnnouncementsPreviewPanel viewAllHref="/announcements" />
      </Suspense>
    </div>
  );
}

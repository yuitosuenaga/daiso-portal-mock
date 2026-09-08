import { Suspense } from "react";
import {
  BookOpen,
  FilePlus,
  FolderOpen,
  HelpCircle,
  Link2,
  Tags,
  Video,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { NavigationCard } from "@/components/features/dashboard/NavigationCard";
import { NavigationCardSkeleton } from "@/components/features/dashboard/NavigationCardSkeleton";
import { InquiryListCard } from "@/components/features/dashboard/InquiryListCard";
import {
  AnnouncementsPreviewPanel,
  AnnouncementsPreviewPanelSkeleton,
} from "@/components/features/dashboard/AnnouncementsPreviewPanel";
import { ReminderAnnouncementsPanel } from "@/components/features/dashboard/ReminderAnnouncementsPanel";

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");

  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <ReminderAnnouncementsPanel />
      </Suspense>
      <Suspense fallback={<AnnouncementsPreviewPanelSkeleton />}>
        <AnnouncementsPreviewPanel viewAllHref="/announcements" />
      </Suspense>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <NavigationCard
          title={t("documents.title")}
          description={t("documents.description")}
          href="/documents"
          icon={FolderOpen}
        />
        <NavigationCard
          title={t("salesFloorMeeting.title")}
          description={t("salesFloorMeeting.description")}
          href="/sales-floor-meeting"
          icon={Video}
        />
        <NavigationCard
          title={t("inquiryForm.title")}
          description={t("inquiryForm.description")}
          href="/inquiry/new"
          icon={FilePlus}
        />
        <NavigationCard
          title={t("manuals.title")}
          description={t("manuals.description")}
          href="/documents"
          icon={BookOpen}
        />
        <NavigationCard
          title={t("pop.title")}
          description={t("pop.description")}
          href="/pop"
          icon={Tags}
        />
        <Suspense fallback={<NavigationCardSkeleton />}>
          <InquiryListCard
            scope="own"
            href="/inquiry"
            titleKey="dashboard.inquiryList.title"
            descriptionKey="dashboard.inquiryList.description"
          />
        </Suspense>
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
    </div>
  );
}

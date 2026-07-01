import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  AnnouncementWidget,
  AnnouncementWidgetSkeleton,
} from "@/components/features/dashboard/AnnouncementWidget";
import {
  InquiryStatusWidget,
  InquiryStatusWidgetSkeleton,
} from "@/components/features/dashboard/InquiryStatusWidget";

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="grid gap-6 md:grid-cols-2">
        <Suspense fallback={<AnnouncementWidgetSkeleton />}>
          <AnnouncementWidget />
        </Suspense>
        <Suspense fallback={<InquiryStatusWidgetSkeleton />}>
          <InquiryStatusWidget />
        </Suspense>
      </div>

      <div>
        <Link
          href="/inquiry/new"
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          {t("cta")}
        </Link>
      </div>
    </div>
  );
}

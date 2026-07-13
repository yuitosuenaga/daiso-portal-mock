import { Suspense } from "react";
import { LinkList, LinkListSkeleton } from "@/components/features/links/LinkList";

export default function HelpdeskLinksPage() {
  return (
    <div className="w-full">
      <Suspense fallback={<LinkListSkeleton />}>
        <LinkList />
      </Suspense>
    </div>
  );
}

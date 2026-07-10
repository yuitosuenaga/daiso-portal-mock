import { Suspense } from "react";
import { LinkList, LinkListSkeleton } from "@/components/features/links/LinkList";

export default function LinksPage() {
  return (
    <div className="w-full">
      <Suspense fallback={<LinkListSkeleton />}>
        <LinkList />
      </Suspense>
    </div>
  );
}

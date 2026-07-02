import { Suspense } from "react";
import { LinkList, LinkListSkeleton } from "@/components/features/links/LinkList";

export default function LinksPage() {
  return (
    <div className="max-w-5xl">
      <Suspense fallback={<LinkListSkeleton />}>
        <LinkList />
      </Suspense>
    </div>
  );
}

import { createPageMetadata } from "@/lib/page-metadata";
import { Suspense } from "react";
import { LinkList, LinkListSkeleton } from "@/components/features/links/LinkList";

export const generateMetadata = createPageMetadata("links", "list.title");

export default function LinksPage() {
  return (
    <div className="w-full">
      <Suspense fallback={<LinkListSkeleton />}>
        <LinkList />
      </Suspense>
    </div>
  );
}

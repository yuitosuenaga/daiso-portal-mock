import { createPageMetadata } from "@/lib/page-metadata";
import { InquiryForm } from "@/components/features/inquiry-form/InquiryForm";

export const generateMetadata = createPageMetadata("inquiryForm", "title");

export default function InquiryNewPage() {
  return <InquiryForm />;
}

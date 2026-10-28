import { createPageMetadata } from "@/lib/page-metadata";
import { CompanyDetail } from "@/components/features/helpdesk-companies/CompanyDetail";

type HelpdeskCompanyDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const generateMetadata = createPageMetadata("helpdeskCompanies", "list.title");

export default async function HelpdeskCompanyDetailPage(props: HelpdeskCompanyDetailPageProps) {
  const params = await props.params;
  return (
    <div className="w-full">
      <CompanyDetail companyId={params.id} />
    </div>
  );
}

import { CompanyDetail } from "@/components/features/helpdesk-companies/CompanyDetail";

type HelpdeskCompanyDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function HelpdeskCompanyDetailPage(props: HelpdeskCompanyDetailPageProps) {
  const params = await props.params;
  return (
    <div className="w-full">
      <CompanyDetail companyId={params.id} />
    </div>
  );
}

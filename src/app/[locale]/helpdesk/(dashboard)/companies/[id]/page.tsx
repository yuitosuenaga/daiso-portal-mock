import { CompanyDetail } from "@/components/features/helpdesk-companies/CompanyDetail";

type HelpdeskCompanyDetailPageProps = {
  params: {
    id: string;
  };
};

export default function HelpdeskCompanyDetailPage({
  params,
}: HelpdeskCompanyDetailPageProps) {
  return (
    <div className="w-full">
      <CompanyDetail companyId={params.id} />
    </div>
  );
}

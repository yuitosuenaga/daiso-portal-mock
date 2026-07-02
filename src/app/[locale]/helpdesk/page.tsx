import { getTranslations } from "next-intl/server";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default async function HelpdeskHomePage() {
  const t = await getTranslations("helpdeskHome");

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </CardContent>
    </Card>
  );
}

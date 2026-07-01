import { getTranslations } from "next-intl/server";

interface PlaceholderPageProps {
  titleKey: string;
}

export async function PlaceholderPage({ titleKey }: PlaceholderPageProps) {
  const tNav = await getTranslations("nav");
  const tCommon = await getTranslations("common");

  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
      <h1 className="text-2xl font-semibold text-foreground mb-2">
        {tNav(titleKey as Parameters<typeof tNav>[0])}
      </h1>
      <p className="text-muted-foreground">{tCommon("comingSoon")}</p>
    </div>
  );
}

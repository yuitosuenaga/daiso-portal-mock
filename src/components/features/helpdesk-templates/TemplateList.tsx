import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getReplyTemplates } from "@/lib/api/reply-templates";
import { INQUIRY_CATEGORY_CODES } from "@/lib/constants/inquiry-options";
import type { ReplyTemplate } from "@/types/reply-template";

export async function TemplateList() {
  const [t, tCategories] = await Promise.all([
    getTranslations("helpdeskTemplates.list"),
    getTranslations("inquiryForm.options.category"),
  ]);

  const heading = (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("description")}
        </p>
      </div>
      <Link
        href="/helpdesk/templates/new"
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        {t("addButton")}
      </Link>
    </div>
  );

  const templates = await getReplyTemplates();

  if (templates.length === 0) {
    return (
      <div>
        {heading}
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const templatesByCategory = INQUIRY_CATEGORY_CODES.map((category) => ({
    category,
    templates: templates.filter(
      (template: ReplyTemplate) => template.category === category
    ),
  }));

  return (
    <div>
      {heading}
      <div className="space-y-4">
        {templatesByCategory.map(({ category, templates: categoryTemplates }) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="text-base">
                {tCategories(category)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {categoryTemplates.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("empty")}</p>
              ) : (
                <ul className="divide-y divide-border">
                  {categoryTemplates.map((template) => (
                    <li
                      key={template.id}
                      className="flex items-start justify-between gap-4 py-3"
                    >
                      <p className="flex-1 text-sm">{template.body}</p>
                      <Link
                        href={`/helpdesk/templates/${template.id}/edit`}
                        className="text-sm text-primary underline-offset-4 hover:underline"
                      >
                        {t("editLink")}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function TemplateListSkeleton() {
  return (
    <div>
      <div className="mb-6 space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

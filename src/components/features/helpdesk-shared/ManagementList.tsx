import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * ヘルプデスク管理画面（ドキュメント・FAQ・リンク・お知らせ）の一覧系コンポーネントが
 * 共通して使う見た目のシェル。データ形状はドメインごとに大きく異なるため、
 * 行の中身（`ManagementListRow`の子要素）は各ドメイン側が持つ。
 */

interface ManagementListHeadingProps {
  title: string;
  description: string;
  addHref: string;
  addLabel: string;
}

export function ManagementListHeading({
  title,
  description,
  addHref,
  addLabel,
}: ManagementListHeadingProps) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <Link
        href={addHref}
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        {addLabel}
      </Link>
    </div>
  );
}

/** データ取得エラー・0件のときに表示するメッセージ用Card。 */
export function ManagementListMessageCard({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}

interface ManagementListCardProps {
  title: string;
  children: React.ReactNode;
}

/** 一覧本体を包む`CardHeader > CardTitle` + `CardContent`のラッパー。 */
export function ManagementListCard({ title, children }: ManagementListCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function ManagementListRows({ children }: { children: React.ReactNode }) {
  return <ul className="divide-y divide-border">{children}</ul>;
}

interface ManagementListRowProps {
  children: React.ReactNode;
}

export function ManagementListRow({ children }: ManagementListRowProps) {
  return <li className="flex items-start justify-between gap-4 py-3">{children}</li>;
}

/** 見出し・一覧本体のスケルトン表示。全ドメイン共通。 */
export function ManagementListSkeleton() {
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
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    </div>
  );
}

import { splitTextWithLinks } from "@/lib/linkify";

/**
 * 本文中の`http`/`https`のURLをクリック可能なリンクとして表示する。URL以外の部分は
 * 通常テキストのまま出力する（HTMLとしては解釈しない）。リンクは新規タブで開き、
 * `rel="noopener noreferrer"`を付与する。
 */
export function LinkifiedText({ text }: { text: string }) {
  return (
    <>
      {splitTextWithLinks(text).map((segment, index) =>
        segment.type === "link" ? (
          <a
            key={index}
            href={segment.value}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-primary underline underline-offset-4 hover:opacity-80"
          >
            {segment.value}
          </a>
        ) : (
          segment.value
        )
      )}
    </>
  );
}

export type LinkifiedSegment =
  | { type: "text"; value: string }
  | { type: "link"; value: string };

/**
 * `http://`・`https://`で始まるURL候補。URLに使える半角ASCII文字のみを対象とし、
 * 直後に続く全角文字（日本語の助詞等）はURLに含めない。
 */
const URL_CANDIDATE_PATTERN = /https?:\/\/[A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]+/g;

/** 文章中のURL直後に付く句読点・閉じ括弧は、URLの一部とみなさず除外する。 */
const TRAILING_PUNCTUATION_PATTERN = /[.,;:!?'")\]]+$/;

function isSafeHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * 本文を、通常テキストと`http`/`https`のURLに分割する。改行・空白は元の文字列のまま保持する。
 * URLとして解釈できない候補（`http://`のみ等）や`http`/`https`以外は通常テキストとして扱う。
 */
export function splitTextWithLinks(text: string): LinkifiedSegment[] {
  const segments: LinkifiedSegment[] = [];
  let cursor = 0;

  const pushText = (value: string) => {
    if (value === "") {
      return;
    }
    const last = segments[segments.length - 1];
    if (last?.type === "text") {
      last.value += value;
    } else {
      segments.push({ type: "text", value });
    }
  };

  for (const match of Array.from(text.matchAll(URL_CANDIDATE_PATTERN))) {
    const start = match.index ?? 0;
    const candidate = match[0];
    const url = candidate.replace(TRAILING_PUNCTUATION_PATTERN, "");

    pushText(text.slice(cursor, start));
    if (isSafeHttpUrl(url)) {
      segments.push({ type: "link", value: url });
      pushText(candidate.slice(url.length));
    } else {
      pushText(candidate);
    }
    cursor = start + candidate.length;
  }

  pushText(text.slice(cursor));
  return segments;
}

import "server-only";

import nodemailer from "nodemailer";

/**
 * SMTP接続情報が環境変数で構成されていない場合に送出するエラー。
 * 呼び出し元（`announcement-notifications.ts`）はこの例外を検知し、送信結果を
 * `skipped`として履歴に記録する（ローカル開発・テスト環境でSMTP資格情報を必須にしない）。
 */
export class MailerNotConfiguredError extends Error {
  constructor() {
    super("Mailer is not configured: SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM is missing");
    this.name = "MailerNotConfiguredError";
  }
}

export interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
}

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

/**
 * 環境変数からSMTP接続情報を読み取る。1つでも未設定の場合はnullを返す
 * （呼び出し元が`MailerNotConfiguredError`をthrowする判断に使う）。
 */
function readSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !port || !user || !pass || !from) {
    return null;
  }

  const parsedPort = Number(port);
  if (Number.isNaN(parsedPort)) {
    return null;
  }

  return { host, port: parsedPort, user, pass, from };
}

/**
 * SMTP経由でメールを送信する。`SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`/`SMTP_FROM`
 * のいずれかが未設定の場合は実際の送信を行わず`MailerNotConfiguredError`をthrowする
 * （ローカル開発・テスト環境でSMTP資格情報を必須にしないための安全なフォールバック）。
 * 送信失敗時（SMTPエラー等）は例外をそのままthrowし、呼び出し元が捕捉する。
 */
export async function sendMail(options: SendMailOptions): Promise<void> {
  const config = readSmtpConfig();
  if (!config) {
    console.warn(
      `[mailer] SMTP is not configured. Skipping mail to ${options.to} (subject: ${options.subject}).`
    );
    throw new MailerNotConfiguredError();
  }

  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    auth: { user: config.user, pass: config.pass },
  });

  await transport.sendMail({
    from: config.from,
    to: options.to,
    subject: options.subject,
    text: options.text,
  });
}

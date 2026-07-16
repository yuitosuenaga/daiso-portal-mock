import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const { sendMailMock, createTransportMock } = vi.hoisted(() => {
  const sendMailMock = vi.fn();
  const createTransportMock = vi.fn(() => ({ sendMail: sendMailMock }));
  return { sendMailMock, createTransportMock };
});

vi.mock("nodemailer", () => ({
  default: {
    createTransport: createTransportMock,
  },
}));

import { MailerNotConfiguredError, sendMail } from "@/lib/server/mailer";

const SMTP_ENV_KEYS = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"] as const;

function setSmtpEnv() {
  process.env.SMTP_HOST = "smtp.example.com";
  process.env.SMTP_PORT = "587";
  process.env.SMTP_USER = "user";
  process.env.SMTP_PASS = "pass";
  process.env.SMTP_FROM = "noreply@example.com";
}

function clearSmtpEnv() {
  for (const key of SMTP_ENV_KEYS) {
    delete process.env[key];
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  clearSmtpEnv();
});

afterEach(() => {
  clearSmtpEnv();
});

describe("sendMail", () => {
  it("SMTP環境変数が1つでも未設定の場合はMailerNotConfiguredErrorをthrowし、実際の送信は行わない", async () => {
    setSmtpEnv();
    delete process.env.SMTP_PASS;

    await expect(
      sendMail({ to: "user@example.com", subject: "subject", text: "text" })
    ).rejects.toThrow(MailerNotConfiguredError);

    expect(createTransportMock).not.toHaveBeenCalled();
  });

  it("SMTP環境変数が全て未設定の場合もMailerNotConfiguredErrorをthrowする", async () => {
    await expect(
      sendMail({ to: "user@example.com", subject: "subject", text: "text" })
    ).rejects.toThrow(MailerNotConfiguredError);
  });

  it("SMTP環境変数が全て設定されている場合はトランスポートを構成して送信する", async () => {
    setSmtpEnv();
    sendMailMock.mockResolvedValue(undefined);

    await sendMail({ to: "user@example.com", subject: "subject", text: "text" });

    expect(createTransportMock).toHaveBeenCalledWith({
      host: "smtp.example.com",
      port: 587,
      auth: { user: "user", pass: "pass" },
    });
    expect(sendMailMock).toHaveBeenCalledWith({
      from: "noreply@example.com",
      to: "user@example.com",
      subject: "subject",
      text: "text",
    });
  });

  it("送信自体が失敗した場合は例外をそのままthrowする", async () => {
    setSmtpEnv();
    sendMailMock.mockRejectedValue(new Error("SMTP connection failed"));

    await expect(
      sendMail({ to: "user@example.com", subject: "subject", text: "text" })
    ).rejects.toThrow("SMTP connection failed");
  });
});

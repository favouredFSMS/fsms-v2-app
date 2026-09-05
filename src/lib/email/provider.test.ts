import { describe, expect, it, vi } from "vitest";
import { NoopEmailProvider, getEmailProvider, type EmailMessage } from "./provider";

describe("Email Provider", () => {
  const message: EmailMessage = {
    to: "test@example.com",
    subject: "Welcome",
    html: "<p>Welcome to FSMS V2</p>",
    text: "Welcome to FSMS V2",
    template: "welcome",
  };

  it("NoopEmailProvider logs and returns null", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const provider = new NoopEmailProvider();
    const result = await provider.send(message);

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith("[email:noop]", "welcome", "→", "test@example.com");
    consoleSpy.mockRestore();
  });

  it("getEmailProvider returns NoopEmailProvider when RESEND_API_KEY is not set", () => {
    const provider = getEmailProvider();
    expect(provider).toBeInstanceOf(NoopEmailProvider);
  });
});

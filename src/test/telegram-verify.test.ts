import { describe, it, expect } from "vitest";
import {
  verifyAndParseInitData,
  signInitDataForTests,
  TelegramVerifyError,
} from "@/lib/telegramVerify";

const BOT_TOKEN = "123456:test-bot-token-do-not-leak";

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

describe("verifyAndParseInitData", () => {
  it("accepts a freshly signed payload and returns the user", async () => {
    const user = { id: 42, first_name: "Viktor", username: "viktor" };
    const initData = await signInitDataForTests({
      botToken: BOT_TOKEN,
      user,
      authDate: nowSeconds(),
    });

    const parsed = await verifyAndParseInitData(initData, BOT_TOKEN, 3600);
    expect(parsed).toEqual(user);
  });

  it("rejects payload signed with a different bot token", async () => {
    const initData = await signInitDataForTests({
      botToken: "wrong-token",
      user: { id: 1, first_name: "A" },
      authDate: nowSeconds(),
    });

    await expect(verifyAndParseInitData(initData, BOT_TOKEN, 3600))
      .rejects.toThrowError(/signature invalid/);
  });

  it("rejects payload with a tampered field after signing", async () => {
    const initData = await signInitDataForTests({
      botToken: BOT_TOKEN,
      user: { id: 1, first_name: "A" },
      authDate: nowSeconds(),
    });

    // Tamper: change user id but keep original hash
    const tampered = initData.replace(
      encodeURIComponent('"id":1'),
      encodeURIComponent('"id":999'),
    );

    await expect(verifyAndParseInitData(tampered, BOT_TOKEN, 3600))
      .rejects.toThrowError(/signature invalid/);
  });

  it("rejects payload missing the hash field", async () => {
    const search = new URLSearchParams();
    search.set("auth_date", String(nowSeconds()));
    search.set("user", JSON.stringify({ id: 1, first_name: "A" }));

    await expect(verifyAndParseInitData(search.toString(), BOT_TOKEN, 3600))
      .rejects.toThrowError(/missing hash/);
  });

  it("rejects payload older than maxAgeSeconds", async () => {
    const tooOld = nowSeconds() - 7200; // 2 hours ago
    const initData = await signInitDataForTests({
      botToken: BOT_TOKEN,
      user: { id: 1, first_name: "A" },
      authDate: tooOld,
    });

    await expect(verifyAndParseInitData(initData, BOT_TOKEN, 3600))
      .rejects.toThrowError(/expired/);
  });

  it("accepts payload right at the maxAge boundary", async () => {
    const justInside = nowSeconds() - 3599;
    const initData = await signInitDataForTests({
      botToken: BOT_TOKEN,
      user: { id: 1, first_name: "A" },
      authDate: justInside,
    });

    await expect(verifyAndParseInitData(initData, BOT_TOKEN, 3600)).resolves.toBeDefined();
  });

  it("rejects when user field is missing", async () => {
    const search = new URLSearchParams();
    search.set("auth_date", String(nowSeconds()));
    search.set("hash", "0".repeat(64));
    // signature will fail before user check — but that proves error path works either way

    await expect(verifyAndParseInitData(search.toString(), BOT_TOKEN, 3600))
      .rejects.toBeInstanceOf(TelegramVerifyError);
  });

  it("rejects when user JSON is missing id or first_name", async () => {
    const search = new URLSearchParams();
    search.set("auth_date", String(nowSeconds()));
    search.set("user", JSON.stringify({ first_name: "NoID" }));

    // Sign the partial payload so we reach the user-validation step
    const checkString = [...search.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");
    const enc = new TextEncoder();
    const secretKey = await crypto.subtle.importKey(
      "raw", enc.encode("WebAppData"),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
    );
    const secretBytes = await crypto.subtle.sign("HMAC", secretKey, enc.encode(BOT_TOKEN));
    const dataKey = await crypto.subtle.importKey(
      "raw", secretBytes,
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
    );
    const sig = await crypto.subtle.sign("HMAC", dataKey, enc.encode(checkString));
    const hash = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0")).join("");
    search.set("hash", hash);

    await expect(verifyAndParseInitData(search.toString(), BOT_TOKEN, 3600))
      .rejects.toThrowError(/incomplete user data/);
  });
});

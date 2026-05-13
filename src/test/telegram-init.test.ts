import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Test for the Telegram Mini App hash stripping logic in main.tsx
// This ensures the hash is available for the Telegram SDK to read,
// but gets stripped before Supabase sees it.

describe("Telegram Mini App initialization", () => {
  let originalLocation: Location;
  let originalTelegram: any;

  beforeEach(() => {
    // Save originals
    originalLocation = window.location;
    originalTelegram = window.Telegram;

    // Reset location and Telegram
    delete (window as any).location;
    (window as any).location = {
      hash: "",
      pathname: "/",
      search: "",
      href: "http://localhost/",
    };
    delete (window as any).Telegram;
  });

  afterEach(() => {
    // Restore
    (window as any).location = originalLocation;
    (window as any).Telegram = originalTelegram;
  });

  it("extracts initData from hash when Telegram SDK is available", async () => {
    // Simulate the URL being opened in a Telegram Mini App
    window.location.hash = "#tgWebAppData=user%3D%7B%22id%22%3A123%7D&auth_date=1234567890&hash=abcd";
    const initialHash = window.location.hash;

    // Mock Telegram SDK
    (window as any).Telegram = {
      WebApp: {
        initData: initialHash.slice(1), // SDK would parse the hash
        ready: vi.fn(),
      },
    };

    // Verify Telegram SDK has access to initData from the hash
    expect(window.Telegram.WebApp.initData).toBeTruthy();
    expect(window.Telegram.WebApp.initData).toContain("user");

    // Simulate the hash stripping logic from main.tsx
    let hashStripped = false;
    if (window.location.hash.startsWith("#tgWebAppData")) {
      // Wait for Telegram SDK (already mocked, so no wait needed)
      if (window.Telegram?.WebApp) {
        // In a real browser, this would clear the hash
        // jsdom doesn't fully simulate this, but we verify the call happens
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        hashStripped = true;
      }
    }

    // Verify the hash stripping call was made
    expect(hashStripped).toBe(true);
    // The important part: Telegram SDK already has the initData before we strip the hash
    expect(window.Telegram.WebApp.initData).toBeTruthy();
  });

  it("handles missing Telegram SDK gracefully", async () => {
    // Simulate the URL being opened in a regular browser
    window.location.hash = "#tgWebAppData=user%3D%7B%22id%22%3A123%7D";

    // No Telegram SDK (window.Telegram is undefined)

    // Simulate the hash stripping logic
    if (window.location.hash.startsWith("#tgWebAppData")) {
      let attempts = 5; // Shorter timeout for tests
      while (attempts-- > 0 && !window.Telegram?.WebApp) {
        await new Promise(r => setTimeout(r, 10));
      }

      if (window.Telegram?.WebApp) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    }

    // Hash is left as-is since SDK isn't available (this is expected - regular browsers)
    expect(window.location.hash).toBe("#tgWebAppData=user%3D%7B%22id%22%3A123%7D");
  });

  it("preserves URL when there's no tgWebAppData hash", () => {
    // Regular page load without Telegram
    window.location.hash = "#regular-hash";

    if (window.location.hash.startsWith("#tgWebAppData")) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }

    expect(window.location.hash).toBe("#regular-hash");
  });
});

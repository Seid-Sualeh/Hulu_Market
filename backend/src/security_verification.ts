import http from "http";
import { createApp } from "./app.js";

async function runSecurityTests() {
  console.log("=== HULU MARKET INDEPENDENT SECURITY TEST SUITE ===");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` - ${detail}` : ""}`);
      failed++;
    }
  }

  // Spin up app on ephemeral port in test environment
  const app = createApp("https://hulu-market.vercel.app");
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    // TEST 1: Unauthenticated escrow creation must be rejected with 401
    {
      const res = await fetch(`${baseUrl}/api/escrow/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: 1,
          channelName: "Test Channel",
          price: 100,
        }),
      });
      assert(res.status === 401, "Test 1: Unauthenticated POST /api/escrow/order returns 401 Unauthorized");
    }

    // TEST 2: Forged buyerId without token must be rejected with 401 (cannot spend victim's balance)
    {
      const res = await fetch(`${baseUrl}/api/escrow/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: 1,
          price: 100,
          buyerId: 999, // Attempted victim balance hijacking
        }),
      });
      assert(res.status === 401, "Test 2: Forged buyerId without token is strictly rejected with 401");
    }

    // TEST 3: Unauthenticated escrow confirmation must be rejected with 401
    {
      const res = await fetch(`${baseUrl}/api/escrow/orders/1/confirm`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "buyer" }),
      });
      assert(res.status === 401, "Test 3: Unauthenticated PATCH /api/escrow/orders/:id/confirm returns 401");
    }

    // TEST 4: Forged userId confirmation payload without token must be rejected with 401
    {
      const res = await fetch(`${baseUrl}/api/escrow/orders/1/confirm`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "buyer", userId: 1 }),
      });
      assert(res.status === 401, "Test 4: Forged userId in confirmation body is rejected with 401");
    }

    // TEST 5: Unauthenticated access to escrow messages must be rejected with 401
    {
      const res = await fetch(`${baseUrl}/api/escrow/orders/1/messages`);
      assert(res.status === 401, "Test 5: Unauthenticated GET /api/escrow/orders/:id/messages returns 401");
    }

    // TEST 6: Header spoofing with x-user-id must NOT bypass message authorization
    {
      const res = await fetch(`${baseUrl}/api/escrow/orders/1/messages`, {
        headers: { "x-user-id": "1" },
      });
      assert(res.status === 401, "Test 6: Spoofed x-user-id header is ignored and returns 401");
    }

    // TEST 7: Role spoofing with x-user-role: admin must NOT bypass escrow chat authorization
    {
      const res = await fetch(`${baseUrl}/api/escrow/orders/1/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": "admin",
          "x-user-id": "1",
        },
        body: JSON.stringify({ message: "Impersonated admin message" }),
      });
      assert(res.status === 401, "Test 7: Spoofed x-user-role: admin header is ignored and returns 401");
    }

    // TEST 8: Unauthenticated file upload must be rejected with 401
    {
      const res = await fetch(`${baseUrl}/api/upload`, {
        method: "POST",
      });
      assert(res.status === 401, "Test 8: Unauthenticated POST /api/upload returns 401");
    }

    // TEST 9: Unauthenticated access to private uploads must return 401 Unauthorized
    {
      const res = await fetch(`${baseUrl}/uploads/private/confidential-receipt.jpg`);
      assert(res.status === 401, "Test 9: Anonymous access to /uploads/private/ returns 401 Unauthorized");
    }

    // TEST 10: Path traversal in private file requests must be rejected
    {
      const res = await fetch(`${baseUrl}/uploads/private/..%2f..%2fpackage.json`);
      assert(res.status === 400 || res.status === 401 || res.status === 404, "Test 10: Path traversal attempt is safely handled");
    }

    // TEST 11: User profile, stats, deposits, and listings require authentication
    {
      const profileRes = await fetch(`${baseUrl}/api/user/profile`);
      const statsRes = await fetch(`${baseUrl}/api/user/stats`);
      const depositRes = await fetch(`${baseUrl}/api/transactions/deposit`, { method: "POST" });
      const myListingsRes = await fetch(`${baseUrl}/api/channels/my`);

      assert(profileRes.status === 401, "Test 11a: GET /api/user/profile requires auth (401)");
      assert(statsRes.status === 401, "Test 11b: GET /api/user/stats requires auth (401)");
      assert(depositRes.status === 401, "Test 11c: POST /api/transactions/deposit requires auth (401)");
      assert(myListingsRes.status === 401, "Test 11d: GET /api/channels/my requires auth (401)");
    }

    // TEST 12: Public marketplace channel browsing remains operational for unauthenticated visitors
    {
      const res = await fetch(`${baseUrl}/api/channels`);
      // Database might be empty or mock, but endpoint must NOT return 401 or 403
      assert(res.status === 200 || res.status === 500, "Test 12: Public channels browse endpoint is accessible to guests without auth (non-401)");
    }

    // TEST 13: Production CORS Origin Verification
    {
      const prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const prodApp = createApp("https://hulu-market.vercel.app");
      const prodServer = http.createServer(prodApp);
      await new Promise<void>((r) => prodServer.listen(0, "127.0.0.1", () => r()));
      const prodPort = (prodServer.address() as { port: number }).port;
      const prodBase = `http://127.0.0.1:${prodPort}`;

      try {
        // Disallowed origin
        let corsBlocked = false;
        try {
          const res = await fetch(`${prodBase}/health`, {
            headers: { Origin: "https://malicious-phishing-site.com" },
          });
          const acao = res.headers.get("access-control-allow-origin");
          corsBlocked = acao !== "https://malicious-phishing-site.com" && res.status !== 200;
        } catch {
          corsBlocked = true;
        }
        assert(corsBlocked, "Test 13: Production CORS strictly blocks unauthorized origins");
      } finally {
        process.env.NODE_ENV = prevEnv;
        prodServer.close();
      }
    }

  } finally {
    server.close();
  }

  console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runSecurityTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

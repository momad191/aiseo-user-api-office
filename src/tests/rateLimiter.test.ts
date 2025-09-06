import request from "supertest";
import { createApp } from "../app";

describe("Rate Limiter Middleware", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp();
  });

  it("should allow up to 5 quick requests (burst)", async () => {
    for (let i = 1; i <= 5; i++) {
      const res = await request(app).get("/users/1");
      expect(res.status).toBe(200);
    }
  });

  it("should block the 6th quick request with 429", async () => {
    for (let i = 1; i <= 5; i++) {
      await request(app).get("/users/1");
    }
    const res = await request(app).get("/users/1");
    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/Too many requests/);
  });

  // it("should allow up to 10 requests per minute", async () => {
  //   for (let i = 1; i <= 10; i++) {
  //     const res = await request(app).get("/users/2");
  //     expect(res.status).toBe(200);
  //   }
  // });

  it("should block the 11th request within a minute", async () => {
    for (let i = 1; i <= 10; i++) {
      await request(app).get("/users/2");
    }
    const res = await request(app).get("/users/2");
    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/Too many requests/);
  });

  //   it("should reset burst after 10 seconds", async () => {
  //     // Consume all burst tokens
  //     for (let i = 1; i <= 5; i++) {
  //       await request(app).get("/users/1");
  //     }

  //     // 6th request should be blocked
  //     const res1 = await request(app).get("/users/1");
  //     expect(res1.status).toBe(429);

  //     // wait slightly more than 10 seconds to reset burst
  //     await new Promise((resolve) => setTimeout(resolve, 10_500));

  //     // Next request should succeed
  //     const res2 = await request(app).get("/users/1");
  //     expect(res2.status).toBe(200);
  //   });

  //   it("should reset per-minute quota after 60 seconds", async () => {
  //     for (let i = 1; i <= 10; i++) {
  //       await request(app).get("/users/2");
  //     }
  //     const res1 = await request(app).get("/users/2");
  //     expect(res1.status).toBe(429);

  //     // wait >60s to reset minute quota
  //     await new Promise((resolve) => setTimeout(resolve, 61_000));

  //     const res2 = await request(app).get("/users/2");
  //     expect(res2.status).toBe(200);
  //   });
});

import { describe, expect, it } from "vitest";

describe("Pipedrive API Token Validation", () => {
  it("should authenticate successfully with the Pipedrive API", { timeout: 20000 }, async () => {
    const token = process.env.PIPEDRIVE_API_TOKEN;
    expect(token).toBeTruthy();

    // Call a lightweight endpoint to validate the token
    const response = await fetch(
      `https://api.pipedrive.com/v1/users/me?api_token=${token}`
    );

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.data.name).toBeDefined();

    console.log(`Pipedrive authenticated as: ${data.data.name}`);
  });
});

import { expect, test } from "@playwright/test";

test.describe("public smoke", () => {
  test("home renders hero", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Tradebook/i);
    await expect(
      page.getByRole("heading", { level: 1, name: /find tradespeople/i }),
    ).toBeVisible();
    await expect(page.locator("main#main-content")).toHaveCount(1);
  });

  test("find tradesmen page loads", async ({ page }) => {
    await page.goto("/find-tradesmen");
    await expect(page).toHaveTitle(/find tradesmen/i);
    await expect(page.getByRole("heading", { level: 1, name: /^Find tradesmen$/i })).toBeVisible();
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/log in/i);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("contact page loads", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});

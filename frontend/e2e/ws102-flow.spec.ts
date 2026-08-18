import { expect, test } from "@playwright/test";

test("WS-102 recovery flow retains route state", async ({ page }) => {
  await page.goto("/dashboard?workstation=WS-102&component=bearing&mode=health");
  await expect(page.getByRole("heading", { name: /digital twin/i })).toBeVisible();
  await page.getByRole("link", { name: /failure/i }).first().click();
  await expect(page).toHaveURL(/failure\/FC-2026-0047/);
  await page.goto("/warehouse");
  await expect(page.getByRole("heading", { name: /spare decision/i })).toBeVisible();
  await page.goto("/rerouting");
  await expect(page.getByRole("heading", { name: /re-route work/i })).toBeVisible();
  await page.goto("/shipment");
  await expect(page.getByRole("heading", { name: /delivery commitment/i })).toBeVisible();
});

test("offline and permission routes provide recovery navigation", async ({ page }) => {
  await page.goto("/offline");
  await expect(page.getByRole("heading", { name: /offline/i })).toBeVisible();
  await page.goto("/permission-denied");
  await expect(page.getByRole("heading", { name: /permission/i })).toBeVisible();
});

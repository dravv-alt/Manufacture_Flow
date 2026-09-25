import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/settings");
  await page.getByRole("button", { name: /reset complete demo workflow/i }).click();
});

test("actions persist while navigating the WS-102 recovery flow", async ({ page }) => {
  await page.goto("/failure/FC-2026-0047");
  await expect(page.getByRole("heading", { name: "FC-2026-0047" })).toBeVisible();
  await page.getByRole("link", { name: /review rerouting plan/i }).click();

  const workflowButton = page.getByTestId("reroute-workflow-action");
  await workflowButton.click();
  await expect(workflowButton).toContainText(/approve reviewed/i);
  await workflowButton.click();
  await expect(workflowButton).toContainText(/execute approved/i);
  await workflowButton.click();
  await expect(workflowButton).toContainText(/confirm execution/i);
  await workflowButton.click();
  await expect(workflowButton).toContainText(/reroute confirmed/i);

  await page.goto("/warehouse");
  await page.getByRole("button", { name: /reserve 1 bearing/i }).click();
  await page.getByRole("button", { name: /confirm reservation/i }).click();
  await expect(page.getByText("Bearing reserved", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Bearing reserved", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: /continue to maintenance/i }).click();
  await page.getByRole("button", { name: "Start Maintenance" }).click();
  await page.getByRole("button", { name: "Record Repair Complete" }).click();
  await page.getByRole("button", { name: "Start Machine Testing" }).click();
  await page.getByRole("button", { name: "Validation PASS" }).click();
  await expect(page.getByText(/returned to service/i).first()).toBeVisible();
});

test("invalid case IDs stay not found and utility routes remain usable", async ({ page }) => {
  await page.goto("/failure/not-a-case");
  await expect(page.getByRole("heading", { name: /no incident is available/i })).toBeVisible();
  await page.goto("/offline");
  await expect(page.getByRole("heading", { name: /offline/i })).toBeVisible();
  await page.goto("/permission-denied");
  await expect(page.getByRole("heading", { name: /permission/i })).toBeVisible();
});

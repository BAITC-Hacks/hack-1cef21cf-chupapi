import { test, expect } from "@playwright/test";
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() =>
    localStorage.setItem("challengehub:locale", "en"),
  );
});

test("dedicated workspaces survive reload and coexist in two tabs", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Open business workspace/ }).click();
  await expect(page).toHaveURL(/\/business$/);
  await expect(
    page.getByRole("heading", { name: "Business Dashboard", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('nav a[href="/business/challenges/create"]'),
  ).toBeVisible();
  await context.addInitScript(() =>
    localStorage.setItem("challengehub:locale", "en"),
  );
  const student = await context.newPage();
  await student.goto("/student");
  await expect(
    student.getByRole("heading", { name: "Student Dashboard", exact: true }),
  ).toBeVisible();
  await expect(
    student
      .locator("nav")
      .getByRole("link", { name: "Create Challenge", exact: true }),
  ).toHaveCount(0);
  await student
    .locator("nav")
    .getByRole("link", { name: "My Proposals", exact: true })
    .click();
  await expect(student).toHaveURL(/\/student\/proposals$/);
  await student.reload();
  await expect(
    student.getByRole("heading", { name: "My Proposals", exact: true }),
  ).toBeVisible();
  await expect(
    student.getByRole("button", { name: "Accept", exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Business Dashboard", exact: true }),
  ).toBeVisible();
  await page
    .locator("nav")
    .getByRole("link", { name: "Applications", exact: true })
    .click();
  await expect(page).toHaveURL(/\/business\/applications$/);
  await student
    .locator("nav")
    .getByRole("link", { name: "Explore Challenges", exact: true })
    .click();
  await expect(student).toHaveURL(/\/student\/challenges$/);
  await student.locator(".post-title").first().click();
  await expect(student).toHaveURL(/\/student\/challenges\/.+/);
  await expect(
    student.getByRole("button", { name: "Submit Proposal", exact: true }),
  ).toBeVisible();
  await student.getByRole("button", { name: "Business", exact: true }).click();
  await expect(student).toHaveURL(/\/business$/);
  await student.close();
});

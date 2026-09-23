import { test, expect } from "@playwright/test";
import catalog from "../../lib/translations.json" with { type: "json" };
const ru = (source) => catalog[source]?.ru || source;
const kk = (source) => catalog[source]?.kk || source;
test("Russian and Kazakh cover navigation, validation, AI questions, filters and survive reload", async ({
  page,
}) => {
  await page.goto("/business/challenges/create");
  await expect(page.getByRole("button", {name:"Бизнес",exact:true})).toBeVisible();
  await expect(page.locator("body")).not.toContainText("????");
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await page
    .getByRole("button", { name: ru("Analyze with AI"), exact: true })
    .click();
  await expect(
    page
      .getByRole("alert")
      .filter({
        hasText: ru("Please describe the challenge before continuing."),
      }),
  ).toBeVisible();
  await page.getByLabel("Язык / Тіл").selectOption("kk");
  await expect(page.locator("html")).toHaveAttribute("lang", "kk");
  await expect(page.locator("body")).not.toContainText("????");
  await expect(
    page.getByRole("button", { name: kk("Analyze with AI"), exact: true }),
  ).toBeVisible();
  await page
    .getByLabel(kk("What would you like to solve?"))
    .fill("We want AI to reduce queues in our coffee shops.");
  const request = page.waitForRequest(
    (r) => r.url().endsWith("/api/ai") && r.method() === "POST",
  );
  await page
    .getByRole("button", { name: kk("Analyze with AI"), exact: true })
    .click();
  expect((await request).postDataJSON().locale).toBe("kk");
  await expect(page.locator(".question")).toHaveCount(3);
  await page.getByLabel("Язык / Тіл").selectOption("ru");
  await expect(page.locator(".question")).toHaveCount(3);
  await page.goto("/student/challenges");
  await page.getByLabel("Язык / Тіл").selectOption("kk");
  await page.getByLabel(kk("Readiness"), { exact: true }).selectOption("Draft");
  await expect(page.locator(".challenge-post")).not.toHaveCount(0);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "kk");
  await expect(
    page
      .locator("nav")
      .getByRole("link", { name: kk("My Proposals"), exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/alem-kazakh.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByLabel("Язык / Тіл")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

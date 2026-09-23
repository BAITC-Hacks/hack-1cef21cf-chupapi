import { test, expect } from "@playwright/test";
test("three answers to a published challenge; a second browser submits; business manually accepts", async ({
  page,
  browser,
}) => {
  await page.goto("/challenges/create");
  await page
    .getByRole("button", { name: "Analyze with AI", exact: true })
    .click();
  await expect(page.locator(".form-error[role=alert]")).toHaveText(
    "Please describe the challenge before continuing.",
  );
  await page
    .getByLabel("What would you like to solve?")
    .fill("We want AI to reduce queues in our coffee shops.");
  await page
    .getByRole("button", { name: "Analyze with AI", exact: true })
    .click();
  await expect(page.locator(".question")).toHaveCount(3);
  await page
    .getByRole("button", { name: "Generate Challenge Card", exact: true })
    .click();
  await expect(page.locator(".form-error[role=alert]")).toHaveText(
    "At least one answer is required.",
  );
  await page
    .getByLabel("Result & success", { exact: true })
    .fill("A demand forecasting dashboard for store managers.");
  await page
    .getByLabel("Data & constraints", { exact: true })
    .fill(
      "Six months of anonymized order timestamps in CSV; budget $200; deadline 4 weeks.",
    );
  await page
    .getByLabel("Users & collaboration", { exact: true })
    .fill(
      "Managers and baristas; weekly consultation with Alex at alex@example.test.",
    );
  await page
    .getByRole("button", { name: "Generate Challenge Card", exact: true })
    .click();
  const title = "Coffee acceptance " + Date.now();
  await page.getByLabel("Title", { exact: true }).fill(title);
  const before = await page.getByTestId("readiness-score").innerText();
  await page
    .getByLabel("Success criteria", { exact: true })
    .fill(
      "Reduce waiting time from 12 to 8 minutes during a two-week pilot, measured using order timestamps.",
    );
  await expect(page.getByTestId("readiness-score")).not.toHaveText(before);
  await page
    .getByRole("button", { name: "Confirm Challenge", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Publish Challenge", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Title", { exact: true }).fill(title + " reviewed");
  await expect(
    page.getByRole("button", { name: "Confirm Challenge", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Confirm Challenge", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Publish Challenge", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: title + " reviewed", exact: true }),
  ).toBeVisible();
  const url = page.url();
  const context = await browser.newContext();
  const student = await context.newPage();
  await student.goto(url);
  await expect(
    student.getByRole("heading", { name: title + " reviewed", exact: true }),
  ).toBeVisible();
  await student.getByRole("button", { name: "Student", exact: true }).click();
  await expect(
    student
      .locator("nav")
      .getByRole("link", { name: "Create Challenge", exact: true }),
  ).toHaveCount(0);
  await student
    .getByRole("button", { name: "Submit Proposal", exact: true })
    .click();
  await student
    .getByLabel("Team Name", { exact: true })
    .fill("Cross Browser Team");
  await student
    .getByLabel("Solution Idea", { exact: true })
    .fill("A forecasting dashboard for the coffee shop team.");
  await student
    .getByLabel("Implementation Plan", { exact: true })
    .fill("Analyze data, build and test a prototype, review with managers.");
  await student
    .getByLabel("Estimated Duration", { exact: true })
    .fill("2 weeks");
  await student
    .locator("form")
    .getByRole("button", { name: "Submit Proposal", exact: true })
    .click();
  await expect(
    student.getByText("Proposal submitted successfully."),
  ).toBeVisible();
  await page.goto("/applications");
  const proposal = page.locator(".application-card").filter({
    has: page.getByRole("heading", {
      name: "Cross Browser Team",
      exact: true,
    }),
  });
  await proposal
    .getByRole("button", { name: "View Proposal", exact: true })
    .click();
  await expect(
    proposal.getByText(
      "Analyze data, build and test a prototype, review with managers.",
    ),
  ).toBeVisible();
  await proposal.getByRole("button", { name: "Accept", exact: true }).click();
  await expect(proposal.locator(".proposal-status")).toHaveText("Accepted");
  await student.goto("http://127.0.0.1:3100/applications");
  await expect(
    student.getByRole("heading", { name: "My Proposals", exact: true }),
  ).toBeVisible();
  await expect(
    student
      .locator(".application-card")
      .filter({
        has: student.getByRole("heading", {
          name: "Cross Browser Team",
          exact: true,
        }),
      })
      .locator(".proposal-status"),
  ).toHaveText("Accepted");
  await expect(
    student.getByRole("button", { name: "Accept", exact: true }),
  ).toHaveCount(0);
  await expect(
    student.getByRole("heading", { name: "NOVA", exact: true }),
  ).toHaveCount(0);
  await student.reload();
  await expect(student.locator(".proposal-status.accepted")).not.toHaveCount(0);
  await context.close();
});
test("demo answers, saved drafts, filters, mobile and separate student dashboard", async ({
  page,
}) => {
  await page.goto("/challenges/create?demo=1");
  await expect(page.getByLabel("What would you like to solve?")).toHaveValue(
    "We want AI to reduce queues in our coffee shops.",
  );
  await page
    .getByRole("button", { name: "Analyze with AI", exact: true })
    .click();
  await expect(page.locator(".question")).toHaveCount(3);
  await page
    .getByRole("button", { name: "Use sample answers", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Generate Challenge Card", exact: true })
    .click();
  await expect(page.getByTestId("readiness-score")).toHaveText("100/100");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText("Draft saved in My Challenges.")).toBeVisible();
  await page
    .locator("nav")
    .getByRole("link", { name: "My Challenges", exact: true })
    .click();
  await page.getByRole("button", { name: "Drafts", exact: true }).click();
  await page
    .getByRole("link")
    .filter({
      has: page.getByRole("heading", {
        name: "AI Queue Optimization",
        exact: true,
      }),
    })
    .click();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
    "AI Queue Optimization",
  );
  await page.goto("/challenges");
  await page.getByLabel("Readiness", { exact: true }).selectOption("Draft");
  await expect(
    page.getByRole("link", { name: "Improve Our Website", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Readiness", { exact: true }).selectOption("All");
  await page.getByRole("button", { name: "Healthcare", exact: true }).click();
  await expect(page.getByText("No challenges found")).toBeVisible();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await page.getByLabel("Filter challenges", { exact: true }).fill("Waste");
  await expect(page.locator(".challenge-post")).toHaveCount(1);
  await page.goto("/");
  await expect(page.locator(".challenge-post").first()).toBeVisible();
  await page.getByRole("button", { name: "Student", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /Your skills/ }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/student-sqlite.png",
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("API rejects invalid data and wrong role; malformed AI response still gives 3 questions", async ({
  page,
  request,
}) => {
  expect(
    (await request.post("/api/ai", { data: { description: "" } })).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/store", {
        headers: { "x-demo-role": "Student" },
        data: { action: "decide", id: "proposal-0", status: "Accepted" },
      })
    ).status(),
  ).toBe(403);
  expect((await request.get("/api/ai")).ok()).toBe(true);
  await page.route("**/api/ai", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: '{"analysis":{"invalid":true}}',
    }),
  );
  await page.goto("/challenges/create");
  await page
    .getByLabel("What would you like to solve?")
    .fill("We want AI to reduce queues in our coffee shops.");
  await page
    .getByRole("button", { name: "Analyze with AI", exact: true })
    .click();
  await expect(page.getByText("MOCK AI", { exact: true })).toBeVisible();
  await expect(page.locator(".question")).toHaveCount(3);
});
test("failed database write does not confirm a card or show success", async ({
  page,
}) => {
  await page.goto("/challenges/create?demo=1");
  await expect(page.getByLabel("What would you like to solve?")).toHaveValue(
    "We want AI to reduce queues in our coffee shops.",
  );
  await page
    .getByRole("button", { name: "Analyze with AI", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Use sample answers", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Generate Challenge Card", exact: true })
    .click();
  await page.route("**/api/store", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({
          status: 503,
          contentType: "application/json",
          body: '{"error":"Database temporarily unavailable"}',
        })
      : route.continue(),
  );
  await page
    .getByRole("button", { name: "Confirm Challenge", exact: true })
    .click();
  await expect(
    page.getByText("Database temporarily unavailable"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Publish Challenge", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Confirm Challenge", exact: true }),
  ).toBeVisible();
});

test("gibberish, irrelevant answers and manual edits cannot bypass AI review", async ({
  page,
  request,
}) => {
  await page.goto("/challenges/create");
  await page
    .getByLabel("What would you like to solve?")
    .fill("asdfgh qwerty zxcvbn");
  await page
    .getByRole("button", { name: "Analyze with AI", exact: true })
    .click();
  await expect(page.getByTestId("quality-review")).toContainText(
    "Please clarify",
  );
  await expect(page.locator(".question")).toHaveCount(0);
  await page
    .getByLabel("What would you like to solve?")
    .fill("We want AI to reduce queues in our coffee shops.");
  await page
    .getByRole("button", { name: "Analyze with AI", exact: true })
    .click();
  await page
    .getByLabel("Result & success", { exact: true })
    .fill("purple bananas dance on the moon.");
  await page
    .getByRole("button", { name: "Generate Challenge Card", exact: true })
    .click();
  await expect(page.getByTestId("quality-review")).toContainText("unrelated");
  await expect(page.getByLabel("Title", { exact: true })).toHaveCount(0);
  const data = await (await request.get("/api/store")).json();
  const original = data.challenges.find((c) => c.id === "challenge-1");
  const bad = {
    ...original,
    id: crypto.randomUUID(),
    status: "confirmed",
    card: {
      ...original.card,
      expectedResult: "purple bananas dance on the moon.",
    },
    contentReview: {
      status: "approved",
      summary: "Forged client review",
      issues: [],
    },
  };
  const denied = await request.post("/api/store", {
    headers: { "x-demo-role": "Business" },
    data: { action: "saveChallenge", challenge: bad },
  });
  expect(denied.status()).toBe(422);
  expect((await denied.json()).review.status).toBe("needs_clarification");
  const directPublish = await request.post("/api/store", {
    headers: { "x-demo-role": "Business" },
    data: {
      action: "saveChallenge",
      challenge: { ...bad, status: "published" },
    },
  });
  expect(directPublish.status()).toBe(409);
  const proposal = await request.post("/api/store", {
    headers: { "x-demo-role": "Student" },
    data: {
      action: "submitProposal",
      id: crypto.randomUUID(),
      challengeId: "challenge-1",
      proposal: {
        teamName: "Irrelevant Team",
        idea: "purple bananas dance on the moon.",
        plan: "We will watch comedy films instead of solving queues.",
        duration: "2 weeks",
        link: "",
      },
    },
  });
  expect(proposal.status()).toBe(422);
});

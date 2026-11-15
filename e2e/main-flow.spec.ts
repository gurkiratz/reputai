import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "password123";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

async function logout(page: Page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
}

test("landing page loads and links to sign in", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("How it works")).toBeVisible();
  await page.getByRole("link", { name: "Sign in to the demo" }).click();
  await expect(page).toHaveURL(/\/login/);
});

test("app pages need a signed-in user", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("agent cannot use manager-only pages", async ({ page }) => {
  await login(page, "agent@brightsmile.example");
  const res = await page.request.get("/api/export/flagged");
  expect(res.status()).toBe(403);
  await page.goto("/settings/audit");
  await expect(page).toHaveURL(/\/dashboard/);
});

test("main flow: sync, draft, submit, approve and post, audit log", async ({ page }) => {
  // Agent: sync, open a new review, start a draft from a template, submit it.
  await login(page, "agent@brightsmile.example");
  await page.getByRole("button", { name: "Sync reviews now" }).click();
  await expect(page.getByText(/Synced/)).toBeVisible({ timeout: 60_000 });

  await page.goto("/dashboard?status=NEW");
  const first = page.locator('a[href^="/reviews/"]').first();
  await expect(first).toBeVisible();
  const reviewUrl = (await first.getAttribute("href"))!;
  await page.goto(reviewUrl);

  await page.getByRole("combobox", { name: "Template" }).click();
  await page.getByRole("option").first().click();
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByRole("button", { name: "Submit for approval" })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Submit for approval" }).click();
  await expect(page.getByText("Awaiting manager approval.")).toBeVisible();
  await logout(page);

  // Manager: approve and post. If the tone check gave a WARN, pick an override reason.
  await login(page, "manager@brightsmile.example");
  await page.goto(reviewUrl);
  const reason = page.getByRole("combobox", { name: "Reason" });
  if (await reason.isVisible()) {
    await reason.click();
    await page.getByRole("option").first().click();
  }
  await page.getByRole("button", { name: "Approve & post to Google" }).click();
  await expect(page.getByText(/Posted to Google/)).toBeVisible({ timeout: 30_000 });

  // The post is recorded in the audit log, and the CSV export works for a manager.
  await page.goto("/settings/audit");
  await expect(page.getByText("Reply posted").first()).toBeVisible();
  const csv = await page.request.get("/api/export/flagged");
  expect(csv.status()).toBe(200);
  expect(csv.headers()["content-type"]).toContain("text/csv");
});

test("a reply with patient health details is blocked", async ({ page }) => {
  await login(page, "agent@brightsmile.example");
  await page.goto("/dashboard?status=NEW");
  await page.locator('a[href^="/reviews/"]').first().click();
  await page.getByRole("combobox", { name: "Template" }).click();
  await page.getByRole("option").first().click();
  await page.getByRole("button", { name: "Apply" }).click();
  const box = page.getByRole("textbox", { name: "Reply body" });
  await expect(box).toBeVisible({ timeout: 30_000 });
  await box.fill("Thank you. We hope your root canal is healing well.");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText(/Blocked/).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Submit for approval" })).toBeDisabled();
});

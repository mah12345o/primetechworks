import { test, expect } from "@playwright/test";

test.describe("Admin Portal E2E Flow", () => {
  test("Login -> Dashboard -> Users -> Add User -> Search User -> Edit User -> Delete User -> Logout", async ({
    page,
  }) => {
    const uniqueEmail = `e2e_${Date.now()}@test.com`;

    // 1. Login
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Admin Portal" })).toBeVisible();

    await page.fill('input[type="email"]', "admin@example.com");
    await page.fill('input[type="password"]', "admin123");
    await page.click('button[type="submit"]');

    // 2. Dashboard & 3. Users Table
    await page.waitForURL("**/");
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();

    // 4. Add User
    await page.click('button:has-text("Add user")');
    await expect(page.getByText("Add Client")).toBeVisible();

    await page.fill('input[name="name"]', "E2E Test User");
    await page.fill('input[name="city"]', "Ahmedabad");
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="mobile"]', "9876543210");
    await page.fill('input[name="password"]', "password123");
    await page.click('button:has-text("Save Client")');

    // Verify User Added in Table
    await expect(page.getByText("E2E Test User").first()).toBeVisible();

    // 5. Search User
    const searchInput = page.locator('input[type="search"]');
    await searchInput.fill("E2E Test User");
    await expect(page.getByText("E2E Test User").first()).toBeVisible();

    // 6. Edit User
    const userRow = page.locator("tr", { hasText: "E2E Test User" });
    await userRow.locator('button[aria-label*="Edit"]').click();
    await expect(page.getByText("Edit Client")).toBeVisible();

    await page.fill('input[name="name"]', "E2E Test User Updated");
    await page.click('button:has-text("Update Client")');

    // Verify User Updated
    await expect(page.getByText("E2E Test User Updated").first()).toBeVisible();

    // 7. Delete User
    const updatedRow = page.locator("tr", { hasText: "E2E Test User Updated" });
    await updatedRow.locator('button[aria-label*="Delete"]').click();

    // Confirm Delete Modal
    await expect(page.getByText("Delete Client")).toBeVisible();
    const confirmDeleteBtn = page.locator('button:has-text("Delete")').last();
    await confirmDeleteBtn.click();

    // Verify User Removed
    await expect(page.getByText("E2E Test User Updated")).toHaveCount(0);

    // 8. Logout
    await page.click('button:has-text("Sign out")');
    await page.waitForURL("**/login");
    await expect(page.getByRole("heading", { name: "Admin Portal" })).toBeVisible();
  });
});

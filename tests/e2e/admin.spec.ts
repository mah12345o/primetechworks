import { test, expect } from "@playwright/test";

test.describe("Admin Portal E2E Flow", () => {
  test("Login -> Dashboard -> Users -> Add User -> Search User -> Edit User -> Delete User -> Logout", async ({
    page,
  }) => {
    const timestamp = Date.now();
    const uniqueEmail = `e2e_${timestamp}@test.com`;
    const userName = `E2E User ${timestamp}`;
    const userUpdatedName = `E2E Updated ${timestamp}`;

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
    await expect(page.getByText("Add New Client")).toBeVisible();

    await page.fill('input[name="name"]', userName);
    await page.fill('input[name="city"]', "Ahmedabad");
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="mobile"]', "9876543210");
    await page.fill('input[name="password"]', "password123");
    await page.click('button:has-text("Save Client")');

    // Wait for Add Modal to close
    await expect(page.getByText("Add New Client")).toHaveCount(0);

    // 5. Search User
    const searchInput = page.locator('input[type="search"]');
    await searchInput.fill(userName);
    await page.waitForTimeout(600); // 300ms debounce buffer + router push
    await expect(page.getByText(userName).first()).toBeVisible();

    // 6. Edit User
    const userRow = page.locator("tr", { hasText: uniqueEmail });
    await userRow.getByRole("button", { name: /edit/i }).click();
    await expect(page.getByText("Edit Client")).toBeVisible();

    await page.fill('input[name="name"]', userUpdatedName);
    await page.click('button:has-text("Update Client")');

    // Wait for Edit Modal to close
    await expect(page.getByText("Edit Client")).toHaveCount(0);

    // Re-search to verify updated name
    await searchInput.fill(userUpdatedName);
    await page.waitForTimeout(600);
    await expect(page.getByText(userUpdatedName).first()).toBeVisible();

    // 7. Delete User
    const updatedRow = page.locator("tr", { hasText: uniqueEmail });
    await updatedRow.getByRole("button", { name: /delete/i }).click();

    // Confirm Delete Modal
    await expect(page.getByText("Delete Client")).toBeVisible();
    const modal = page.locator('div[role="dialog"]');
    await modal.getByRole("button", { name: /delete/i }).click();

    // Wait for Delete Modal to close
    await expect(page.getByText("Delete Client")).toHaveCount(0);

    // Verify User Removed
    await expect(page.getByText(userUpdatedName)).toHaveCount(0);

    // 8. Logout
    await page.click('button:has-text("Sign out")');
    await page.waitForURL("**/login");
    await expect(page.getByRole("heading", { name: "Admin Portal" })).toBeVisible();
  });
});

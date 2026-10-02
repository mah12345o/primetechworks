# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin.spec.ts >> Admin Portal E2E Flow >> Login -> Dashboard -> Users -> Add User -> Search User -> Edit User -> Delete User -> Logout
- Location: tests\e2e\admin.spec.ts:4:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('E2E Test User').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByText('E2E Test User').first() with timeout 5000ms
  - waiting for getByText('E2E Test User').first()

```

```yaml
- alert: Create Next App
- main:
  - heading "Users" [level=1]
  - text: Live — changes appear instantly admin@example.com
  - button "Sign out of admin portal": Sign out
  - text: Search clients by name, city, email, or mobile
  - searchbox "Search clients by name, city, email, or mobile"
  - button "Add new user": Add user
  - table:
    - rowgroup:
      - row "Name City Email Mobile Amount Actions":
        - columnheader "Name"
        - columnheader "City"
        - columnheader "Email"
        - columnheader "Mobile"
        - columnheader "Amount"
        - columnheader "Actions"
    - rowgroup:
      - row "Ayesha Patel Surat ayesha.patel@example.com 9876543033 ₹26,400.00 Edit Ayesha Patel's account Delete Ayesha Patel's account":
        - cell "Ayesha Patel"
        - cell "Surat"
        - cell "ayesha.patel@example.com"
        - cell "9876543033"
        - cell "₹26,400.00"
        - cell "Edit Ayesha Patel's account Delete Ayesha Patel's account":
          - button "Edit Ayesha Patel's account": Edit
          - button "Delete Ayesha Patel's account": Delete
      - row "Sahil Shah Rajkot sahil.shah1@example.com 9876543032 ₹42,806.00 Edit Sahil Shah's account Delete Sahil Shah's account":
        - cell "Sahil Shah"
        - cell "Rajkot"
        - cell "sahil.shah1@example.com"
        - cell "9876543032"
        - cell "₹42,806.00"
        - cell "Edit Sahil Shah's account Delete Sahil Shah's account":
          - button "Edit Sahil Shah's account": Edit
          - button "Delete Sahil Shah's account": Delete
      - row "Mansi Desai Vadodara mansi.desai@example.com 9876543031 ₹18,900.00 Edit Mansi Desai's account Delete Mansi Desai's account":
        - cell "Mansi Desai"
        - cell "Vadodara"
        - cell "mansi.desai@example.com"
        - cell "9876543031"
        - cell "₹18,900.00"
        - cell "Edit Mansi Desai's account Delete Mansi Desai's account":
          - button "Edit Mansi Desai's account": Edit
          - button "Delete Mansi Desai's account": Delete
      - row "Rakesh Parmar Gandhinagar rakesh.parmar@example.com 9876543030 ₹43,800.00 Edit Rakesh Parmar's account Delete Rakesh Parmar's account":
        - cell "Rakesh Parmar"
        - cell "Gandhinagar"
        - cell "rakesh.parmar@example.com"
        - cell "9876543030"
        - cell "₹43,800.00"
        - cell "Edit Rakesh Parmar's account Delete Rakesh Parmar's account":
          - button "Edit Rakesh Parmar's account": Edit
          - button "Delete Rakesh Parmar's account": Delete
      - row "Khushi Shah Ahmedabad khushi.shah@example.com 9876543029 ₹20,700.00 Edit Khushi Shah's account Delete Khushi Shah's account":
        - cell "Khushi Shah"
        - cell "Ahmedabad"
        - cell "khushi.shah@example.com"
        - cell "9876543029"
        - cell "₹20,700.00"
        - cell "Edit Khushi Shah's account Delete Khushi Shah's account":
          - button "Edit Khushi Shah's account": Edit
          - button "Delete Khushi Shah's account": Delete
      - row "Parth Mehta Surat parth.mehta@example.com 9876543028 ₹37,500.00 Edit Parth Mehta's account Delete Parth Mehta's account":
        - cell "Parth Mehta"
        - cell "Surat"
        - cell "parth.mehta@example.com"
        - cell "9876543028"
        - cell "₹37,500.00"
        - cell "Edit Parth Mehta's account Delete Parth Mehta's account":
          - button "Edit Parth Mehta's account": Edit
          - button "Delete Parth Mehta's account": Delete
  - text: Showing 1 to 6 of 37 clients
  - button "Previous page" [disabled]: Previous
  - text: Page 1 of 7
  - button "Next page": Next
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test.describe("Admin Portal E2E Flow", () => {
  4  |   test("Login -> Dashboard -> Users -> Add User -> Search User -> Edit User -> Delete User -> Logout", async ({
  5  |     page,
  6  |   }) => {
  7  |     const uniqueEmail = `e2e_${Date.now()}@test.com`;
  8  | 
  9  |     // 1. Login
  10 |     await page.goto("/login");
  11 |     await expect(page.getByRole("heading", { name: "Admin Portal" })).toBeVisible();
  12 | 
  13 |     await page.fill('input[type="email"]', "admin@example.com");
  14 |     await page.fill('input[type="password"]', "admin123");
  15 |     await page.click('button[type="submit"]');
  16 | 
  17 |     // 2. Dashboard & 3. Users Table
  18 |     await page.waitForURL("**/");
  19 |     await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
  20 |     await expect(page.getByRole("table")).toBeVisible();
  21 | 
  22 |     // 4. Add User
  23 |     await page.click('button:has-text("Add user")');
  24 |     await expect(page.getByText("Add New Client")).toBeVisible();
  25 | 
  26 |     await page.fill('input[name="name"]', "E2E Test User");
  27 |     await page.fill('input[name="city"]', "Ahmedabad");
  28 |     await page.fill('input[name="email"]', uniqueEmail);
  29 |     await page.fill('input[name="mobile"]', "9876543210");
  30 |     await page.fill('input[name="password"]', "password123");
  31 |     await page.click('button:has-text("Save Client")');
  32 | 
  33 |     // Verify User Added in Table
> 34 |     await expect(page.getByText("E2E Test User").first()).toBeVisible();
     |                                                           ^ Error: expect(locator).toBeVisible() failed
  35 | 
  36 |     // 5. Search User
  37 |     const searchInput = page.locator('input[type="search"]');
  38 |     await searchInput.fill("E2E Test User");
  39 |     await page.waitForTimeout(500); // 300ms debounce buffer
  40 |     await expect(page.getByText("E2E Test User").first()).toBeVisible();
  41 | 
  42 |     // 6. Edit User
  43 |     const userRow = page.locator("tr", { hasText: "E2E Test User" });
  44 |     await userRow.getByRole("button", { name: /edit/i }).click();
  45 |     await expect(page.getByText("Edit Client")).toBeVisible();
  46 | 
  47 |     await page.fill('input[name="name"]', "E2E Test User Updated");
  48 |     await page.click('button:has-text("Update Client")');
  49 | 
  50 |     // Verify User Updated
  51 |     await expect(page.getByText("E2E Test User Updated").first()).toBeVisible();
  52 | 
  53 |     // 7. Delete User
  54 |     const updatedRow = page.locator("tr", { hasText: "E2E Test User Updated" });
  55 |     await updatedRow.getByRole("button", { name: /delete/i }).click();
  56 | 
  57 |     // Confirm Delete Modal
  58 |     await expect(page.getByText("Delete Client")).toBeVisible();
  59 |     const modal = page.locator('div[role="dialog"]');
  60 |     await modal.getByRole("button", { name: /^delete$/i }).click();
  61 | 
  62 |     // Verify User Removed
  63 |     await expect(page.getByText("E2E Test User Updated")).toHaveCount(0);
  64 | 
  65 |     // 8. Logout
  66 |     await page.click('button:has-text("Sign out")');
  67 |     await page.waitForURL("**/login");
  68 |     await expect(page.getByRole("heading", { name: "Admin Portal" })).toBeVisible();
  69 |   });
  70 | });
  71 | 
```
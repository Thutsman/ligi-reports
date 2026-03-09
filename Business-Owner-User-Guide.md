## LIGI Reporting – Business Owner EOD Guide

This guide shows a **Business Owner** exactly **where to click on the Business Overview page** to view End of Day (EOD) reports for any branch and any date using the **branch dropdown** and the **date calendar**.

---

### 1. Log in

1. Open the LIGI Reporting login page (`index.html`).
2. Enter your **email** and **password**.
3. Click **Login**.
4. You will land on the page titled **“Business Overview”** at the top left.

At the top right you will see:

- **Last updated** time, and  
- A **🚪 Logout** button.

The top half of the page contains cards like **Daily Revenue**, **Active Branches**, etc. You do not need to touch these to view EOD reports.

---

## 2. Navigate to the “Historical Sales” tab

The EOD viewer lives inside the **Analytics Dashboard** card in the **lower half** of the page.

1. Scroll down until you see a large card titled **“Analytics Dashboard”**.
2. Just under that title there is a **row of tabs** (buttons) from left to right, typically:
   - `Revenue`
   - `Branch Performance`
   - `Inventory`
   - `Staff`
   - `Historical Sales`
3. Click the **right‑most tab**, labelled **`Historical Sales`**.
4. When the **Historical Sales** tab is active:
   - It is highlighted like the other active tabs (different background/border),
   - The content area below shows a heading **“Branch Historical Sales”**.

This “Branch Historical Sales” section is where you select a branch and date and view the EOD report.

---

## 3. Locate the branch dropdown, date calendar, and buttons

Inside the **“Branch Historical Sales”** section (still on the `Historical Sales` tab):

- At the **top** of the section you will see a row of controls:

  1. On the **left**, a labelled dropdown:
     - Label: **“Select Branch”**
     - Field: a **dropdown** box named `branch-select` with the placeholder **“Choose a branch”**.

  2. To the **right** of that, a labelled date field:
     - Label: **“Select Date”**
     - Field: an **input** of type **date** named `date-select` (white box that opens a calendar when clicked).

  3. To the **far right** of these, two buttons next to each other:
     - **`View Sales Data`** – this is the main button you use to load the EOD.
     - **`Export PDF`** – appears or becomes visible when a report is loaded (used to download the EOD as a PDF).

- Below these controls is a large area labelled `historical-results`:
  - When empty, this area is hidden or shows a loading/empty message.
  - When you load an EOD, the **EOD report details** are displayed here.

---

## 4. View today’s EOD report for a branch

To see **today’s** EOD for a specific branch:

1. Make sure you are on the **Business Overview** page and the **`Historical Sales`** tab is selected (as described above).
2. In the **Select Branch** dropdown (left‑hand control in the historical area):
   - Click the box,
   - Choose the branch you want to review from the list.
3. In the **Select Date** field (to the right of the branch dropdown):
   - Click inside the date field to open the **calendar**.
   - Click **today’s date**.
4. On the right side of the controls, click the button **`View Sales Data`**.

If an EOD report exists for that **branch + date**:

- The bottom area (`historical-results`) will fill with:
  - **Branch name and date** at the top.
  - A **Sales by Department** section (list of departments and amounts).
  - A **Financial Summary** (total sales, total profit, total expenses, net revenue).
  - A **Payments** section (cash on hand, discrepancies).
  - A **Financial Analysis** section (profit margin, expense ratio, when the report was submitted).
  - Any **notes** that the branch manager captured for that day.

If **no EOD report** exists for that date:

- The results area will show a clear message such as:
  - “No EOD Report Found for this branch on [date].”
- You can then follow up with the branch manager if needed.

---

## 5. Use the calendar to view older EOD reports

The `Historical Sales` tab and its controls are also used to view **past EOD reports**.

To review an older day:

1. Stay on the **Business Overview** page, with the **`Historical Sales`** tab selected.
2. In **Select Branch**, choose the branch you are interested in.
3. In **Select Date**:
   - Click the date field to open the **calendar**.
   - Use the calendar to move to the **desired past date** (e.g. last week, last month).
   - Click that date.
4. Click **`View Sales Data`**.

Then:

- If a report exists, you will see the full EOD breakdown for that branch and day, rendered in the same way as for today.
- If not, you will see the “No EOD report found” message for that branch and date.

You can repeat this process for:

- Different **dates** for the same branch, and
- Different **branches** by changing the **Select Branch** dropdown.

This allows you to step through history and understand performance day‑by‑day.

---

## 6. Export an EOD report to PDF (optional)

When an EOD report is visible in the **historical-results** area:

1. Look again at the **top‑right** of the controls row in the `Historical Sales` tab (next to **View Sales Data**).
2. The **`Export PDF`** button should now be visible/enabled.
3. Click **`Export PDF`**.
4. Your browser will download a PDF that includes:
   - Branch name and date.
   - Department sales breakdown.
   - Totals, profit, expenses, cash on hand, discrepancies.
   - Analysis and notes.

Use this when you need a **printable** or **shareable** version of the EOD report (board packs, audits, offline records).

---

## 7. Logging out and simple troubleshooting

- To **log out**:
  - At the top‑right of the Business Overview page, click the **🚪 Logout** button.
  - You will return to the login screen.

- If EOD data does **not** appear after clicking **View Sales Data**:
  - Confirm that both **branch** and **date** are selected.
  - Check your **internet connection**.
  - Try reloading the page and repeating the steps.
  - If a specific branch/date combination always shows an error or blank, note the branch and date and contact your system administrator.

---

**In summary**: On the Business Overview page, scroll down to **Analytics Dashboard**, click the **right‑most tab “Historical Sales”**, and then use the **“Select Branch” dropdown, the date calendar, and the “View Sales Data” button at the top of that tab** to see the EOD report for any branch and date. Use **Export PDF** when you need a downloadable copy.


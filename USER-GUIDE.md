# PT Surya Roda Perkasa — Ledger User Guide
### Panduan Pengguna Sistem Pembukuan SRP

This guide explains how to use the SRP accounting ledger: how to record every kind of
transaction, how to add master data (customers, products, accounts) in the **correct
format**, and how the books work behind the scenes.

> **How to use this guide with Claude:** Upload this file to a Claude chat and ask things
> like *"How do I record a giro payment from a customer?"*, *"How do I add a new bank
> account the right way?"*, or *"What account code should a new expense use?"*. Claude will
> answer using the rules written here, so your team always follows the proper format.

The website: **https://suryarodaperkasa-production.up.railway.app**

---

## Table of contents
1. [Getting started (login, roles, security)](#1-getting-started)
2. [How the system thinks (read this once)](#2-how-the-system-thinks)
3. [Set up your master data first](#3-set-up-your-master-data-first)
4. [Chart of Accounts — adding accounts the proper way](#4-chart-of-accounts--the-proper-format)
5. [Recording day-to-day transactions](#5-recording-day-to-day-transactions)
6. [Giro & Cek — the full lifecycle](#6-giro--cek-the-full-lifecycle)
7. [Reports & Excel exports](#7-reports--excel-exports)
8. [Admin tasks](#8-admin-tasks)
9. [Accounting reference (account map & rules)](#9-accounting-reference)
10. [Common questions](#10-common-questions)

---

## 1. Getting started

### Logging in
1. Open **https://suryarodaperkasa-production.up.railway.app**
2. Enter your **email** and **password**.
3. **Authenticator code** — leave blank unless you have turned on two-factor security for
   your own account. If you have, enter the 6-digit code from your authenticator app.
4. Click **Sign in**.

If you type the wrong password **8 times**, the account locks for **15 minutes**. Wait, or
ask an admin.

### Roles
| Role | Can do |
|---|---|
| **Admin** | Everything, plus manage users, delete transactions, lock periods, reset data. |
| **Staff** | Record and view transactions and reports. Cannot delete or manage users. |

### Security (your own account)
- Go to **Account → Security** to change your password or turn on **two-factor (2FA)**.
- Every user should change their password after their first login.

### Language
The app is bilingual (English / Indonesian). Menu names below are given in English with the
Indonesian label in brackets where useful.

---

## 2. How the system thinks

You don't need to be an accountant to use this, but understanding these five ideas makes
everything else obvious.

1. **Double-entry.** Every transaction moves money between two or more accounts, and the
   debits always equal the credits. The system does this for you automatically — you just
   record *what happened* (a sale, a payment), and it writes the journal entry.

2. **Control accounts do the heavy lifting.** You never post directly to "Accounts
   Receivable" or "Accounts Payable." Instead you record a **Sale** or a **Payment**, and the
   system posts to the right control account:
   - **Piutang Dagang / Accounts Receivable — code 1100** (what customers owe you)
   - **Hutang Dagang / Accounts Payable — code 2000** (what you owe suppliers)
   - **Giro Dalam Penagihan / Giro-in-Transit — code 1150** (giro/cek received but not yet cashed)

3. **Customer balance is a running total.** A customer's receivable = all their sales −
   all their receipts − returns + any opening balance. There is **no "apply this payment to
   that specific invoice"** step — a receipt simply reduces the customer's total balance.
   This keeps data entry fast and is why overpayments are handled automatically (see below).

4. **Inventory is weighted-average cost.** Each product tracks quantity on hand and an
   average unit cost. Buying updates the average; selling records COGS at that average.

5. **The books must always balance.** The **Trial Balance** and **Balance Sheet** will tell
   you if something is off. If you use the app normally (record sales, purchases, payments,
   expenses), it stays balanced on its own.

---

## 3. Set up your master data first

Before recording transactions, make sure these exist. Set them up in this order.

### a) Chart of Accounts — `Ledger → Chart of Accounts` (/accounts)
The standard SRP chart of accounts is already loaded (cash, banks, AR, AP, inventory,
revenue, COGS, expenses). You only add a new account when you open a **new bank account**,
need a **new expense category**, etc. See [Section 4](#4-chart-of-accounts--the-proper-format)
for the exact format.

### b) Products — `Inventory → Products` (/products)
Click **New product**. Give each product an **SKU** (code), **name**, selling price, and
starting quantity/cost if you already have stock. The average cost updates as you buy.

### c) Customers — `Contacts → Customers` (/customers)
Click **New customer**. Fields that matter:
- **Name**, contact person, phone, email.
- **Salesman** — assign the salesman responsible (drives the Performance report).
- **Opening balance** — if the customer already owed you money when you started using the
  system, enter it here (with its due date). Leave at 0 for new customers.
- **Default payment terms / due date** — used to flag overdue invoices.

### d) Suppliers — `Contacts → Suppliers` (/suppliers)
Same idea as customers. Enter an **opening balance** if you already owed them money.

### e) Salesmen — `Contacts → Salesmen` (/salesmen)
Click **New salesman**. Set their **name** and **monthly target** (in Rupiah). Customers and
sales get linked to a salesman so the **Performance report** can measure attainment.

> **Deactivate, don't delete.** Once a customer, supplier, product, or account has any
> history, you cannot delete it (that would break the books). Instead edit it and set it to
> **Inactive** — it disappears from dropdowns but its history stays intact.

---

## 4. Chart of Accounts — the proper format

**This is the part to get right.** When you add a new account (`Chart of Accounts → New
account`), fill it in so it fits the existing structure.

### The fields
| Field | What to enter |
|---|---|
| **Code** | A number that fits the ranges below. Must be **unique**. |
| **Name** | Clear name, ideally bilingual, e.g. `Bank Mandiri (Operasional)`. |
| **Type** | One of: `ASSET`, `LIABILITY`, `EQUITY`, `INCOME`, `EXPENSE`. |
| **Normal balance** | `DEBIT` or `CREDIT` — follow the rule below. |
| **Expense category** | Only for EXPENSE accounts: `COGS`, `OPERATIONAL`, `FIXED`, `SALES`, or `OTHER`. |
| **Current / Long-term** | `Current` for most; `Long-term` for fixed assets and long-term loans. |
| **Status** | `Active`. |

### Code ranges (follow these!)
| Range | Category | Normal balance | Examples already in the system |
|---|---|---|---|
| **1000–1099** | Cash & Bank (ASSET) | **DEBIT** | 1000 Kas Besar, 1010 Bank BLA, 1016 Bank BCA PT |
| **1020–1021** | Foreign-currency bank (ASSET) | **DEBIT** | 1020 Bank USD, 1021 Bank CNY |
| **1100** | Accounts Receivable (ASSET) | DEBIT | 1100 Piutang Dagang — *do not duplicate* |
| **1150** | Giro-in-Transit (ASSET) | DEBIT | 1150 Giro Dalam Penagihan — *do not duplicate* |
| **1200** | Inventory (ASSET) | DEBIT | 1200 Persediaan |
| **1500–1599** | Fixed Assets (ASSET, long-term) | DEBIT | 1500 Aset Tetap; 1510 Akum. Penyusutan (**CREDIT**, contra) |
| **2000–2999** | Liabilities | **CREDIT** | 2000 Hutang Dagang, 2100 Hutang Bank, 2200 Hutang Pajak |
| **3000–3999** | Equity | **CREDIT** | 3000 Modal Pemilik, 3100 Laba Ditahan |
| **4000–4999** | Revenue/Income | **CREDIT** | 4000 Penjualan; 4900 Retur & Potongan (**DEBIT**, contra) |
| **5000–5999** | Cost of Goods Sold (EXPENSE/COGS) | DEBIT | 5000 Harga Pokok Penjualan |
| **6000–6999** | Operating & other expenses | **DEBIT** | see expense sub-groups below |

### Normal-balance rule (simple version)
- **Assets and Expenses → DEBIT.**
- **Liabilities, Equity, and Income → CREDIT.**
- **Exception — "contra" accounts** flip it: an account that *reduces* its group uses the
  opposite. Examples: `1510 Akumulasi Penyusutan` (reduces assets → CREDIT) and
  `4900 Retur & Potongan Penjualan` (reduces revenue → DEBIT).

### Expense sub-categories (6xxx)
When Type = EXPENSE, pick the **Expense category** so it lands in the right part of the
Income Statement:
| Expense category | Meaning | Examples |
|---|---|---|
| `COGS` | Cost of goods sold | 5000 |
| `OPERATIONAL` | Day-to-day running costs | 6000 Sewa Gudang, 6010 Listrik & Air, 6020 Gaji, 6050 Ekspedisi |
| `FIXED` | Fixed overheads | 6060 Adm Bank, 6600 Biaya Tetap |
| `SALES` | Selling/marketing costs | 6040 Marketing, 6070 Potongan Penjualan, 6800 Biaya Sales |
| `OTHER` | Everything else | 6850 Pajak & BPJS, 6895 Selisih Kurs, 6900 Lain-Lain |

### Worked example — adding a new bank account
You open a new account at Bank Mandiri. Add:
- **Code:** `1017` (next free number in the 10xx cash/bank range)
- **Name:** `Bank Mandiri`
- **Type:** `ASSET`
- **Normal balance:** `DEBIT`
- **Current/Long-term:** `Current`
- **Status:** `Active`

Save. It now appears everywhere you choose a cash/bank account (payments, expenses).

### Worked example — adding a new expense account
You start paying for internet separately. Add:
- **Code:** `6011` (near the other operational utilities)
- **Name:** `Biaya Internet & Telepon`
- **Type:** `EXPENSE`
- **Normal balance:** `DEBIT`
- **Expense category:** `OPERATIONAL`
- **Current/Long-term:** `Current`

---

## 5. Recording day-to-day transactions

### Recording a Sale (invoice) — `Transactions → Sales → New sale` (/sales/new)
1. Pick the **customer** and **date**.
2. Add **line items**: product, quantity, unit price. The total calculates automatically.
3. Set the **payment account**:
   - If the customer pays **immediately**, choose the cash/bank account the money went into.
   - If it's **on credit** (bayar nanti), choose the receivable option and set a **due date**.
4. Optionally assign the **salesman** (defaults from the customer).
5. Save.

**What it posts for you:** records the revenue (4000), the receivable or cash, and the cost
of goods sold (5000) against inventory (1200). You can open the sale and click **Invoice** to
print or export a clean invoice with gridlined tables.

### Recording a Purchase — `Transactions → Purchases → New purchase` (/purchases/new)
1. Pick the **supplier** and **date**.
2. Add line items: product, quantity, unit cost.
3. Choose whether it's paid now (cash/bank) or on credit (payable 2000, with a due date).
4. Save. Inventory quantity and **average cost** update automatically.

**Landed cost (import/freight):** open a purchase and use **Landed cost** to spread freight,
duty, and import charges across the items, so your product cost reflects the true landed
price.

### Recording a Payment or Receipt — `Transactions → Payments → New payment` (/payments/new)
This one screen handles **both** money in and money out.
1. **Type:**
   - `Customer receipt` — money coming **in** from a customer.
   - `Supplier payment` — money going **out** to a supplier.
2. Pick the **customer/supplier** and the **date**.
3. **Method:** `CASH`, `TRANSFER`, `GIRO`, or `CEK`.
4. **Account:** the cash/bank account the money moves through (for CASH/TRANSFER). For
   GIRO/CEK see [Section 6](#6-giro--cek-the-full-lifecycle).
5. **Amount** (in Rupiah).
6. Optional extras:
   - **Discount** (customer receipt only) — an early-payment discount; reduces revenue via 4900.
   - **Cash amount** — only for foreign-currency settlement, when the actual Rupiah that hit
     the bank differs from the invoice amount (the difference posts to 6895 Selisih Kurs).
   - **Reference / memo** — your own notes.
7. Save.

**Overpayment is handled automatically.** If a customer pays **more** than they owe, the
system warns you on screen, then records the extra as **Uang Muka Pelanggan (customer
advance)** — a credit the customer can use against their next invoice. On the balance sheet
this shows as a liability (money you're holding for them), and the customer's card shows
"Customer Advance" instead of a receivable.

### Recording an Expense — `Transactions → Expenses` (/expenses)
Use this for costs that aren't a supplier purchase of inventory (rent, salaries, utilities,
bank fees).
1. Pick the **date**, the **expense account** (a 6xxx account), and the **cash/bank account**
   it was paid from.
2. Enter the **amount** and a memo.
3. Save. It posts the expense (debit) against cash/bank (credit).

### Recording a Sales Return — `Transactions → Returns` (/returns), or from a sale
1. Open the original **sale** and choose **Return**, or go to **Returns → New**.
2. Enter the returned items/quantities.
3. Save. It reverses the revenue (via 4900), returns stock to inventory, and reduces the
   customer's receivable.

### Manual Journal Entry — `Ledger → Journal Entries → New` (/journal-entries/new)
For adjustments that aren't a normal transaction (depreciation, corrections, opening
balances). **Use sparingly** — most things should be recorded as the transaction types above
so inventory and balances stay correct.
1. Set the **date** and **memo**.
2. Add lines: for each, choose an **account** and enter a **debit** or **credit**.
3. **Total debits must equal total credits** — the form won't let you save otherwise.
4. Save.

> Note: Stock adjustment and transaction-linked entries can't be hand-edited here — edit or
> delete the underlying transaction instead.

---

## 6. Giro & Cek — the full lifecycle

Giro and cek (post-dated cheques) are common in Indonesian B2B and the system tracks them
through three stages using the **Giro-in-Transit (1150)** account.

**Stage 1 — Receive the giro/cek** (`New payment`, method `GIRO` or `CEK`):
- Enter the **instrument number**, **issuing bank**, and the **due date** (cair date).
- On save, the customer's receivable goes down and the amount **parks in Giro-in-Transit
  (1150)** — it's not cash yet. The payment shows as **Pending**.

**Stage 2a — Giro clears (cair):** when the bank honours it, mark it **cleared**. The system
moves the money from Giro-in-Transit (1150) into your actual bank account. Done.

**Stage 2b — Giro bounces (tolak):** if it's rejected, mark it **bounced**. The system
reverses it: the amount comes **out** of Giro-in-Transit and goes **back onto the customer's
receivable** (they still owe you). Follow up with the customer.

> **Why this matters:** a giro you're still holding isn't cash. Giro-in-Transit shows exactly
> how much is "in the pipeline." When it's 0, every giro has either cleared or bounced.

---

## 7. Reports & Excel exports

All reports are under the **Reports** menu. Each report page has a date range and, where
useful, a **"Unduh Excel"** button (top-right) that downloads a clean, professionally
formatted spreadsheet with gridlines.

| Report | What it tells you |
|---|---|
| **Analytics / Performance** (/reports/analytics) | Sales trends, salesman attainment vs target. |
| **Trial Balance** (/reports/trial-balance) | Every account's balance; proves debits = credits. |
| **Income Statement** (/reports/income-statement) | Revenue − COGS − expenses = profit, for a period. |
| **Balance Sheet** (/reports/balance-sheet) | Assets = Liabilities + Equity, at a date. Shows customer advances as a liability. |
| **Cash Flow** (/reports/cash-flow) | Where cash came in and went out. |
| **Inventory** (/reports/inventory) | Stock on hand and value. |
| **Monthly** (/reports/monthly) | One combined Excel workbook per month with all four core reports (Ringkasan, Laba Rugi, Neraca, Arus Kas). |
| **Customer card (Kartu Piutang)** | On a customer's page — their full running statement of sales, payments, and balance. |

**To export:** open the report, set the date range, click **Unduh Excel** (or **Excel** on
the Monthly page). The file downloads ready to send to your accountant.

---

## 8. Admin tasks

(Admins only, under **Admin** in the sidebar.)

- **Users** (/users) — create staff accounts, assign roles, reset passwords.
- **Audit Log** (/audit-log) — a record of sensitive actions (deletions, edits) and who did them.
- **Period Lock** (/period-lock) — lock a closed month so nobody can change past entries.
  Lock each month once your accountant has signed off.
- **Reset Data** (/reset-data) — **danger:** clears all transactions and master data (keeps
  logins and the chart of accounts). Only for clearing out practice/test data. Requires
  typing `RESET` to confirm.

---

## 9. Accounting reference

### The control accounts you should never post to directly
| Code | Account | The system posts here when you… |
|---|---|---|
| 1100 | Piutang Dagang (AR) | record a credit sale / a customer receipt |
| 1150 | Giro Dalam Penagihan | receive / clear / bounce a giro or cek |
| 1200 | Persediaan (Inventory) | buy or sell products |
| 2000 | Hutang Dagang (AP) | record a credit purchase / a supplier payment |
| 4000 | Penjualan (Revenue) | record a sale |
| 4900 | Retur & Potongan | record a return or receipt discount |
| 5000 | Harga Pokok Penjualan (COGS) | record a sale (cost side) |
| 6895 | Laba/Rugi Selisih Kurs | settle a foreign-currency payment at a different rate |
| 2400 | Uang Muka Pelanggan | a customer overpays (shown on the balance sheet) |

### Normal balances at a glance
- **DEBIT-normal:** Assets (1xxx), Expenses & COGS (5xxx–6xxx).
- **CREDIT-normal:** Liabilities (2xxx), Equity (3xxx), Income (4xxx).
- **Contra (flipped):** 1510 Akumulasi Penyusutan (CREDIT), 4900 Retur & Potongan (DEBIT).

### Account type → where it appears
- `ASSET`, `LIABILITY`, `EQUITY` → **Balance Sheet**
- `INCOME`, `EXPENSE` → **Income Statement**

---

## 10. Common questions

**"How do I record money a customer paid me?"**
Transactions → Payments → New payment → Type `Customer receipt` → pick the customer, method,
and the bank/cash account → enter amount → Save.

**"A customer paid with a giro — what do I do?"**
Record it as a payment with method `GIRO`, enter the giro number, bank, and due date. It parks
in Giro-in-Transit. When it clears, mark it **cleared**; if it bounces, mark it **bounced**.
See [Section 6](#6-giro--cek-the-full-lifecycle).

**"A customer paid too much. Where did the extra go?"**
It's automatically recorded as **Uang Muka Pelanggan (customer advance)** — a credit against
their next invoice. It shows as a liability on the balance sheet and as "Customer Advance" on
their card.

**"How do I add a new bank account / expense category?"**
Chart of Accounts → New account. Follow the code ranges and normal-balance rule in
[Section 4](#4-chart-of-accounts--the-proper-format). Bank → code in 10xx, Type ASSET, DEBIT.
Expense → code in 6xxx, Type EXPENSE, DEBIT, and pick an expense category.

**"I can't delete a customer/product/account."**
That's on purpose — it has history. Edit it and set **Inactive** instead.

**"The balance sheet doesn't balance / a number looks wrong."**
Check the **Trial Balance** first. Usually it's a manual journal entry that was entered
incorrectly, or a transaction that should be edited. Avoid fixing things with manual journals
unless you're sure.

**"Can I use this on my phone?"**
Yes — it's a website, so it works in any phone browser. For heavy data entry a laptop is
easier, but salesmen can check things on mobile.

**"How do I send reports to the accountant?"**
Open the report (or the Monthly page), set the dates, click **Unduh Excel**, and email the
downloaded file.

---

*Keep this guide up to date as the system grows. When in doubt, upload it to Claude and ask
your question in plain words.*

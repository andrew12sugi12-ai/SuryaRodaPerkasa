import {
  PrismaClient,
  AccountType,
  NormalBalance,
  ExpenseCategory,
  Role,
} from "../src/generated/prisma";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

const CHART_OF_ACCOUNTS: {
  code: string;
  name: string;
  type: AccountType;
  normalBalance: NormalBalance;
  expenseCategory?: ExpenseCategory;
  isLongTerm?: boolean;
}[] = [
  // Cash & bank (10xx) — matches the company's real cash locations
  { code: "1000", name: "Kas Besar", type: "ASSET", normalBalance: "DEBIT" },
  { code: "1001", name: "Kas Kecil", type: "ASSET", normalBalance: "DEBIT" },
  { code: "1002", name: "Kas Randy", type: "ASSET", normalBalance: "DEBIT" },
  { code: "1010", name: "Bank BLA", type: "ASSET", normalBalance: "DEBIT" },
  { code: "1011", name: "Bank BNI", type: "ASSET", normalBalance: "DEBIT" },
  { code: "1012", name: "Bank BUJ", type: "ASSET", normalBalance: "DEBIT" },
  { code: "1013", name: "Rek ADM (Dewi)", type: "ASSET", normalBalance: "DEBIT" },
  { code: "1014", name: "Bank Maybank BJA", type: "ASSET", normalBalance: "DEBIT" },
  { code: "1015", name: "Bank Danamon", type: "ASSET", normalBalance: "DEBIT" },
  { code: "1016", name: "Bank BCA PT", type: "ASSET", normalBalance: "DEBIT" },
  // Foreign-currency cash/bank (carried in IDR; see Selisih Kurs 6895)
  { code: "1020", name: "Bank USD", type: "ASSET", normalBalance: "DEBIT" },
  { code: "1021", name: "Bank CNY (RMB)", type: "ASSET", normalBalance: "DEBIT" },

  { code: "1100", name: "Piutang Dagang (Accounts Receivable)", type: "ASSET", normalBalance: "DEBIT" },
  { code: "1150", name: "Giro Dalam Penagihan (Giro in Transit)", type: "ASSET", normalBalance: "DEBIT" },
  { code: "1200", name: "Persediaan (Inventory)", type: "ASSET", normalBalance: "DEBIT" },
  { code: "1500", name: "Aset Tetap (Fixed Assets)", type: "ASSET", normalBalance: "DEBIT", isLongTerm: true },
  { code: "1510", name: "Akumulasi Penyusutan", type: "ASSET", normalBalance: "CREDIT", isLongTerm: true },

  { code: "2000", name: "Hutang Dagang (Accounts Payable)", type: "LIABILITY", normalBalance: "CREDIT" },
  { code: "2100", name: "Hutang Bank", type: "LIABILITY", normalBalance: "CREDIT", isLongTerm: true },
  { code: "2200", name: "Hutang Pajak", type: "LIABILITY", normalBalance: "CREDIT" },
  { code: "2300", name: "Hutang Bea Cukai & Impor", type: "LIABILITY", normalBalance: "CREDIT" },

  { code: "3000", name: "Modal Pemilik (Owner's Equity)", type: "EQUITY", normalBalance: "CREDIT" },
  { code: "3100", name: "Laba Ditahan (Retained Earnings)", type: "EQUITY", normalBalance: "CREDIT" },

  { code: "4000", name: "Penjualan (Sales Revenue)", type: "INCOME", normalBalance: "CREDIT" },
  { code: "4900", name: "Retur & Potongan Penjualan", type: "INCOME", normalBalance: "DEBIT" },

  { code: "5000", name: "Harga Pokok Penjualan (COGS)", type: "EXPENSE", normalBalance: "DEBIT", expenseCategory: "COGS" },

  // B. Operasional
  { code: "6000", name: "Biaya Sewa Gudang", type: "EXPENSE", normalBalance: "DEBIT", expenseCategory: "OPERATIONAL" },
  { code: "6010", name: "Biaya Listrik & Air", type: "EXPENSE", normalBalance: "DEBIT", expenseCategory: "OPERATIONAL" },
  { code: "6020", name: "Biaya Gaji Karyawan", type: "EXPENSE", normalBalance: "DEBIT", expenseCategory: "OPERATIONAL" },
  { code: "6030", name: "Biaya Perlengkapan Kantor", type: "EXPENSE", normalBalance: "DEBIT", expenseCategory: "OPERATIONAL" },
  { code: "6050", name: "Biaya Expedisi & Pengiriman", type: "EXPENSE", normalBalance: "DEBIT", expenseCategory: "OPERATIONAL" },
  { code: "6400", name: "Biaya Operasional (Umum)", type: "EXPENSE", normalBalance: "DEBIT", expenseCategory: "OPERATIONAL" },

  // B. Tetap
  { code: "6060", name: "Biaya Adm Bank", type: "EXPENSE", normalBalance: "DEBIT", expenseCategory: "FIXED" },
  { code: "6600", name: "Biaya Tetap (Umum)", type: "EXPENSE", normalBalance: "DEBIT", expenseCategory: "FIXED" },

  // B. Sales
  { code: "6040", name: "Biaya Marketing", type: "EXPENSE", normalBalance: "DEBIT", expenseCategory: "SALES" },
  { code: "6070", name: "Biaya Potongan Penjualan", type: "EXPENSE", normalBalance: "DEBIT", expenseCategory: "SALES" },
  { code: "6800", name: "Biaya Sales (Umum)", type: "EXPENSE", normalBalance: "DEBIT", expenseCategory: "SALES" },

  // B. Lain-Lain
  { code: "6850", name: "Biaya Pajak & BPJS", type: "EXPENSE", normalBalance: "DEBIT", expenseCategory: "OTHER" },
  { code: "6890", name: "Penyesuaian Persediaan", type: "EXPENSE", normalBalance: "DEBIT", expenseCategory: "OTHER" },
  { code: "6895", name: "Laba/Rugi Selisih Kurs (FX Gain/Loss)", type: "EXPENSE", normalBalance: "DEBIT", expenseCategory: "OTHER" },
  { code: "6900", name: "Biaya Lain-Lain", type: "EXPENSE", normalBalance: "DEBIT", expenseCategory: "OTHER" },
];

async function main() {
  for (const account of CHART_OF_ACCOUNTS) {
    await prisma.account.upsert({
      where: { code: account.code },
      update: {
        name: account.name,
        type: account.type,
        normalBalance: account.normalBalance,
        expenseCategory: account.expenseCategory ?? null,
      },
      create: {
        code: account.code,
        name: account.name,
        type: account.type,
        normalBalance: account.normalBalance,
        expenseCategory: account.expenseCategory ?? null,
        isLongTerm: account.isLongTerm ?? false,
      },
    });
  }
  console.log(`Seeded ${CHART_OF_ACCOUNTS.length} chart of accounts entries.`);

  const userCount = await prisma.user.count();
  if (userCount === 0) {
    const name = process.env.ADMIN_NAME || "Admin";
    const email = process.env.ADMIN_EMAIL || "admin@suryaroda.local";
    const password = process.env.ADMIN_PASSWORD || "change-me-now";

    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: await hashPassword(password),
        role: Role.ADMIN,
      },
    });
    console.log(`Created initial admin user: ${email}`);
  } else {
    console.log("Users already exist, skipping admin creation.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import '../config/env';
import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase, query } from '../db';

type SeedAccount = { fullName: string; email: string; password: string; role: 'SUPER_ADMIN' | 'ADMIN' | 'STUDENT'; profile?: { phone: string; faculty: string; department: string; semester: string; gender: string } };

async function seed() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required before creating accounts.');
  const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  // A shared database must never receive accounts with publicly known passwords.
  if (!isLocal && (!adminEmail || !adminPassword || adminPassword.length < 12 || adminPassword === 'JusaAdmin2026!')) {
    throw new Error('For a hosted database set SEED_ADMIN_EMAIL and a unique SEED_ADMIN_PASSWORD (12+ characters).');
  }
  await connectDatabase();

  const accounts: SeedAccount[] = [
    { fullName: 'JUTSA Super Administrator', email: adminEmail || 'admin1@jusa.test', password: adminPassword || 'JusaAdmin2026!', role: 'SUPER_ADMIN' },
  ];
  if (isLocal) {
    const profile = { phone: '+252610000000', faculty: 'Computer Science', department: 'Software Engineering', semester: '5', gender: 'MALE' };
    accounts.push(
      { fullName: 'JUTSA Administrator Two', email: 'admin2@jusa.test', password: 'JusaAdmin2026!', role: 'ADMIN' },
      { fullName: 'JUTSA Student One', email: 'student1@jusa.test', password: 'JusaStudent2026!', role: 'STUDENT', profile },
      { fullName: 'JUTSA Student Two', email: 'student2@jusa.test', password: 'JusaStudent2026!', role: 'STUDENT', profile: { ...profile, gender: 'FEMALE' } },
    );
  }

  for (const account of accounts) {
    // Passwords are only set when an account is first created, so re-running never resets them.
    await query(
      `INSERT INTO users (full_name, email, password_hash, role, phone, faculty, department, semester, gender)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role, status = 'ACTIVE', updated_at = now()`,
      [account.fullName, account.email, await bcrypt.hash(account.password, 12), account.role, account.profile?.phone ?? null, account.profile?.faculty ?? null, account.profile?.department ?? null, account.profile?.semester ?? null, account.profile?.gender ?? null],
    );
  }
  console.info(`Accounts ready: ${accounts.map((account) => `${account.email} (${account.role})`).join(', ')}`);
}

seed()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => disconnectDatabase());

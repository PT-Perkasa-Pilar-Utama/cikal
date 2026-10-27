import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { SeedContext } from "../../../../platform/migrate/module-data.js";
import { seedOrganizationIds } from "../../organization/index.js";
import { seedCompanyIds } from "../../tenancy/index.js";
import { PasswordHasher } from "../application/password-hasher.js";
import { users } from "../db/schema.js";
import { seedRoleIds } from "./roles.js";

interface UserSeed {
  /** Nomor tetap pembentuk ID; tidak boleh diubah setelah di-merge. */
  n: number;
  username: string;
  fullName: string;
  role: keyof typeof seedRoleIds;
  status?: "INACTIVE";
  /** Cabang unit kerja; pengajuan Sales mengikuti cabang pembuatnya untuk routing approval (RM-06). */
  branch?: "bandung";
}

/** Satu user per role untuk seed `dev` (DEPLOYMENT_PLAN §6.5); username contoh AC dipakai bila ada. */
const USER_SEEDS: UserSeed[] = [
  { n: 1, username: "maker.01", fullName: "Andi Pratama", role: "maker" },
  { n: 2, username: "checker.001", fullName: "Budi Santoso", role: "checker" },
  { n: 3, username: "sales.jkt01", fullName: "Sari Wulandari", role: "sales", branch: "bandung" },
  // User Inactive untuk AC-01.07.
  { n: 4, username: "sales.jkt02", fullName: "Dewi Lestari", role: "sales", status: "INACTIVE" },
  { n: 5, username: "superuser", fullName: "Super User", role: "superUser" },
  { n: 6, username: "admin.sistem", fullName: "Admin Sistem", role: "adminSistem" },
  { n: 7, username: "cs.01", fullName: "Rina Customer Service", role: "customerService" },
  { n: 8, username: "surveyor.01", fullName: "Agus Surveyor", role: "surveyor" },
  { n: 9, username: "verifikator.01", fullName: "Fitri Verifikator", role: "verifikator" },
  { n: 10, username: "supervisor.01", fullName: "Hendra Supervisor", role: "supervisor" },
  { n: 11, username: "risk.manager", fullName: "Indah Risk Manager", role: "riskManager" },
  { n: 12, username: "approver.01", fullName: "Joko Approver", role: "approver" },
  { n: 13, username: "kepala.cabang", fullName: "Kartika Kepala Cabang", role: "kepalaCabang", branch: "bandung" },
  { n: 14, username: "admin.ops", fullName: "Lukman Admin Operasional", role: "adminOperasional" },
  { n: 15, username: "auditor.01", fullName: "Maya Auditor", role: "auditor" },
  { n: 16, username: "compliance.01", fullName: "Nanda Compliance", role: "complianceOfficer" },
  { n: 17, username: "qa.01", fullName: "QA Tester", role: "qa" },
];

const userId = (n: number) => `0192b6aa-${String(n).padStart(4, "0")}-7000-8000-${String(n).padStart(12, "0")}`;

/** ID user seed menurut username, untuk seed modul lain, contoh approver di Approval Hierarchy. */
export function seedUserId(username: string): string {
  const user = USER_SEEDS.find((seed) => seed.username === username);
  if (!user) throw new Error(`No seeded user ${username}`);
  return userId(user.n);
}

/**
 * User seed company 001. Password semua akun seed satu per lingkungan dan berasal dari vault
 * (`SEED_USER_PASSWORD_FILE`), tidak pernah dari repo (DEPLOYMENT_PLAN §6.5).
 */
export async function seedUsers(db: NodePgDatabase, ctx: SeedContext): Promise<void> {
  if (!ctx.userPassword) throw new Error("SEED_USER_PASSWORD_FILE is required for the dev and qa seeds");
  const passwordHash = await new PasswordHasher().hash(ctx.userPassword);
  await db
    .insert(users)
    .values(
      USER_SEEDS.map((user) => ({
        id: userId(user.n),
        tenantId: seedCompanyIds.company001,
        username: user.username,
        fullName: user.fullName,
        email: `${user.username}@contoh.co.id`,
        passwordHash,
        mustChangePassword: false,
        roleId: seedRoleIds[user.role],
        branchId: user.branch ? seedOrganizationIds[user.branch] : null,
        status: user.status ?? ("ACTIVE" as const),
      })),
    )
    .onConflictDoNothing();
}

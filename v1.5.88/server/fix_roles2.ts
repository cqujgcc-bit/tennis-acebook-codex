import { getDb } from './server/db';
import { users, coachProfiles } from './drizzle/schema';
import { eq, inArray } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) { console.error('DB not available'); return; }
  
  // 1. 升级 a@a.com 为 admin
  const [aUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, 'a@a.com')).limit(1);
  if (aUser) {
    await db.update(users).set({ role: 'admin' }).where(eq(users.id, aUser.id));
    console.log('✅ a@a.com (id:', aUser.id, ') upgraded to admin');
  }
  
  // 2. 升级 coach@test.com 为 coach
  const [coachUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, 'coach@test.com')).limit(1);
  if (coachUser) {
    await db.update(users).set({ role: 'coach' }).where(eq(users.id, coachUser.id));
    console.log('✅ coach@test.com (id:', coachUser.id, ') upgraded to coach');
    
    // 3. 审核通过教练档案
    await db.update(coachProfiles).set({ 
      status: 'approved', 
      verificationStatus: 'approved',
      isVerified: true,
      isActive: true
    }).where(eq(coachProfiles.userId, coachUser.id));
    console.log('✅ coach profile approved');
  }
  
  // 4. 验证
  const result = await db.select({ 
    email: users.email, 
    role: users.role,
    coachStatus: coachProfiles.status
  }).from(users)
    .leftJoin(coachProfiles, eq(coachProfiles.userId, users.id))
    .where(inArray(users.email, ['a@a.com', 'coach@test.com']));
  console.log('验证结果:', JSON.stringify(result, null, 2));
  
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });

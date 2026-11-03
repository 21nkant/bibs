// Per-user daily cap on assistant messages (protects the API credits).
// One atomic statement: insert the day's row at 1, or increment it only while it is under the cap.
// When the cap is reached the conditional DO UPDATE matches nothing and RETURNING is empty, so two
// concurrent requests can never both slip past the limit.
import { sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { LIMITS } from "./config";
import { nyDateKey } from "./time";

const { agentUsage } = schema;

export async function consumeDailyMessage(
  userId: string,
  now: Date = new Date(),
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const limit = LIMITS.dailyMessages;
  const rows = await db
    .insert(agentUsage)
    .values({ userId, day: nyDateKey(now), count: 1 })
    .onConflictDoUpdate({
      target: [agentUsage.userId, agentUsage.day],
      set: { count: sql`${agentUsage.count} + 1` },
      setWhere: sql`${agentUsage.count} < ${limit}`,
    })
    .returning({ count: agentUsage.count });
  return rows.length ? { allowed: true, used: rows[0].count, limit } : { allowed: false, used: limit, limit };
}

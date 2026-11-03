import { seedDemo } from "@/lib/seed/demo";

// Vercel Cron calls this nightly so the demo always has games "tonight" and "this week".
// Vercel sends `Authorization: Bearer $CRON_SECRET`; anyone else gets 401.
export const maxDuration = 60;

export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  return Response.json(await seedDemo());
}

import { getWeeklyReport } from "../../../../lib/readingStore";

export async function GET() {
  return Response.json(getWeeklyReport());
}

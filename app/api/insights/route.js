import { getInsights } from "../../../lib/readingStore";

export async function GET() {
  return Response.json(getInsights());
}

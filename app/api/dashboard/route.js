import { getDashboard } from "../../../lib/readingStore";

export async function GET() {
  return Response.json(getDashboard());
}

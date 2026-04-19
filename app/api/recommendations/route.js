import { getRecommendations } from "../../../lib/readingStore";

export async function GET(request) {
  const theme = request.nextUrl.searchParams.get("theme") || "productivity";
  return Response.json({ theme, books: getRecommendations(theme) });
}

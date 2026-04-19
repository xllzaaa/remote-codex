import { getPrompts } from "../../../lib/readingStore";

export async function GET(request) {
  const bookId = Number(request.nextUrl.searchParams.get("bookId") || 0);
  return Response.json({ prompts: getPrompts(bookId) });
}

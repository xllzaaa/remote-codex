import { getDiscussionKit } from "../../../lib/readingStore";

export async function GET(request) {
  const bookId = Number(request.nextUrl.searchParams.get("bookId") || 0);
  const kit = getDiscussionKit(bookId);

  if (!kit) {
    return Response.json({ error: "no book available" }, { status: 404 });
  }

  return Response.json({ kit });
}

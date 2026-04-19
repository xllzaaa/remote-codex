import { createBook, listBooks } from "../../../lib/readingStore";

export async function GET() {
  return Response.json({ books: listBooks() });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const result = createBook(body);

  if (result.error) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  return Response.json(result, { status: 201 });
}

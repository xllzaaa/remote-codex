import { reviewQuote } from "../../../../../lib/readingStore";

function toId(raw) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function POST(request, { params }) {
  const id = toId(params.id);
  if (!id) {
    return Response.json({ error: "invalid id" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const result = reviewQuote(id, Boolean(body.remembered));

  if (result.error) {
    return Response.json({ error: result.error }, { status: 404 });
  }

  return Response.json(result);
}

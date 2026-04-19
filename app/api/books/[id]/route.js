import { deleteBook, updateBook } from "../../../../lib/readingStore";

function toId(raw) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PUT(request, { params }) {
  const id = toId(params.id);
  if (!id) {
    return Response.json({ error: "invalid id" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const result = updateBook(id, body);

  if (result.error) {
    return Response.json({ error: result.error }, { status: 404 });
  }

  return Response.json(result);
}

export async function DELETE(_request, { params }) {
  const id = toId(params.id);
  if (!id) {
    return Response.json({ error: "invalid id" }, { status: 400 });
  }

  const result = deleteBook(id);

  if (result.error) {
    return Response.json({ error: result.error }, { status: 404 });
  }

  return Response.json(result);
}

import { createTodo, listTodos } from "../../../lib/todoStore";

export async function GET() {
  return Response.json({ todos: listTodos() });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text.trim() : "";

  if (!text) {
    return Response.json({ error: "请填写任务内容" }, { status: 400 });
  }

  const todo = createTodo({
    text,
    priority: body.priority,
    bookId: body.bookId,
  });

  return Response.json({ todo }, { status: 201 });
}

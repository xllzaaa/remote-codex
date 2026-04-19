import { deleteTodo, getTodo, updateTodo } from "../../../../lib/todoStore";

function toId(param) {
  const id = Number(param);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(_request, { params }) {
  const id = toId(params.id);
  if (!id) {
    return Response.json({ error: "任务 ID 无效" }, { status: 400 });
  }

  const todo = getTodo(id);
  if (!todo) {
    return Response.json({ error: "任务不存在" }, { status: 404 });
  }

  return Response.json({ todo });
}

export async function PUT(request, { params }) {
  const id = toId(params.id);
  if (!id) {
    return Response.json({ error: "任务 ID 无效" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const patch = {};

  if (typeof body.text === "string") {
    patch.text = body.text.trim();
    if (!patch.text) {
      return Response.json({ error: "任务内容不能为空" }, { status: 400 });
    }
  }

  if (typeof body.done === "boolean") {
    patch.done = body.done;
  }

  if (typeof body.priority === "string") {
    patch.priority = body.priority;
  }

  if (Object.prototype.hasOwnProperty.call(body, "bookId")) {
    patch.bookId = body.bookId;
  }

  const todo = updateTodo(id, patch);
  if (!todo) {
    return Response.json({ error: "任务不存在" }, { status: 404 });
  }

  return Response.json({ todo });
}

export async function DELETE(_request, { params }) {
  const id = toId(params.id);
  if (!id) {
    return Response.json({ error: "任务 ID 无效" }, { status: 400 });
  }

  const ok = deleteTodo(id);
  if (!ok) {
    return Response.json({ error: "任务不存在" }, { status: 404 });
  }

  return Response.json({ success: true });
}

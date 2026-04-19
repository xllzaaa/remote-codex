import { getTodayPlan } from "../../../../lib/readingStore";
import { listTodos } from "../../../../lib/todoStore";

export async function GET() {
  return Response.json(getTodayPlan(listTodos()));
}

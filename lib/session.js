import { auth } from "@clerk/nextjs/server";

export async function getCurrentUserId() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("UNAUTHORIZED");
  }

  return userId;
}

export function unauthorizedResponse() {
  return Response.json({ error: "请先登录后再使用个人阅读工作台" }, { status: 401 });
}

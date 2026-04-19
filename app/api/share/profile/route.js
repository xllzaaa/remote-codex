import { getShareProfile } from "../../../../lib/readingStore";
import { getCurrentUserId } from "../../../../lib/session";

export async function GET(request) {
  const userId = await getCurrentUserId();
  const profile = await getShareProfile(userId);
  const origin = request.nextUrl.origin;

  return Response.json({
    ...profile,
    url: `${origin}/share/${profile.slug}`,
  });
}

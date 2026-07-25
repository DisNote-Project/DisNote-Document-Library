import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

/**
 * Called by the Content service after a publish/unpublish so the read-only
 * landing page picks up the new revision. Cache is keyed by revision upstream.
 */
export async function POST(request: Request): Promise<Response> {
  const { slug } = (await request.json()) as { slug?: string };
  if (!slug) return NextResponse.json({ ok: false }, { status: 400 });
  revalidatePath(`/${slug}`);
  return NextResponse.json({ ok: true, revalidated: slug });
}

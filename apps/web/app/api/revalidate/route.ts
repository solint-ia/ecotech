import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function POST(request: NextRequest) {
  try {
    const secret = request.headers.get('x-revalidation-secret') || request.nextUrl.searchParams.get('secret');
    const REVALIDATION_SECRET = process.env.REVALIDATION_SECRET;

    if (!REVALIDATION_SECRET || secret !== REVALIDATION_SECRET) {
      return NextResponse.json(
        { message: 'Invalid or missing secret' },
        { status: 401 }
      );
    }

    const { path } = await request.json();

    if (!path) {
      return NextResponse.json(
        { message: 'Missing path in request body' },
        { status: 400 }
      );
    }

    revalidatePath(path);
    console.log(`[Webhook] Successfully revalidated path: ${path}`);

    return NextResponse.json({
      revalidated: true,
      path,
      now: Date.now(),
    });
  } catch (err) {
    console.error('[Webhook Error]', err);
    return NextResponse.json(
      { message: 'Error revalidating path' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { auth } from './lib/auth';

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  const isAuthRoute =
    nextUrl.pathname.startsWith('/login') || nextUrl.pathname.startsWith('/recovery');
  const isDashboardRoute =
    nextUrl.pathname.startsWith('/admin') || nextUrl.pathname.startsWith('/escola');

  if (isAuthRoute) {
    // TEMPORARY FOR TESTING: Disabling the redirect so you can view the login page even if logged in
    /*
    if (isLoggedIn) {
      const role = (req.auth?.user as any)?.role;
      if (role === 'ADMIN') {
        return NextResponse.redirect(new URL('/admin', nextUrl));
      }
      if (role === 'SCHOOL_MANAGER') {
        return NextResponse.redirect(new URL('/escola', nextUrl));
      }
      return NextResponse.redirect(new URL('/feed', nextUrl));
    }
    */
    return NextResponse.next();
  }

  if (isDashboardRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/login', nextUrl));
    }

    const role = (req.auth?.user as any)?.role;
    if (nextUrl.pathname.startsWith('/admin') && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/feed', nextUrl));
    }
    if (nextUrl.pathname.startsWith('/escola') && role !== 'SCHOOL_MANAGER' && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/feed', nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};

import { NextResponse } from 'next/server';
import { auth } from './lib/auth';

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  const isAuthRoute =
    nextUrl.pathname.startsWith('/login') || nextUrl.pathname.startsWith('/recovery');
  const isDashboardRoute =
    nextUrl.pathname.startsWith('/admin') || nextUrl.pathname.startsWith('/escola');

  // Se for rota de autenticação, deixa passar
  if (isAuthRoute) {
    return NextResponse.next();
  }

  // Se não estiver logado, redireciona pra login (aplica a TODAS as outras rotas)
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL('/login', nextUrl));
  }

  // Se for rota de dashboard admin/escola, verifica roles
  if (isDashboardRoute) {
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

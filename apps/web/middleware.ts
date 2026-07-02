import { NextResponse } from 'next/server';
import { auth } from './lib/auth';

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  const isApiRoute = nextUrl.pathname.startsWith('/api');
  const isAuthRoute =
    nextUrl.pathname.startsWith('/login') || nextUrl.pathname.startsWith('/recovery');
  const isDashboardRoute =
    nextUrl.pathname.startsWith('/admin') || 
    nextUrl.pathname === '/escola' || 
    nextUrl.pathname.startsWith('/escola/');

  // Se for rota raiz, redireciona pro login imediatamente (o login redirecionará para o dashboard correto se logado)
  if (nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/login', nextUrl));
  }

  // Se for API ou rota de autenticação, deixa passar
  if (isApiRoute || isAuthRoute) {
    return NextResponse.next();
  }

  // Lista de rotas base protegidas
  const protectedRoutes = [
    '/admin',
    '/biblioteca',
    '/escola',
    '/escolas',
    '/feed',
    '/perfil',
    '/pontos',
    '/rede',
    '/trilhas'
  ];

  const isProtectedRoute = protectedRoutes.some(route => nextUrl.pathname.startsWith(route));

  // Se não estiver logado e tentar acessar uma rota restrita, redireciona pra login
  if (!isLoggedIn && isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', nextUrl));
  }

  // Se for rota de dashboard admin/escola, verifica roles
  if (isDashboardRoute) {
    const role = (req.auth?.user as any)?.role;
    if (nextUrl.pathname.startsWith('/admin') && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/feed', nextUrl));
    }
    if ((nextUrl.pathname === '/escola' || nextUrl.pathname.startsWith('/escola/')) && role !== 'SCHOOL_MANAGER' && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/feed', nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/activate',
  '/public',
  '/about',
  '/partner-with-maharashtra',
  '/pitch-development-need',
  '/track',
  '/standard-mou-template',
  '/csr-impact-dashboard',
  '/district-csr-ranking',
  '/statistics',
  '/downloads',
  '/faqs',
  '/feedback',
  '/gallery',
  '/stories',
  '/events',
  '/framework-policy',
  '/document-library',
  '/workflow',
  '/success-stories',
  '/csr-events',
  '/directory',
  '/completed-projects',
  '/public-development-needs',
  '/faq-news-recognition',
  '/knowledge',
  '/marketplace',
  '/csr-marketplace',
  '/circulars',
  '/news',
  '/contact',
  '/csr-policy',
  '/convergence',
  '/resources',
  '/reports',
  '/help'
];

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 1. Allow all public routes and subpaths
  const isPublicRoute = PUBLIC_ROUTES.some(
    route => path === route || path.startsWith(`${route}/`)
  );

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // 2. Check for the lightweight auth cookie synced on login
  const isAuthenticated = request.cookies.get('mahacsr_auth')?.value === '1';

  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', path);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|carousel|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot|csv|xlsx|pdf|geojson)$).*)',
  ],
};

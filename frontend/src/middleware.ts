import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Pass through all requests - page protection is handled by client-side PageGuard
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - carousel (carousel images)
     * - all static files with extensions (.png, .jpg, .svg, etc.)
     */
    '/((?!api|_next/static|_next/image|carousel|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot|csv|xlsx|pdf|geojson)$).*)',
  ],
};

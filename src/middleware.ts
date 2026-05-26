import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * PUBLIC routes - accessible without any authentication.
 */
const PUBLIC_PATH_PREFIXES = [
    '/',
    '/entrance',
    '/signup',
    '/admission',
    '/roles',
    '/api/auth/',
    '/api/public/',
    '/_next/',
    '/favicon.ico',
    '/fonts/',
];

const SESSION_COOKIE = 'edusy_auth_token';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 1. Handle pluralized /apis/ to /api/ normalization
    if (pathname.startsWith('/apis/')) {
        const newPathname = pathname.replace('/apis/', '/api/');
        const url = request.nextUrl.clone();
        url.pathname = newPathname;
        return NextResponse.rewrite(url);
    }

    // 2. Always allow public paths
    const isPublic = PUBLIC_PATH_PREFIXES.some((prefix) =>
        pathname === prefix || pathname.startsWith(prefix)
    );
    if (isPublic) return NextResponse.next();

    // 3. Check for auth token cookie
    const token = request.cookies.get(SESSION_COOKIE)?.value;

    if (!token) {
        // Not authenticated — redirect to login
        const loginUrl = new URL('/entrance', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // 4. Token exists — allow request to proceed
    return NextResponse.next();
}

export const config = {
    // Run middleware on all routes except static assets
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|fonts/).*)',
    ],
};

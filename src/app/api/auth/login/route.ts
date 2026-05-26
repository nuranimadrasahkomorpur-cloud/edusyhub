import { NextResponse } from 'next/server';
import prisma from '@/utils/db';
import { normalizeAuthIdentifier, normalizePassword } from '@/utils/digit-utils';


export async function POST(req: Request) {
    try {
        const body = await req.json();
        let identifier = normalizeAuthIdentifier(String(body.email || '') || String(body.phone || '') || String(body.username || '') || '');
        let password = normalizePassword(String(body.password || ''));

        if (!identifier || !password) {
            return NextResponse.json({ message: 'Missing fields' }, { status: 400 });
        }

        console.log('🔍 [DEBUG LOGIN] Normalised Identifier:', identifier);

        let user: any = null;

        // --- STEP 1: Search by Email (Case Insensitive) ---
        if (identifier.includes('@')) {
            try {
                user = await prisma.user.findFirst({
                    where: { email: { equals: identifier, mode: 'insensitive' } },
                    include: {
                        institutes: { select: { id: true, name: true, type: true, logo: true, coverImage: true, address: true } },
                        teacherProfiles: true
                    }
                });
            } catch (e) {
                console.error('⚠️ Email search error:', (e as Error).message);
            }
        }

        // --- STEP 2: Search by Phone (STRING) ---
        if (!user) {
            try {
                user = await prisma.user.findFirst({
                    where: { 
                        OR: [
                            { phone: identifier },
                            { phone: `+88${identifier}` },
                            { phone: `88${identifier}` },
                            ...(identifier.startsWith('0') ? [{ phone: identifier.slice(1) }] : []),
                            ...(!identifier.startsWith('0') ? [{ phone: `0${identifier}` }] : [])
                        ]
                    },
                    include: {
                        institutes: { select: { id: true, name: true, type: true, logo: true, coverImage: true, address: true } },
                        teacherProfiles: true
                    }
                });
            } catch (e) {
                console.error('⚠️ Phone search error:', (e as Error).message);
            }
        }

        // --- STEP 3: Search by Phone (NUMBER) ---
        if (!user && /^\d+$/.test(identifier)) {
            try {
                const numPhone = parseInt(identifier, 10);
                const rawResults = await (prisma as any).user.findRaw({
                    filter: { phone: numPhone }
                });

                if (rawResults && Array.isArray(rawResults) && rawResults.length > 0) {
                    const id = rawResults[0]._id?.$oid || rawResults[0]._id?.toString();
                    if (id) {
                        user = await prisma.user.findUnique({
                            where: { id },
                            include: {
                                institutes: { select: { id: true, name: true, type: true, logo: true, coverImage: true, address: true } },
                                teacherProfiles: true
                            }
                        });
                    }
                }
            } catch (e) {
                console.error('⚠️ Raw phone search error:', (e as Error).message);
            }
        }

        // --- STEP 4: Search by Student ID (Metadata) ---
        if (!user && !identifier.includes('@')) {
            try {
                // Try String ID
                let rawResults = await (prisma as any).user.findRaw({
                    filter: { "metadata.studentId": identifier }
                });

                // Try Numeric ID
                if ((!rawResults || rawResults.length === 0) && /^\d+$/.test(identifier)) {
                    rawResults = await (prisma as any).user.findRaw({
                        filter: { "metadata.studentId": parseInt(identifier, 10) }
                    });
                }

                if (rawResults && Array.isArray(rawResults) && rawResults.length > 0) {
                    const id = rawResults[0]._id?.$oid || rawResults[0]._id?.toString();
                    if (id) {
                        user = await prisma.user.findUnique({
                            where: { id },
                            include: {
                                institutes: { select: { id: true, name: true, type: true, logo: true, coverImage: true, address: true } },
                                teacherProfiles: true
                            }
                        });
                    }
                }
            } catch (e) {
                console.error('⚠️ Metadata search error:', (e as Error).message);
            }
        }

        if (!user) {
            console.log('❌ [LOGIN FAIL] ID not found in DB:', identifier);
            // DEBUG: Log first 2 users to see data format (REMOVE IN PROD)
            const sampleUsers = await prisma.user.findMany({ take: 2 });
            console.log('📊 [DATA SAMPLE] Format check:', JSON.stringify(sampleUsers, null, 2));

            return NextResponse.json({
                message: 'আপনার প্রদত্ত আইডি বা ইমেইল পাওয়া যায়নি।',
                debugHint: 'Check if phone starts with 0 or 88'
            }, { status: 401 });
        }

        // --- NEW: Status Check for Students & Guardians ---
        const userMetadata = (user.metadata as any) || {};
        
        if (user.role === 'STUDENT') {
            if (userMetadata.status === 'INACTIVE') {
                return NextResponse.json({ 
                    message: 'দুঃখিত, আপনার অ্যাকাউন্টটি বর্তমানে নিষ্ক্রিয় অবস্থায় রয়েছে। অনুগ্রহ করে এডমিনের সাথে যোগাযোগ করুন।' 
                }, { status: 403 });
            }
        } else if (user.role === 'GUARDIAN') {
            const childrenIds = userMetadata.childrenIds || [];
            if (childrenIds.length > 0) {
                // Find all linked students
                const children = await prisma.user.findMany({
                    where: {
                        id: { in: childrenIds },
                        role: 'STUDENT'
                    },
                    select: { metadata: true }
                });
                
                // Block if ALL linked students are inactive
                const allInactive = children.length > 0 && children.every(child => (child.metadata as any)?.status === 'INACTIVE');
                if (allInactive) {
                    return NextResponse.json({ 
                        message: 'দুঃখিত, আপনার সাথে সংযুক্ত সকল শিক্ষার্থীর অ্যাকাউন্ট বর্তমানে নিষ্ক্রিয় রয়েছে। লগইন করা সম্ভব নয়।' 
                    }, { status: 403 });
                }
            } else {
                // Guardian with no linked students - optionally block or allow
                // The request says "inactive student and his gaurdian", implying a link.
                // We'll allow for now if no children linked (maybe they are being set up).
            }
        }

        // --- STEP 5: Validate Password (Robust comparison) ---
        const storedPassword = String(user.password || '').trim();
        const storedPhone = String(user.phone || '').trim();
        const storedStudentId = String((user.metadata as any)?.studentId || '').trim();
        const inputPassword = password;

        const isPasswordValid =
            storedPassword === inputPassword ||
            (user.role === 'STUDENT' && storedStudentId === inputPassword) ||
            (storedPhone === inputPassword);

        if (!isPasswordValid) {
            console.log('❌ [LOGIN FAIL] Password mismatch for:', identifier);
            return NextResponse.json({ message: 'আপনার পাসওয়ার্ড সঠিক নয়।' }, { status: 401 });
        }

        console.log('🎉 [LOGIN SUCCESS] User type:', user.role);

        const userId = user.id || user._id?.toString();

        // Build response with user data
        const response = NextResponse.json({
            message: 'Login successful',
            user: {
                id: userId,
                email: user.email,
                role: user.role,
                name: user.name,
                phone: user.phone,
                metadata: user.metadata,
                defaultInstituteId: user.defaultInstituteId,
                institutes: user.institutes || [],
                teacherProfiles: user.teacherProfiles || []
            }
        });

        // Set HttpOnly auth cookie so the middleware can validate on every request
        // Token is the userId — middleware only checks presence, deep validation via API
        const isProduction = process.env.NODE_ENV === 'production';
        response.cookies.set('edusy_auth_token', userId, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30, // 30 days
            path: '/'
        });

        return response;

    } catch (error: any) {
        console.error('CRITICAL LOGIN ERROR:', error);
        return NextResponse.json({
            message: 'Internal server error',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}

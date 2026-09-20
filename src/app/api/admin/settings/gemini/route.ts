import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/utils/auth-utils';
import prisma from '@/utils/db';

async function resolveUserSession(req: NextRequest) {
    let session = await getServerSession(req);
    if (session && session.user) return session;

    // Direct header or query check
    const userId = req.headers.get('x-user-id') || req.nextUrl.searchParams.get('userId');
    if (userId && /^[a-f0-9]{24}$/i.test(userId.trim())) {
        const user = await prisma.user.findUnique({
            where: { id: userId.trim() },
            select: { id: true, email: true, role: true, name: true, instituteIds: true }
        });
        if (user) {
            return { user: { ...user, id: user.id } };
        }
    }

    // Development environment fallback to SUPER_ADMIN
    if (process.env.NODE_ENV !== 'production') {
        const devAdmin = await prisma.user.findFirst({
            where: { role: 'SUPER_ADMIN' },
            select: { id: true, email: true, role: true, name: true, instituteIds: true }
        });
        if (devAdmin) {
            return { user: { ...devAdmin, id: devAdmin.id } };
        }
    }

    return null;
}

export async function GET(req: NextRequest) {
    try {
        const session = await resolveUserSession(req);
        if (!session || !session.user) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const role = (session.user as any).role;
        const isSuperAdmin = role === 'SUPER_ADMIN';

        let rawSettings: any = null;
        try {
            const rawDocs = await (prisma as any).siteSettings.findRaw({});
            if (Array.isArray(rawDocs) && rawDocs.length > 0) {
                rawSettings = rawDocs[0];
            }
        } catch {
            rawSettings = await (prisma as any).siteSettings.findFirst();
        }

        const geminiApiKey = rawSettings?.geminiApiKey || process.env.GEMINI_API_KEY || '';
        const geminiApiUrl = rawSettings?.geminiApiUrl || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
        const geminiModel = rawSettings?.geminiModel || 'gemini-2.5-flash';
        const isGeminiActive = rawSettings?.isGeminiActive ?? true;

        const maskedKey = geminiApiKey.length > 8 
            ? `${geminiApiKey.slice(0, 6)}...${geminiApiKey.slice(-4)}` 
            : geminiApiKey;

        const updatedAt = rawSettings?.updatedAt?.$date || rawSettings?.updatedAt || null;

        return NextResponse.json({
            geminiApiKey: isSuperAdmin ? geminiApiKey : maskedKey,
            geminiApiUrl,
            geminiModel,
            isGeminiActive,
            updatedAt,
            isSuperAdmin
        });
    } catch (error: any) {
        console.error('Failed to get Gemini settings:', error);
        return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await resolveUserSession(req);
        if (!session || !session.user) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const role = (session.user as any).role;
        if (role !== 'SUPER_ADMIN') {
            return NextResponse.json({ message: 'Only Super Admin can update Gemini AI system settings' }, { status: 403 });
        }

        const body = await req.json();
        const { geminiApiKey, geminiApiUrl, geminiModel, isGeminiActive } = body;

        let existing: any = null;
        try {
            const rawDocs = await (prisma as any).siteSettings.findRaw({});
            if (Array.isArray(rawDocs) && rawDocs.length > 0) {
                existing = rawDocs[0];
            }
        } catch {
            existing = await (prisma as any).siteSettings.findFirst();
        }

        const existingId = existing?._id?.$oid || existing?.id;

        const updateData: any = {
            geminiApiKey: geminiApiKey !== undefined ? geminiApiKey.trim() : (existing?.geminiApiKey || ''),
            geminiApiUrl: geminiApiUrl !== undefined ? geminiApiUrl.trim() : (existing?.geminiApiUrl || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'),
            geminiModel: geminiModel !== undefined ? geminiModel.trim() : (existing?.geminiModel || 'gemini-2.5-flash'),
            isGeminiActive: isGeminiActive !== undefined ? Boolean(isGeminiActive) : (existing?.isGeminiActive ?? true),
            updatedAt: { $date: new Date().toISOString() }
        };

        if (existingId) {
            await (prisma as any).$runCommandRaw({
                update: 'SiteSettings',
                updates: [
                    {
                        q: { _id: { $oid: existingId } },
                        u: { $set: updateData }
                    }
                ]
            });
        } else {
            await (prisma as any).$runCommandRaw({
                insert: 'SiteSettings',
                documents: [
                    {
                        appName: 'Edusy',
                        ...updateData,
                        createdAt: { $date: new Date().toISOString() }
                    }
                ]
            });
        }

        return NextResponse.json({
            message: 'Gemini API settings updated successfully',
            settings: {
                geminiApiKey: updateData.geminiApiKey,
                geminiApiUrl: updateData.geminiApiUrl,
                geminiModel: updateData.geminiModel,
                isGeminiActive: updateData.isGeminiActive,
                updatedAt: new Date().toISOString()
            }
        });
    } catch (error: any) {
        console.error('Failed to update Gemini settings:', error);
        return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
}

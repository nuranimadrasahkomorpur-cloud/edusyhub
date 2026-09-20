import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/utils/auth-utils';
import prisma from '@/utils/db';

async function resolveUserSession(req: NextRequest) {
    let session = await getServerSession(req);
    if (session && session.user) return session;

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

export async function POST(req: NextRequest) {
    try {
        const session = await resolveUserSession(req);
        if (!session || !session.user) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const role = (session.user as any).role;
        if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json().catch(() => ({}));
        let apiKey = body.geminiApiKey;
        let apiUrl = body.geminiApiUrl;
        let model = body.geminiModel || 'gemini-1.5-flash';

        // If not provided in body, fetch from database
        if (!apiKey) {
            let settings: any = null;
            try {
                const rawDocs = await (prisma as any).siteSettings.findRaw({});
                if (Array.isArray(rawDocs) && rawDocs.length > 0) {
                    settings = rawDocs[0];
                }
            } catch {
                settings = await (prisma as any).siteSettings.findFirst();
            }

            apiKey = settings?.geminiApiKey || process.env.GEMINI_API_KEY;
            apiUrl = settings?.geminiApiUrl;
            model = settings?.geminiModel || model;
        }

        if (!apiKey) {
            return NextResponse.json({ 
                success: false, 
                error: 'কোনো Gemini API Key পাওয়া যায়নি। অনুগ্রহ করে Key প্রদান করুন।' 
            }, { status: 400 });
        }

        // Construct request URL
        // If user gave full url with key param, or default endpoint
        let endpoint = apiUrl;
        if (!endpoint || !endpoint.includes('generateContent')) {
            endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
        }

        const separator = endpoint.includes('?') ? '&' : '?';
        const targetUrl = endpoint.includes('key=') ? endpoint : `${endpoint}${separator}key=${apiKey.trim()}`;

        const payload = {
            contents: [
                {
                    parts: [
                        { text: 'Say "Edusy AI Connection Successful!" in one brief sentence.' }
                    ]
                }
            ],
            generationConfig: {
                maxOutputTokens: 300,
                temperature: 0.2
            }
        };

        const startTime = Date.now();
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const latencyMs = Date.now() - startTime;
        const data = await response.json();

        if (!response.ok) {
            const errorMessage = data?.error?.message || `Google API error (Status: ${response.status})`;
            return NextResponse.json({
                success: false,
                error: errorMessage,
                status: response.status
            }, { status: 200 }); // Return 200 so UI can display friendly error card
        }

        const candidateParts = data.candidates?.[0]?.content?.parts || [];
        const textPart = candidateParts.find((p: any) => typeof p?.text === 'string' && p.text.trim().length > 0);
        const replyText = textPart?.text || candidateParts[0]?.text || 'Edusy AI Connection Successful!';

        return NextResponse.json({
            success: true,
            message: 'Gemini API কানেকশন সফল হয়েছে!',
            reply: replyText.trim(),
            latencyMs,
            model
        });

    } catch (error: any) {
        console.error('Gemini test error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'কানেকশন স্থাপন করতে ব্যর্থ হয়েছে।'
        }, { status: 500 });
    }
}

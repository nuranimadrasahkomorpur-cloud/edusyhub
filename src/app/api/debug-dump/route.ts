import { NextResponse } from 'next/server';
import prisma from '@/utils/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const rawUsers = await prisma.$runCommandRaw({
            find: "User",
            filter: {
                $or: [
                    { phone: "01976559098" },
                    { phone: 1976559098 },
                    { phone: "1976559098" },
                    { phone: "+8801976559098" }
                ]
            }
        });

        // Write this to disk so I can read it!
        const fs = require('fs');
        const path = require('path');
        const debugPath = path.join(process.cwd(), 'debug_user_output.json');
        fs.writeFileSync(debugPath, JSON.stringify(rawUsers, null, 2));

        return NextResponse.json({ success: true, rawUsers });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message });
    }
}

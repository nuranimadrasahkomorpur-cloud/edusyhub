import { NextResponse } from 'next/server';
import prisma from '@/utils/db';
import fs from 'fs';
import path from 'path';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email') || 'hmdselim10@gmill.com';
    const phone = searchParams.get('phone') || '01976559098';
    
    const userByEmail = await prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } }
    });
    
    const userByPhone = await prisma.user.findFirst({
        where: { phone: { contains: phone, mode: 'insensitive' } }
    });
    
    // Write to a local file so I can read it!
    const debugPath = path.join(process.cwd(), 'debug_user_output.json');
    fs.writeFileSync(debugPath, JSON.stringify({ userByEmail, userByPhone }, null, 2));

    return NextResponse.json({ success: true, debugPath, userByEmail, userByPhone });
}

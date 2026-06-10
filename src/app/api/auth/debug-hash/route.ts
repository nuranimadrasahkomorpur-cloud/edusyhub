import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const hash = "$2b$10$tmfKT2wwol/fH1rFebO1EetiP.v7ASvkatClIEeAcAUJv1D1ksWhW";
    
    const isEnglish = await bcrypt.compare("123456", hash);
    const isBengali = await bcrypt.compare("১২৩৪৫৬", hash);
    const isSomethingElse = await bcrypt.compare("12345678", hash);

    const fs = require('fs');
    const path = require('path');
    const debugPath = path.join(process.cwd(), 'hash_debug.json');
    fs.writeFileSync(debugPath, JSON.stringify({ isEnglish, isBengali, isSomethingElse }, null, 2));

    return NextResponse.json({ isEnglish, isBengali, isSomethingElse });
}

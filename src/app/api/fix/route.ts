import { NextResponse } from 'next/server';
import prisma from '@/utils/db';

export async function GET(req: Request) {
    try {
        // Run MongoDB raw commands to update fields from Number to String
        
        // 1. Convert numeric passwords to strings
        await prisma.$runCommandRaw({
            update: "User",
            updates: [
                {
                    q: { password: { $type: "number" } },
                    u: [ { $set: { password: { $toString: "$password" } } } ],
                    multi: true
                }
            ]
        });

        // 2. Convert numeric phones to strings
        await prisma.$runCommandRaw({
            update: "User",
            updates: [
                {
                    q: { phone: { $type: "number" } },
                    u: [ { $set: { phone: { $toString: "$phone" } } } ],
                    multi: true
                }
            ]
        });

        return NextResponse.json({ success: true, message: "Database fields converted to strings successfully!" });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message });
    }
}

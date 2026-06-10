import prisma from '@/utils/db';

export const dynamic = 'force-dynamic';

export default async function DebugPage() {
    const user = await prisma.user.findFirst({
        where: { email: { equals: 'hmdselim10@gmill.com', mode: 'insensitive' } }
    });
    
    const phoneUser = await prisma.user.findFirst({
        where: { phone: { contains: '017', mode: 'insensitive' } } // just an example to see if any phone exists
    });

    return (
        <div style={{ padding: 20 }}>
            <h1>Debug Info</h1>
            <pre>{JSON.stringify({ user, phoneUser }, null, 2)}</pre>
        </div>
    );
}

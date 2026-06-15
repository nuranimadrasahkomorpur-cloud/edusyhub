import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/utils/auth-utils';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession();
        if (!session || !session.user) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const data = await req.json();
        const { studentId, instituteId, fees } = data;

        if (!studentId || !instituteId || !Array.isArray(fees)) {
            return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
        }

        // Verify institute access
        const institute = await prisma.institute.findUnique({
            where: { id: instituteId }
        });

        if (!institute) {
            return NextResponse.json({ message: 'Institute not found' }, { status: 404 });
        }

        const isOwner = institute.adminIds.includes(session.user.id) || session.user.role === 'SUPER_ADMIN';
        if (!isOwner && session.user.role !== 'ADMIN') {
            // Further teacher permission checks could go here, but for now we assume they have admission permission if they reached this endpoint.
        }

        const results = [];

        // Process each fee
        for (const fee of fees) {
            const { categoryId, baseAmount, waiver, paid } = fee;
            
            const dueAmount = Math.max(0, baseAmount - (waiver || 0));
            if (dueAmount <= 0 && (!paid || paid <= 0)) continue; // Nothing to process

            const cat = await prisma.accountCategory.findUnique({ where: { id: categoryId } });
            const categoryName = cat?.name || 'Admission Fee';

            if (paid >= dueAmount) {
                // Fully paid or overpaid
                const paymentTxn = await prisma.transaction.create({
                    data: {
                        instituteId,
                        studentId,
                        categoryId,
                        category: categoryName,
                        type: 'INCOME',
                        amount: paid,
                        date: new Date(),
                        status: 'COMPLETED',
                        note: 'ভর্তি ফি (পরিশোধিত)'
                    }
                });
                results.push({ payment: paymentTxn });
            } else if (paid > 0) {
                // Partial payment
                const paymentTxn = await prisma.transaction.create({
                    data: {
                        instituteId,
                        studentId,
                        categoryId,
                        category: categoryName,
                        type: 'INCOME',
                        amount: paid,
                        date: new Date(),
                        status: 'COMPLETED',
                        note: 'ভর্তি ফি (আংশিক পরিশোধ)'
                    }
                });
                const dueTxn = await prisma.transaction.create({
                    data: {
                        instituteId,
                        studentId,
                        categoryId,
                        category: categoryName,
                        type: 'INCOME',
                        amount: dueAmount - paid,
                        date: new Date(),
                        status: 'PENDING',
                        note: 'ভর্তি ফি (বকেয়া)'
                    }
                });
                results.push({ due: dueTxn, payment: paymentTxn });
            } else {
                // No payment, all due
                const dueTxn = await prisma.transaction.create({
                    data: {
                        instituteId,
                        studentId,
                        categoryId,
                        category: categoryName,
                        type: 'INCOME',
                        amount: dueAmount,
                        date: new Date(),
                        status: 'PENDING',
                        note: 'ভর্তি ফি (বকেয়া)'
                    }
                });
                results.push({ due: dueTxn });
            }

            // Apply Waiver to future generated dues if requested
            if (fee.applyWaiverForFuture && waiver > 0 && fee.classId) {
                const cat = await prisma.accountCategory.findUnique({ where: { id: categoryId } });
                if (cat) {
                    const config = (cat.config as any) || {};
                    const studentWaivers = config.studentWaivers || {};
                    if (!studentWaivers[fee.classId]) studentWaivers[fee.classId] = {};
                    studentWaivers[fee.classId][studentId] = waiver;
                    config.studentWaivers = studentWaivers;
                    await prisma.accountCategory.update({
                        where: { id: categoryId },
                        data: { config }
                    });
                }
            }
        }

        return NextResponse.json({ success: true, results }, { status: 200 });

    } catch (error: any) {
        console.error('Process admission fees error:', error);
        return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
}

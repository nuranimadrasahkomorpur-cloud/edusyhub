import { NextResponse } from 'next/server';
import prisma from '@/utils/db';

// POST: Collect fees for a student
export async function POST(req: Request) {
    try {
        const data = await req.json();
        const {
            instituteId,
            studentId,
            studentName,
            paidAmount,         // total amount being paid now
            selectedFeeIds,     // array of pending transaction IDs to pay
            applyAdvanceTo,     // optional: categoryId to apply existing advance balance to
            paymentNote,
        } = data;

        if (!instituteId || !studentId || !paidAmount) {
            return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
        }

        // 1. Fetch the selected pending fee transactions
        const selectedFees = await (prisma as any).transaction.findMany({
            where: {
                id: { in: selectedFeeIds || [] },
                studentId,
                status: 'PENDING'
            }
        });

        // 2. Fetch any existing advance balance for this student
        const advanceTxn = await (prisma as any).transaction.findFirst({
            where: {
                studentId,
                instituteId,
                type: 'INCOME',
                status: 'COMPLETED',
                category: { startsWith: '__ADVANCE__' }
            }
        });
        const existingAdvance = advanceTxn?.amount || 0;

        const totalDue = selectedFees.reduce((sum: number, f: any) => sum + f.amount, 0);
        const totalPayable = paidAmount + existingAdvance;
        const advanceAmount = Math.max(0, totalPayable - totalDue);

        // 3. Generate receipt number for this payment
        const lastIncomeTxn = await (prisma as any).transaction.findFirst({
            where: { instituteId, type: 'INCOME', receiptNo: { not: null } },
            orderBy: { createdAt: 'desc' }
        });
        let nextNumber = 1;
        if (lastIncomeTxn?.receiptNo) {
            const match = lastIncomeTxn.receiptNo.match(/\d+$/);
            if (match) nextNumber = parseInt(match[0], 10) + 1;
        }
        const receiptNo = `R-${nextNumber.toString().padStart(5, '0')}`;

        // 4. Mark selected fees as COMPLETED (paid)
        let remaining = parseFloat(paidAmount.toString()) + existingAdvance;
        const completedFeeIds: string[] = [];

        for (const fee of selectedFees) {
            if (remaining <= 0) break;
            if (remaining >= fee.amount) {
                // Fully pay this fee
                await (prisma as any).transaction.update({
                    where: { id: fee.id },
                    data: {
                        status: 'COMPLETED',
                        note: paymentNote || '',
                        receiptNo,
                        date: new Date()
                    }
                });
                completedFeeIds.push(fee.id);
                remaining -= fee.amount;
            } else {
                // Partial payment: split the fee
                // Mark original as CANCELLED, create new COMPLETED for partial amount
                // and keep a new PENDING for remainder
                await (prisma as any).transaction.update({
                    where: { id: fee.id },
                    data: { status: 'CANCELLED' }
                });
                // Create COMPLETED for the paid portion
                await (prisma as any).transaction.create({
                    data: {
                        amount: remaining,
                        type: 'INCOME',
                        category: fee.category,
                        categoryId: fee.categoryId,
                        studentId: fee.studentId,
                        studentName: fee.studentName,
                        classId: fee.classId,
                        className: fee.className,
                        status: 'COMPLETED',
                        note: `${paymentNote || ''} (আংশিক পরিশোধ)`,
                        receiptNo,
                        date: new Date(),
                        createdAt: fee.createdAt,
                        instituteId
                    }
                });
                // Create PENDING for the remainder
                await (prisma as any).transaction.create({
                    data: {
                        amount: fee.amount - remaining,
                        type: 'INCOME',
                        category: fee.category,
                        categoryId: fee.categoryId,
                        studentId: fee.studentId,
                        studentName: fee.studentName,
                        classId: fee.classId,
                        className: fee.className,
                        status: 'PENDING',
                        note: 'বকেয়া (আংশিক পরিশোধের পরে)',
                        date: fee.date,
                        createdAt: fee.createdAt,
                        instituteId
                    }
                });
                remaining = 0;
            }
        }

        // 5. Handle advance balance
        // Delete old advance record if it exists
        if (advanceTxn) {
            await (prisma as any).transaction.delete({ where: { id: advanceTxn.id } });
        }

        let advanceAction = 'none';
        if (advanceAmount > 0) {
            // Store new advance balance
            await (prisma as any).transaction.create({
                data: {
                    amount: advanceAmount,
                    type: 'INCOME',
                    category: `__ADVANCE__${studentId}`,
                    studentId,
                    studentName,
                    status: 'COMPLETED',
                    note: 'অগ্রিম জমা (অতিরিক্ত পরিশোধ)',
                    date: new Date(),
                    instituteId
                }
            });
            advanceAction = 'stored';

            // If user wants to apply advance to a specific pending fee
            if (applyAdvanceTo) {
                const targetFee = await (prisma as any).transaction.findFirst({
                    where: {
                        id: applyAdvanceTo,
                        studentId,
                        status: 'PENDING'
                    }
                });
                if (targetFee && advanceAmount >= targetFee.amount) {
                    // Delete stored advance and mark the fee as paid
                    await (prisma as any).transaction.deleteMany({
                        where: {
                            studentId,
                            category: `__ADVANCE__${studentId}`,
                            status: 'COMPLETED'
                        }
                    });
                    const nextReceiptNo = `R-${(nextNumber + 1).toString().padStart(5, '0')}`;
                    await (prisma as any).transaction.update({
                        where: { id: applyAdvanceTo },
                        data: {
                            status: 'COMPLETED',
                            note: 'অগ্রিম ব্যালেন্স থেকে পরিশোধ',
                            receiptNo: nextReceiptNo,
                            date: new Date()
                        }
                    });
                    // If there's leftover advance, store that
                    const leftover = advanceAmount - targetFee.amount;
                    if (leftover > 0) {
                        await (prisma as any).transaction.create({
                            data: {
                                amount: leftover,
                                type: 'INCOME',
                                category: `__ADVANCE__${studentId}`,
                                studentId,
                                studentName,
                                status: 'COMPLETED',
                                note: 'অগ্রিম জমা (অতিরিক্ত)',
                                date: new Date(),
                                instituteId
                            }
                        });
                    }
                    advanceAction = 'applied';
                }
            }
        }

        // Fetch student photo from User metadata
        let studentPhoto = null;
        let fatherName = null;
        let mobileNumber = null;
        if (studentId) {
            const studentUser = await (prisma as any).user.findUnique({
                where: { id: studentId },
                select: { metadata: true, phone: true }
            });
            if (studentUser?.metadata) {
                studentPhoto = studentUser.metadata.studentPhoto || null;
                fatherName = studentUser.metadata.fathersName || studentUser.metadata.guardianName || null;
                mobileNumber = studentUser.metadata.fathersPhone || studentUser.metadata.guardianPhone || studentUser.phone || null;
            }
        }

        return NextResponse.json({
            success: true,
            receiptNo,
            completedFees: completedFeeIds.length,
            advanceAmount,
            advanceAction,
            message: advanceAmount > 0
                ? `সফল! ৳${advanceAmount} অগ্রিম ব্যালেন্স হিসেবে জমা হয়েছে।`
                : `সফলভাবে ফি গ্রহণ করা হয়েছে।`,
            receiptDetails: {
                receiptNo,
                studentName,
                studentUniqueId: selectedFees[0]?.studentUniqueId,
                studentPhoto,
                fatherName,
                mobileNumber,
                date: new Date().toISOString(),
                status: 'COMPLETED',
                amount: parseFloat(paidAmount.toString()),
                subTransactions: selectedFees.map((f: any) => {
                    let finalNote = f.note || '';
                    if (paymentNote) {
                        finalNote = finalNote ? `${finalNote} - ${paymentNote}` : paymentNote;
                    }
                    
                    let displayCategory = f.category;
                    if (displayCategory && displayCategory.includes('মাসিক')) {
                        const targetDate = f.status === 'PENDING' ? f.date : (f.createdAt || f.date);
                        const d = new Date(targetDate);
                        const monthYear = d.toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' });
                        const baseCat = displayCategory.replace(/\s*-?\s*\d{4}\s*$/, '').trim();
                        displayCategory = `${baseCat} (${monthYear})`;
                    }

                    return {
                        originalCategory: f.category,
                        category: displayCategory,
                        note: finalNote,
                        amount: f.amount,
                        date: f.date,
                        createdAt: f.createdAt
                    };
                })
            }
        });
    } catch (error: any) {
        console.error('Collect Fee Error:', error);
        return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
}

// GET: Get student's advance balance and pending fees
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const studentId = searchParams.get('studentId');
        const instituteId = searchParams.get('instituteId');

        if (!studentId || !instituteId) {
            return NextResponse.json({ message: 'Missing required params' }, { status: 400 });
        }

        const advanceTxn = await (prisma as any).transaction.findFirst({
            where: {
                studentId,
                instituteId,
                type: 'INCOME',
                status: 'COMPLETED',
                category: { startsWith: '__ADVANCE__' }
            }
        });

        const pendingFees = await (prisma as any).transaction.findMany({
            where: { studentId, instituteId, status: 'PENDING' },
            orderBy: { date: 'asc' }
        });

        const formattedPendingFees = pendingFees.map((t: any) => {
            let displayCategory = t.category;
            if (displayCategory && displayCategory.includes('মাসিক')) {
                // For pending fees, date is the due date
                const targetDate = t.status === 'PENDING' ? t.date : (t.createdAt || t.date);
                const d = new Date(targetDate);
                const monthYear = d.toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' });
                const baseCat = displayCategory.replace(/\s*-?\s*\d{4}\s*$/, '').trim();
                displayCategory = `${baseCat} (${monthYear})`;
            }
            return {
                ...t,
                originalCategory: t.category,
                category: displayCategory
            };
        });

        return NextResponse.json({
            advanceBalance: advanceTxn?.amount || 0,
            pendingFees: formattedPendingFees
        });
    } catch (error: any) {
        return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
}

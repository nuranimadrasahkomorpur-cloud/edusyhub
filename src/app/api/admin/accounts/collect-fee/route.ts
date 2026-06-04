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
            futureFeesToCreate, // array of predicted fees to prepay
            applyAdvanceTo,     // optional: categoryId to apply existing advance balance to
            paymentNote,
            useAdvance,         // boolean to control whether to use existing advance
            appliedWaivers,     // array of { feeId, amount, applyToFuture, categoryId }
        } = data;

        if (!instituteId || !studentId || paidAmount === undefined || paidAmount === null) {
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

        // 1.5 Apply waivers to selected fees before calculating totals
        if (appliedWaivers && appliedWaivers.length > 0) {
            for (const waiver of appliedWaivers) {
                if (waiver.amount <= 0) continue;
                const feeIndex = selectedFees.findIndex((f: any) => f.id === waiver.feeId);
                if (feeIndex > -1) {
                    const fee = selectedFees[feeIndex];
                    const newAmount = Math.max(0, fee.amount - waiver.amount);
                    
                    // Update in DB so the fee amount is correctly recorded
                    await (prisma as any).transaction.update({
                        where: { id: fee.id },
                        data: {
                            amount: newAmount,
                            note: fee.note ? `${fee.note} | Waiver: ৳${waiver.amount}` : `Waiver: ৳${waiver.amount}`
                        }
                    });
                    // Update local object for subsequent total calculation
                    selectedFees[feeIndex].amount = newAmount;
                    selectedFees[feeIndex].note = fee.note ? `${fee.note} | Waiver: ৳${waiver.amount}` : `Waiver: ৳${waiver.amount}`;
                }
                
                // If applying to future, update the AccountCategory's studentWaivers
                if (waiver.applyToFuture && waiver.categoryId) {
                    const category = await (prisma as any).accountCategory.findUnique({
                        where: { id: waiver.categoryId }
                    });
                    if (category && category.config) {
                        const classId = selectedFees[feeIndex]?.classId;
                        if (classId) {
                            const currentConfig = category.config;
                            const studentWaivers = currentConfig.studentWaivers || {};
                            if (!studentWaivers[classId]) studentWaivers[classId] = {};
                            studentWaivers[classId][studentId] = (studentWaivers[classId][studentId] || 0) + waiver.amount;
                            
                            await (prisma as any).accountCategory.update({
                                where: { id: waiver.categoryId },
                                data: { config: { ...currentConfig, studentWaivers } }
                            });
                        }
                    }
                }
            }
        }

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
        const existingAdvance = (useAdvance !== false) ? (advanceTxn?.amount || 0) : 0;

        const totalDue = selectedFees.reduce((sum: number, f: any) => sum + f.amount, 0);
        const totalPayable = paidAmount + existingAdvance;
        const advanceAmount = Math.max(0, totalPayable - totalDue);

        // 3. Generate receipt number for this payment
        const lastIncomeTxn = await (prisma as any).transaction.findFirst({
            where: { instituteId, type: 'INCOME', receiptNo: { not: null } },
            orderBy: { receiptNo: 'desc' }
        });
        
        let nextNumber = 1;
        if (lastIncomeTxn?.receiptNo) {
            const match = lastIncomeTxn.receiptNo.match(/\d+$/);
            if (match) nextNumber = parseInt(match[0], 10) + 1;
        }

        // Also check if there's a deleted receipt number sequence stored in Institute
        const instituteInfo = await (prisma as any).institute.findUnique({
            where: { id: instituteId },
            select: { notificationSettings: true }
        });
        const savedSeq = instituteInfo?.notificationSettings?.lastReceiptNumber;
        if (savedSeq && typeof savedSeq === 'number' && savedSeq >= nextNumber) {
            nextNumber = savedSeq + 1;
        }

        const receiptNo = `R-${nextNumber.toString().padStart(5, '0')}`;

        // 4. Mark selected fees as COMPLETED (paid)
        let remaining = parseFloat(paidAmount.toString()) + existingAdvance;
        const completedFeeIds: string[] = [];

        for (const fee of selectedFees) {
            if (remaining <= 0 && fee.amount > 0) break;
            if (remaining >= fee.amount) {
                // Fully pay this fee
                await (prisma as any).transaction.update({
                    where: { id: fee.id },
                    data: {
                        status: 'COMPLETED',
                        note: paymentNote || '',
                        receiptNo
                        // Do not overwrite date, keep original due date
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
                        date: fee.date, // Preserve original due date
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

        // Process future fees if remaining > 0
        if (futureFeesToCreate && futureFeesToCreate.length > 0) {
            for (const fee of futureFeesToCreate) {
                if (remaining <= 0) break;
                if (remaining >= fee.amount) {
                    await (prisma as any).transaction.create({
                        data: {
                            amount: fee.amount,
                            type: 'INCOME',
                            category: fee.originalCategory || fee.category,
                            categoryId: fee.categoryId,
                            studentId: fee.studentId,
                            studentName: fee.studentName,
                            status: 'COMPLETED',
                            note: paymentNote ? `${paymentNote} (অগ্রিম পরিশোধ)` : 'অগ্রিম পরিশোধ',
                            receiptNo,
                            date: new Date(fee.date),
                            instituteId
                        }
                    });
                    completedFeeIds.push(fee.id);
                    remaining -= fee.amount;
                    selectedFees.push(fee); // For receipt
                } else {
                    await (prisma as any).transaction.create({
                        data: {
                            amount: remaining,
                            type: 'INCOME',
                            category: fee.originalCategory || fee.category,
                            categoryId: fee.categoryId,
                            studentId: fee.studentId,
                            studentName: fee.studentName,
                            status: 'COMPLETED',
                            note: paymentNote ? `${paymentNote} (আংশিক অগ্রিম পরিশোধ)` : 'আংশিক অগ্রিম পরিশোধ',
                            receiptNo,
                            date: new Date(fee.date),
                            instituteId
                        }
                    });
                    await (prisma as any).transaction.create({
                        data: {
                            amount: fee.amount - remaining,
                            type: 'INCOME',
                            category: fee.originalCategory || fee.category,
                            categoryId: fee.categoryId,
                            studentId: fee.studentId,
                            studentName: fee.studentName,
                            status: 'PENDING',
                            note: 'বকেয়া (আংশিক অগ্রিম পরিশোধের পরে)',
                            date: new Date(fee.date),
                            instituteId
                        }
                    });
                    
                    const partialFee = { ...fee, amount: remaining, originalCategory: fee.originalCategory || fee.category };
                    selectedFees.push(partialFee); // For receipt
                    remaining = 0;
                }
            }
        }

        // 5. Handle remaining advance balance
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
                    instituteId,
                    receiptNo
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

        const subTxnsForReceipt = selectedFees.map((f: any) => {
            let finalNote = f.note || '';
            if (paymentNote && !finalNote.includes(paymentNote)) {
                finalNote = finalNote ? `${finalNote} - ${paymentNote}` : paymentNote;
            }
            
            let displayCategory = f.category;
            // For future fees from client, f.category might already have month year.
            if (f.status !== 'PREDICTED' && displayCategory && displayCategory.includes('মাসিক') && !displayCategory.includes('(')) {
                const targetDate = f.date;
                const d = new Date(targetDate);
                const monthYear = d.toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' });
                const baseCat = displayCategory.replace(/\s*-?\s*\d{4}\s*$/, '').trim();
                displayCategory = `${baseCat} (${monthYear})`;
            }

            return {
                originalCategory: f.originalCategory || f.category,
                category: displayCategory,
                note: finalNote,
                amount: f.amount,
                date: f.date,
                createdAt: f.createdAt || f.date
            };
        });

        if (advanceAmount > 0 && !applyAdvanceTo) {
            subTxnsForReceipt.push({
                originalCategory: `__ADVANCE__${studentId}`,
                category: 'অনির্ধারিত অগ্রিম জমা',
                note: 'অগ্রিম জমা (অতিরিক্ত পরিশোধ)',
                amount: advanceAmount,
                date: new Date(),
                createdAt: new Date()
            });
        }

        const totalReceiptAmount = subTxnsForReceipt.reduce((sum: number, f: any) => sum + f.amount, 0);

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
                amount: totalReceiptAmount,
                subTransactions: subTxnsForReceipt
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

        // Predict upcoming fees for the next 12 months
        const upcomingFees: any[] = [];
        
        const student = await (prisma as any).user.findUnique({
            where: { id: studentId },
            select: { id: true, name: true, metadata: true }
        });

        if (student) {
            const sClassId = student.metadata?.classId;
            if (sClassId) {
                const sMetadata = student.metadata || {};
                const categories = await (prisma as any).accountCategory.findMany({
                    where: { instituteId, isFixed: true }
                });

                const existingTxns = await (prisma as any).transaction.findMany({
                    where: { instituteId, studentId },
                    select: { categoryId: true, date: true }
                });

                const existingKeys = new Set<string>();
                for (const t of existingTxns) {
                    if (!t.categoryId) continue;
                    const d = new Date(t.date);
                    // Generate base date key (will refine per interval later)
                    existingKeys.add(`${t.categoryId}-${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
                    existingKeys.add(`${t.categoryId}-${d.getFullYear()}-${d.getMonth()}`);
                    existingKeys.add(`${t.categoryId}-${d.getFullYear()}`);
                }

                for (const category of categories) {
                    const config = category.config || {};
                    if (config.frequencyType !== 'fixed' || !config.startDate) continue;
                    
                    const selectedClasses = config.selectedClasses || [];
                    if (!selectedClasses.includes(sClassId)) continue;
                    
                    if (config.deselectedStudents && config.deselectedStudents[sClassId]) {
                        const deselectedList = config.deselectedStudents[sClassId];
                        if (deselectedList.includes('__ALL_DESELECTED__') || deselectedList.includes(student.id)) continue;
                    }

                    let baseAmount = category.amount || 0;
                    if (config.studentAmountType === 'per-class') {
                        baseAmount = (config.studentClassAmounts && config.studentClassAmounts[sClassId]) || baseAmount;
                    } else if (config.studentAmountType === 'per-group') {
                        const sGroupId = sMetadata.groupId;
                        if (sGroupId && config.studentGroupAmounts && config.studentGroupAmounts[`${sClassId}-${sGroupId}`]) {
                            baseAmount = config.studentGroupAmounts[`${sClassId}-${sGroupId}`];
                        } else {
                            baseAmount = (config.studentClassAmounts && config.studentClassAmounts[sClassId]) || baseAmount;
                        }
                    }

                    const tier = sMetadata.feeTier || 'full';
                    const multiplier = tier === 'half' ? 0.5 : (tier === 'free' ? 0 : 1.0);
                    let finalAmount = baseAmount * multiplier;
                    finalAmount -= (config.studentWaivers?.[sClassId]?.[student.id] || 0);
                    
                    const customAmt = config.customStudentAmounts?.[sClassId]?.[student.id];
                    if (customAmt !== undefined && customAmt !== null) finalAmount = customAmt;

                    if (finalAmount <= 0) continue;

                    // Generate dates up to Next Year
                    const start = new Date();
                    const end = new Date();
                    end.setMonth(end.getMonth() + 12);
                    
                    const actualEnd = config.endDate ? new Date(Math.min(end.getTime(), new Date(config.endDate).getTime())) : end;

                    let current = new Date(config.startDate);
                    // Fast forward to current date
                    while (current < start) {
                        if (config.interval === 'weekly') current.setDate(current.getDate() + 7);
                        else if (config.interval === 'semester') current.setMonth(current.getMonth() + 6);
                        else if (config.interval === 'yearly') current.setFullYear(current.getFullYear() + 1);
                        else current.setMonth(current.getMonth() + 1);
                    }

                    while (current <= actualEnd) {
                        let dateKey = '';
                        if (config.interval === 'weekly') dateKey = `${category.id}-${current.getFullYear()}-${current.getMonth()}-${current.getDate()}`;
                        else if (config.interval === 'yearly') dateKey = `${category.id}-${current.getFullYear()}`;
                        else dateKey = `${category.id}-${current.getFullYear()}-${current.getMonth()}`;

                        if (!existingKeys.has(dateKey)) {
                            // Check if it's already in pendingFees to avoid showing it twice
                            const isAlreadyPending = pendingFees.some((pf: any) => 
                                pf.categoryId === category.id && 
                                new Date(pf.date).getFullYear() === current.getFullYear() &&
                                new Date(pf.date).getMonth() === current.getMonth()
                            );

                            if (!isAlreadyPending) {
                                let displayCategory = category.name;
                                if (displayCategory.includes('মাসিক')) {
                                    const monthYear = current.toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' });
                                    const baseCat = displayCategory.replace(/\s*-?\s*\d{4}\s*$/, '').trim();
                                    displayCategory = `${baseCat} (${monthYear})`;
                                }

                                upcomingFees.push({
                                    id: `future_${category.id}_${current.getTime()}`,
                                    amount: finalAmount,
                                    type: 'INCOME',
                                    category: displayCategory,
                                    originalCategory: category.name,
                                    categoryId: category.id,
                                    studentId: student.id,
                                    studentName: student.name,
                                    status: 'PREDICTED',
                                    date: new Date(current)
                                });
                            }
                        }

                        if (config.interval === 'weekly') current.setDate(current.getDate() + 7);
                        else if (config.interval === 'semester') current.setMonth(current.getMonth() + 6);
                        else if (config.interval === 'yearly') current.setFullYear(current.getFullYear() + 1);
                        else current.setMonth(current.getMonth() + 1);
                    }
                }
            }
        }

        // Sort upcoming fees by date
        upcomingFees.sort((a, b) => a.date.getTime() - b.date.getTime());

        return NextResponse.json({
            advanceBalance: advanceTxn?.amount || 0,
            pendingFees: formattedPendingFees,
            upcomingFees
        });
    } catch (error: any) {
        return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
}

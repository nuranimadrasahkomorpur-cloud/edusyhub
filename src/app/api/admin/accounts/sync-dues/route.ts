import { NextResponse } from 'next/server';
import prisma from '@/utils/db';

export async function POST(req: Request) {
    try {
        const { instituteId } = await req.json();
        if (!instituteId) return NextResponse.json({ message: 'Institute ID required' }, { status: 400 });

        // 1. Fetch all monthly categories with a start date
        const categories = await (prisma as any).accountCategory.findMany({
            where: {
                instituteId,
                isFixed: true
            }
        });

        // Fetch all existing advance balances globally
        const advanceTxns = await (prisma as any).transaction.findMany({
            where: {
                instituteId,
                type: 'INCOME',
                status: 'COMPLETED',
                category: { startsWith: '__ADVANCE__' }
            }
        });

        const studentAdvances: Record<string, { initial: number, current: number }> = {};
        for (const txn of advanceTxns) {
            if (!txn.studentId) continue;
            if (!studentAdvances[txn.studentId]) {
                studentAdvances[txn.studentId] = { initial: 0, current: 0 };
            }
            studentAdvances[txn.studentId].initial += txn.amount;
            studentAdvances[txn.studentId].current += txn.amount;
        }

        const studentNameMap: Record<string, string> = {};

        // Generate receiptNo sequence
        const lastIncomeTxn = await (prisma as any).transaction.findFirst({
            where: { instituteId, type: 'INCOME', receiptNo: { not: null } },
            orderBy: { receiptNo: 'desc' }
        });
        let nextReceiptNumber = 1;
        if (lastIncomeTxn?.receiptNo) {
            const match = lastIncomeTxn.receiptNo.match(/\d+$/);
            if (match) nextReceiptNumber = parseInt(match[0], 10) + 1;
        }

        // Also check if there's a deleted receipt number sequence stored in Institute
        const instituteInfo = await (prisma as any).institute.findUnique({
            where: { id: instituteId },
            select: { notificationSettings: true }
        });
        const savedSeq = instituteInfo?.notificationSettings?.lastReceiptNumber;
        if (savedSeq && typeof savedSeq === 'number' && savedSeq >= nextReceiptNumber) {
            nextReceiptNumber = savedSeq + 1;
        }

        let totalGenerated = 0;

        for (const category of categories) {
            const config = category.config || {};
            if (config.frequencyType === 'fixed' && ['monthly', 'weekly', 'yearly', 'semester'].includes(config.interval) && config.startDate) {
                const start = new Date(config.startDate);
                const current = new Date();
                const end = config.endDate ? new Date(config.endDate) : current;
                const actualEnd = end < start && !config.endDate ? current : end;

                const datesToGenerate: Date[] = [];
                
                const dueTiming = config.dueTiming || 'start';

                if (config.interval === 'weekly') {
                    let currentWeek = new Date(start);
                    while (currentWeek <= actualEnd) {
                        datesToGenerate.push(new Date(currentWeek));
                        currentWeek.setDate(currentWeek.getDate() + 7);
                    }
                } else if (config.interval === 'semester') {
                    let currentSemester = new Date(start);
                    while (currentSemester <= actualEnd) {
                        datesToGenerate.push(new Date(currentSemester));
                        currentSemester.setMonth(currentSemester.getMonth() + 6);
                    }
                } else if (config.interval === 'yearly') {
                    let currentYear = new Date(start);
                    while (currentYear <= actualEnd) {
                        datesToGenerate.push(new Date(currentYear));
                        currentYear.setFullYear(currentYear.getFullYear() + 1);
                    }
                } else {
                    let currentMonth = new Date(start.getFullYear(), start.getMonth(), 1);
                    const endMonth = new Date(actualEnd.getFullYear(), actualEnd.getMonth(), 1);
                    while (currentMonth <= endMonth) {
                        datesToGenerate.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1));
                        currentMonth.setMonth(currentMonth.getMonth() + 1);
                    }
                }

                if (datesToGenerate.length === 0) continue;

                // 2. Fetch students for this category
                const selectedClasses = config.selectedClasses || [];
                
                let students: any[] = [];
                if (selectedClasses.length > 0) {
                    students = await (prisma as any).user.findMany({
                        where: { 
                            role: 'STUDENT', 
                            instituteIds: { has: instituteId }
                        },
                        select: { id: true, name: true, metadata: true }
                    });
                    
                    // Filter students by selected classes
                    students = students.filter((s: any) => {
                        const sClassId = s.metadata?.classId;
                        return sClassId && selectedClasses.includes(sClassId);
                    });
                    for (const s of students) {
                        studentNameMap[s.id] = s.name || 'অজানা';
                    }
                }

                if (students.length === 0) continue;

                // Cache class names
                const classes = await (prisma as any).class.findMany({
                    where: { id: { in: selectedClasses } },
                    select: { id: true, name: true }
                });
                const classMap = new Map(classes.map((c: any) => [c.id, c.name]));

                // 3. Fetch existing transactions for this category to avoid duplicates
                const existingTxns = await (prisma as any).transaction.findMany({
                    where: {
                        instituteId,
                        categoryId: category.id
                    },
                    select: { id: true, studentId: true, date: true, status: true }
                });

                const studentExistingKeys: Record<string, Set<string>> = {};
                const keysToTransactions: Record<string, any[]> = {};

                for (const t of existingTxns) {
                    if (!t.studentId) continue;
                    const d = new Date(t.date);
                    
                    let dateKey = `${d.getFullYear()}-${d.getMonth()}`;
                    if (config.interval === 'weekly') dateKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
                    if (config.interval === 'semester') {
                        const half = d.getMonth() < 6 ? 1 : 2;
                        dateKey = `${d.getFullYear()}-H${half}`;
                    }
                    if (config.interval === 'yearly') dateKey = `${d.getFullYear()}`;
                    
                    const uniqueKey = `${t.studentId}_${dateKey}`;
                    if (!keysToTransactions[uniqueKey]) keysToTransactions[uniqueKey] = [];
                    keysToTransactions[uniqueKey].push(t);

                    if (!studentExistingKeys[t.studentId]) studentExistingKeys[t.studentId] = new Set();
                    studentExistingKeys[t.studentId].add(dateKey);
                }

                // Auto-cleanup existing duplicates (keep one, prefer COMPLETED over PENDING)
                const duplicatesToDelete = [];
                for (const [uniqueKey, txns] of Object.entries(keysToTransactions)) {
                    if (txns.length > 1) {
                        // Sort so COMPLETED is first, then by date descending
                        txns.sort((a, b) => {
                            if (a.status === 'COMPLETED' && b.status !== 'COMPLETED') return -1;
                            if (b.status === 'COMPLETED' && a.status !== 'COMPLETED') return 1;
                            return new Date(b.date).getTime() - new Date(a.date).getTime();
                        });
                        
                        // Keep the first one, delete the rest (only if they are PENDING)
                        for (let i = 1; i < txns.length; i++) {
                            if (txns[i].status === 'PENDING') {
                                duplicatesToDelete.push(txns[i].id);
                            }
                        }
                    }
                }

                if (duplicatesToDelete.length > 0) {
                    await (prisma as any).transaction.deleteMany({
                        where: { id: { in: duplicatesToDelete } }
                    });
                }

                // 4. Generate missing transactions and update existing dues
                const transactionsToCreate: any[] = [];
                const transactionsToUpdate: { id: string, amount: number }[] = [];
                const pendingToDelete: string[] = [];

                for (const student of students) {
                    const sClassId = student.metadata?.classId;
                    if (!sClassId) continue;
                    
                    if (config.deselectedStudents && config.deselectedStudents[sClassId]) {
                        const deselectedList = config.deselectedStudents[sClassId];
                        if (deselectedList.includes('__ALL_DESELECTED__') || deselectedList.includes(student.id)) continue;
                    }

                    const sMetadata = student.metadata || {};
                    const normalizedAmount = category.amount || 0;
                    let baseAmount = normalizedAmount;

                    if (student.metadata?.studentId === '102' || student.metadata?.studentId === '103' || student.metadata?.studentId === '104') {
                        require('fs').appendFileSync('f:\\\\Edusy User flow\\\\Edusy app\\\\debug102.txt', JSON.stringify({
                            student: student.name,
                            studentId: student.metadata.studentId,
                            classId: sClassId,
                            normalizedAmount,
                            baseAmount,
                            tier: sMetadata.feeTier || 'full',
                            waiver: config.studentWaivers?.[sClassId]?.[student.id] || 0,
                            deselected: config.deselectedStudents?.[sClassId]?.includes(student.id) || false,
                            studentAmountType: config.studentAmountType,
                            classAmounts: config.studentClassAmounts
                        }, null, 2) + '\\n');
                    }

                    if (config.studentAmountType === 'flat') {
                        baseAmount = normalizedAmount;
                    } else if (config.studentAmountType === 'per-class') {
                        baseAmount = (config.studentClassAmounts && sClassId) ? (config.studentClassAmounts[sClassId] || normalizedAmount) : normalizedAmount;
                    } else if (config.studentAmountType === 'per-group') {
                        const sGroupId = sMetadata.groupId;
                        if (sGroupId && config.studentGroupAmounts && config.studentGroupAmounts[`${sClassId}-${sGroupId}`]) {
                            baseAmount = config.studentGroupAmounts[`${sClassId}-${sGroupId}`];
                        } else {
                            baseAmount = (config.studentClassAmounts && sClassId) ? (config.studentClassAmounts[sClassId] || normalizedAmount) : normalizedAmount;
                        }
                    }

                    const tier = sMetadata.feeTier || 'full';
                    const multiplier = tier === 'half' ? 0.5 : (tier === 'free' ? 0 : 1.0);
                    let finalAmount = baseAmount * multiplier;

                    const waiver = config.studentWaivers?.[sClassId]?.[student.id] || 0;
                    finalAmount -= waiver;

                    const customAmt = config.customStudentAmounts?.[sClassId]?.[student.id];
                    if (customAmt !== undefined && customAmt !== null) {
                        finalAmount = customAmt;
                    }

                    if (finalAmount <= 0) continue;

                    for (const targetDate of datesToGenerate) {
                        let dateKey = `${targetDate.getFullYear()}-${targetDate.getMonth()}`;
                        if (config.interval === 'weekly') dateKey = `${targetDate.getFullYear()}-${targetDate.getMonth()}-${targetDate.getDate()}`;
                        if (config.interval === 'semester') {
                            const half = targetDate.getMonth() < 6 ? 1 : 2;
                            dateKey = `${targetDate.getFullYear()}-H${half}`;
                        }
                        if (config.interval === 'yearly') dateKey = `${targetDate.getFullYear()}`;

                        const uniqueKey = `${student.id}_${dateKey}`;
                        const txnsForDate = keysToTransactions[uniqueKey] || [];
                        
                        let totalPaid = 0;
                        let pendingTxn: any = null;
                        
                        for (const t of txnsForDate) {
                            if (t.status === 'COMPLETED') totalPaid += t.amount;
                            if (t.status === 'PENDING') pendingTxn = t;
                        }

                        let expectedDue = finalAmount - totalPaid;
                        if (expectedDue < 0) expectedDue = 0;

                        if (expectedDue > 0) {
                            if (pendingTxn) {
                                // If due exists but amount doesn't match remaining required
                                if (pendingTxn.amount !== expectedDue) {
                                    transactionsToUpdate.push({ id: pendingTxn.id, amount: expectedDue });
                                }
                            } else {
                                // NO pending exists, we must create it!
                                let amountToPay = expectedDue;
                                let advanceUsed = 0;
                                
                                const sAdvance = studentAdvances[student.id];
                                if (sAdvance && sAdvance.current > 0) {
                                    advanceUsed = Math.min(amountToPay, sAdvance.current);
                                    sAdvance.current -= advanceUsed;
                                }

                                if (advanceUsed >= amountToPay) {
                                    // Fully paid by advance
                                    const receiptNo = `R-${nextReceiptNumber.toString().padStart(5, '0')}`;
                                    nextReceiptNumber++;
                                    
                                    transactionsToCreate.push({
                                        amount: amountToPay,
                                        type: 'INCOME',
                                        category: category.name,
                                        categoryId: category.id,
                                        studentId: student.id,
                                        studentName: student.name,
                                        classId: sClassId,
                                        className: classMap.get(sClassId) || null,
                                        status: 'COMPLETED',
                                        note: 'অগ্রিম ব্যালেন্স থেকে স্বয়ংক্রিয় পরিশোধ',
                                        receiptNo,
                                        instituteId,
                                        date: targetDate
                                    });
                                } else if (advanceUsed > 0) {
                                    // Partially paid by advance
                                    const receiptNo = `R-${nextReceiptNumber.toString().padStart(5, '0')}`;
                                    nextReceiptNumber++;
                                    
                                    // Completed portion
                                    transactionsToCreate.push({
                                        amount: advanceUsed,
                                        type: 'INCOME',
                                        category: category.name,
                                        categoryId: category.id,
                                        studentId: student.id,
                                        studentName: student.name,
                                        classId: sClassId,
                                        className: classMap.get(sClassId) || null,
                                        status: 'COMPLETED',
                                        note: 'অগ্রিম ব্যালেন্স থেকে আংশিক স্বয়ংক্রিয় পরিশোধ',
                                        receiptNo,
                                        instituteId,
                                        date: targetDate
                                    });
                                    
                                    // Pending portion
                                    transactionsToCreate.push({
                                        amount: amountToPay - advanceUsed,
                                        type: 'INCOME',
                                        category: category.name,
                                        categoryId: category.id,
                                        studentId: student.id,
                                        studentName: student.name,
                                        classId: sClassId,
                                        className: classMap.get(sClassId) || null,
                                        status: 'PENDING',
                                        note: 'বকেয়া (আংশিক স্বয়ংক্রিয় পরিশোধের পরে)',
                                        instituteId,
                                        date: targetDate
                                    });
                                } else {
                                    // Regular pending (no advance)
                                    transactionsToCreate.push({
                                        amount: amountToPay,
                                        type: 'INCOME',
                                        category: category.name,
                                        categoryId: category.id,
                                        studentId: student.id,
                                        studentName: student.name,
                                        classId: sClassId,
                                        className: classMap.get(sClassId) || null,
                                        status: 'PENDING',
                                        instituteId,
                                        date: targetDate
                                    });
                                }
                            }
                        } else {
                            // Fee is fully paid or overpaid, if a pending txn exists, delete it
                            if (pendingTxn) {
                                pendingToDelete.push(pendingTxn.id);
                            }
                        }
                    }
                }

                // Batch execute all updates
                if (transactionsToCreate.length > 0) {
                    await (prisma as any).transaction.createMany({
                        data: transactionsToCreate
                    });
                    totalGenerated += transactionsToCreate.length;
                }

                if (pendingToDelete.length > 0) {
                    await (prisma as any).transaction.deleteMany({
                        where: { id: { in: pendingToDelete } }
                    });
                }

                for (const update of transactionsToUpdate) {
                    await (prisma as any).transaction.update({
                        where: { id: update.id },
                        data: { amount: update.amount }
                    });
                }
            }
        }

        // Update advance balances after all generated dues are processed
        for (const [studentId, advanceData] of Object.entries(studentAdvances)) {
            if (advanceData.initial !== advanceData.current) {
                // Delete old advance records
                await (prisma as any).transaction.deleteMany({
                    where: {
                        studentId,
                        instituteId,
                        category: { startsWith: '__ADVANCE__' },
                        status: 'COMPLETED'
                    }
                });

                // Create new record with remaining balance if > 0
                if (advanceData.current > 0) {
                    await (prisma as any).transaction.create({
                        data: {
                            amount: advanceData.current,
                            type: 'INCOME',
                            category: `__ADVANCE__${studentId}`,
                            studentId,
                            studentName: studentNameMap[studentId] || 'অজানা',
                            status: 'COMPLETED',
                            note: 'অগ্রিম জমা (বকেয়া সমন্বয়ের পর)',
                            date: new Date(),
                            instituteId
                        }
                    });
                }
            }
        }

        return NextResponse.json({ success: true, generatedCount: totalGenerated });
    } catch (error: any) {
        console.error('Sync Dues Error:', error);
        try {
            require('fs').appendFileSync('f:\\\\Edusy User flow\\\\Edusy app\\\\debug102.txt', '\\nCRASH: ' + error.message + '\\n' + error.stack + '\\n');
        } catch (e) {}
        return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
}

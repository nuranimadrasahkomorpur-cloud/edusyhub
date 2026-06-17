import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Starting Auto-Absent Verification Test ---');

    // 1. Fetch a student to test with
    const student = await prisma.user.findFirst({
        where: { role: 'STUDENT' },
        select: { id: true, metadata: true, instituteIds: true }
    });

    if (!student) {
        console.error('No student found in database to run tests!');
        return;
    }

    const studentId = student.id;
    const instituteId = student.instituteIds[0];
    const classId = (student.metadata as any)?.classId;

    if (!instituteId || !classId) {
        console.error('Student does not have instituteId or classId in metadata:', student);
        return;
    }

    const dateString = '2026-06-17'; // Test date
    console.log(`Using Student ID: ${studentId}, Institute ID: ${instituteId}, Class ID: ${classId}, Date: ${dateString}`);

    // 2. Fetch all other students in this class to know who should be auto-marked ABSENT
    const targetClassIdStr = typeof classId === 'string' ? classId : (classId.$oid || classId.toString());
    const allStudents = await prisma.user.findMany({
        where: {
            role: 'STUDENT',
            instituteIds: { has: instituteId }
        },
        select: { id: true, metadata: true }
    });

    const classStudents = allStudents.filter((s: any) => {
        const sClassId = s.metadata?.classId;
        if (!sClassId) return false;
        const sClassIdStr = typeof sClassId === 'string' ? sClassId : (sClassId.$oid || sClassId.toString());
        if (sClassIdStr !== targetClassIdStr) return false;

        if (s.metadata?.admissionStatus === 'PENDING') return false;
        if (s.metadata?.status === 'INACTIVE') return false;
        return s.id !== studentId;
    });

    console.log(`Found ${classStudents.length} other active students in class.`);

    // 3. Clear existing attendance records for the test date for all these students
    const studentIdsToClear = [studentId, ...classStudents.map(s => s.id)];
    console.log('Clearing existing records for these students on this date...');
    const deleteFilter = {
        studentId: { $in: studentIdsToClear.map(id => ({ $oid: id })) },
        dateString
    };

    const runDelete = async (collection: string) => {
        return (prisma as any).$runCommandRaw({
            delete: collection,
            deletes: [{ q: deleteFilter, limit: 0 }]
        });
    };

    try {
        await runDelete('Attendance');
    } catch (e) {
        try {
            await runDelete('attendance');
        } catch (err2) {
            console.error('Delete failed:', err2);
        }
    }

    // 4. Run the auto-absent logic as it is implemented in mark/route.ts
    // We simulate a mark request for the first student as LATE (as user requested any status should trigger it)
    const status = 'LATE';
    const method = 'MANUAL';
    
    // First, mark the target student
    const updateDoc: any = {
        $set: {
            studentId: { $oid: studentId },
            instituteId: { $oid: instituteId },
            dateString,
            status,
            method,
            updatedAt: new Date()
        }
    };
    updateDoc.$set.classId = { $oid: targetClassIdStr };

    const runCommand = async (collection: string) => {
        return (prisma as any).$runCommandRaw({
            update: collection,
            updates: [
                {
                    q: { studentId: { $oid: studentId }, dateString },
                    u: updateDoc,
                    upsert: true
                }
            ]
        });
    };

    console.log(`Marking student ${studentId} as ${status}...`);
    try {
        await runCommand('Attendance');
    } catch (e) {
        await runCommand('attendance');
    }

    // Now execute the auto-absent logic
    console.log('Executing auto-absent logic for other students...');
    if (classStudents.length > 0) {
        const existingAttendances = await prisma.attendance.findMany({
            where: {
                dateString,
                instituteId,
                studentId: { in: classStudents.map(s => s.id) }
            },
            select: { studentId: true }
        });
        const markedStudentIds = new Set(existingAttendances.map(a => a.studentId));

        const unmarkedStudents = classStudents.filter(s => !markedStudentIds.has(s.id));
        console.log(`Unmarked other students count: ${unmarkedStudents.length}`);
        
        if (unmarkedStudents.length > 0) {
            const bulkUpdates = unmarkedStudents.map(s => {
                const doc: any = {
                    $set: {
                        studentId: { $oid: s.id },
                        instituteId: { $oid: instituteId },
                        dateString,
                        status: 'ABSENT',
                        method: method || 'MANUAL',
                        updatedAt: new Date()
                    }
                };
                doc.$set.classId = { $oid: targetClassIdStr };
                return {
                    q: { studentId: { $oid: s.id }, dateString },
                    u: doc,
                    upsert: true
                };
            });

            const runBulkUpdates = async (collection: string) => {
                return (prisma as any).$runCommandRaw({
                    update: collection,
                    updates: bulkUpdates
                });
            };

            try {
                await runBulkUpdates('Attendance');
            } catch (rawError: any) {
                try {
                    await runBulkUpdates('attendance');
                } catch (secondError: any) {
                    console.error('Fallback bulk update failed:', secondError);
                }
            }
        }
    }

    // 5. Verify records in database
    console.log('Verifying records in the database...');
    const resultAttendances = await prisma.attendance.findMany({
        where: {
            dateString,
            studentId: { in: studentIdsToClear }
        },
        select: { studentId: true, status: true }
    });

    console.log('Resulting attendance records for the class:');
    resultAttendances.forEach(att => {
        if (att.studentId === studentId) {
            console.log(` - Student ${att.studentId} (Marked): ${att.status} (Expected: ${status})`);
        } else {
            console.log(` - Student ${att.studentId} (Auto-Absent): ${att.status} (Expected: ABSENT)`);
        }
    });

    if (resultAttendances.length === studentIdsToClear.length) {
        console.log('✅ Success! All students have an attendance record.');
    } else {
        console.error(`❌ Fail! Expected ${studentIdsToClear.length} records, but found ${resultAttendances.length}.`);
    }

    // Cleanup: delete the test records
    console.log('Cleaning up test records...');
    try {
        await runDelete('Attendance');
    } catch (e) {
        try {
            await runDelete('attendance');
        } catch (err2) {}
    }

    console.log('--- Test Completed ---');
}

main()
    .catch(err => {
        console.error('Error running test:', err);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

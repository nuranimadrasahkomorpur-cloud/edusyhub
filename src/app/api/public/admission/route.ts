import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/db';
import { getNextStudentId, getNextRollNumber } from '@/utils/student-utils';
import { normalizeAuthIdentifier, normalizePassword } from '@/utils/digit-utils';

export async function POST(req: NextRequest) {
    let body: any = {};
    try {
        body = await req.json();
        let { name, phone, email, instituteId, metadata, guardianName, guardianPhone, guardianPassword, password: studentPassword } = body;

        if (!instituteId) {
            return NextResponse.json({ message: 'Institute ID is required' }, { status: 400 });
        }

        const skipAccountSetup = body.skipAccountSetup || metadata?.skipAccountSetup;
        const gPhone = normalizeAuthIdentifier(guardianPhone || '');
        const studentEmail = email?.trim();
        const studentPhoneNormalized = normalizeAuthIdentifier(phone || '');

        if (!skipAccountSetup && !studentPhoneNormalized && !studentEmail && !gPhone) {
            return NextResponse.json({ message: 'শিক্ষার্থীর মোবাইল, ইমেইল অথবা অভিভাবকের মোবাইল নম্বর - যেকোনো একটি অবশ্যই দিতে হবে।' }, { status: 400 });
        }

        // --- Rigorous Duplicate Checks ---
        const studentId = metadata?.studentId || phone;

        // Check Student ID, Phone, Email
        const studentChecks: any[] = [{ phone: studentPhoneNormalized }];
        if (studentId) studentChecks.push({ "metadata.studentId": studentId });
        if (email && email.trim() !== '') studentChecks.push({ email: email.trim() });

        const existingStudent = await prisma.user.findFirst({
            where: {
                instituteIds: { has: instituteId },
                role: 'STUDENT',
                OR: studentChecks
            }
        });

        if (existingStudent) {
            let field = 'mobile';
            if (existingStudent.email === email?.trim()) field = 'email';
            if ((existingStudent.metadata as any)?.studentId === studentId) field = 'Student ID';

            return NextResponse.json({
                message: `এই ${field} দিয়ে ইতোমধ্যে একটি শিক্ষার্থী অ্যাকাউন্ট আছে। দয়া করে ভিন্ন তথ্য ব্যবহার করুন।`,
                duplicateField: field
            }, { status: 400 });
        }

        // Check Guardian duplicate phone/email
        const studentEmailNormalized = studentEmail; // Already trimmed above
        const gEmail = metadata?.guardianEmail?.trim();

        if (gPhone) {
            // Check if this guardian already exists but with a DIFFERENT role (unlikely but possible)
            // Or just check for general user with this phone
            const existingUser = await prisma.user.findFirst({
                where: { phone: gPhone }
            });

            if (existingUser && existingUser.role !== 'GUARDIAN') {
                return NextResponse.json({
                    message: 'এই অভিভাবক মোবাইল নম্বরটি ইতোমধ্যে অন্য একটি অ্যাকাউন্টে (যেমন: শিক্ষক বা স্টাফ) ব্যবহার করা হয়েছে।',
                    duplicateField: 'guardianPhone'
                }, { status: 400 });
            }
        }

        // --- Auto-assign Student ID & Roll Number ---
        const finalMetadata = { ...(metadata || {}) };
        finalMetadata.studentId = studentId;

        if (!finalMetadata.rollNumber && finalMetadata.classId) {
            finalMetadata.rollNumber = await getNextRollNumber(instituteId, finalMetadata.classId);
        }

        if (!phone && metadata?.studentPhone) phone = metadata.studentPhone;

        const password = studentPassword || (skipAccountSetup ? Math.random().toString(36).slice(-10) : finalMetadata.studentId);
        if (skipAccountSetup) finalMetadata.skipAccountSetup = true;

        const instIds = [instituteId];

        // Create Student
        const studentPlainPass = normalizePassword(password);
        const newStudent = await prisma.user.create({
            data: {
                name: String(name || ''),
                phone: studentPhoneNormalized || null,
                email: studentEmail && studentEmail !== '' ? studentEmail : null,
                password: studentPlainPass,
                role: 'STUDENT',
                instituteIds: instIds,
                metadata: {
                    ...finalMetadata,
                    admissionStatus: 'PENDING',
                    originalPassword: studentPlainPass
                }
            }
        });

        // --- Guardian Handling ---
        if (gPhone && guardianName) {
            try {
                let guardian = await prisma.user.findFirst({
                    where: { phone: gPhone }
                });

                if (!guardian) {
                    // Create NEW Guardian
                    const guardianPlainPass = normalizePassword(guardianPassword || gPhone);
                    guardian = await prisma.user.create({
                        data: {
                            name: String(guardianName),
                            phone: String(gPhone),
                            password: guardianPlainPass,
                            role: 'GUARDIAN',
                            instituteIds: instIds,
                            metadata: { 
                                childrenIds: [newStudent.id],
                                originalPassword: guardianPlainPass
                            }
                        }
                    });
                } else {
                    // Update EXISTING Guardian
                    const currentChildren = (guardian.metadata as any)?.childrenIds || [];
                    const updatedInstituteIds = Array.from(new Set([...guardian.instituteIds, instituteId]));

                    guardian = await prisma.user.update({
                        where: { id: guardian.id },
                        data: {
                            instituteIds: updatedInstituteIds,
                            metadata: {
                                ...(guardian.metadata as any),
                                childrenIds: Array.from(new Set([...currentChildren, newStudent.id]))
                            }
                        }
                    });
                }

                // Link Student to Guardian
                await prisma.user.update({
                    where: { id: newStudent.id },
                    data: {
                        metadata: {
                            ...(newStudent.metadata as any),
                            guardianId: guardian.id
                        }
                    }
                });

            } catch (gErr) {
                console.error("Public Admission Guardian Error", gErr);
            }
        }

        return NextResponse.json({
            success: true,
            message: 'আবেদন সফলভাবে জমা দেওয়া হয়েছে।',
            credentials: {
                studentId: finalMetadata.studentId,
                password: password
            }
        }, { status: 201 });

    } catch (error: any) {
        console.error('Public Admission CRITICAL Error:', {
            message: error.message,
            stack: error.stack,
            cause: error.cause,
            body: body // Log body to see what data caused the crash
        });
        return NextResponse.json({
            message: 'সার্ভার ত্রুটি। দয়া করে আবার চেষ্টা করুন।',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        }, { status: 500 });
    }
}

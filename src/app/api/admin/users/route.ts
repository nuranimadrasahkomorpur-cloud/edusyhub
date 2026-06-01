import { NextResponse } from 'next/server';
import prisma from '@/utils/db';
import { getNextStudentId, getNextRollNumber } from '@/utils/student-utils';
import { getServerSession } from '@/utils/auth-utils';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        const ids = searchParams.get('ids');
        const role = searchParams.get('role');
        const search = searchParams.get('search');
        const classId = searchParams.get('classId');
        const groupId = searchParams.get('groupId');
        const instituteId = searchParams.get('instituteId');
        const admissionStatus = searchParams.get('admissionStatus');
        const status = searchParams.get('status');
        const feeTier = searchParams.get('feeTier');
        const activeRoleQuery = searchParams.get('activeRole');

        const session = await getServerSession();
        if (!session) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id: userId, role: baseRole, instituteIds, teacherProfiles } = session.user as any;
        const activeRole = activeRoleQuery || baseRole;


        // Support fetching a single user by ID
        if (id) {
            const user = await prisma.user.findUnique({
                where: { id },
                include: {
                    institutes: {
                        select: { name: true }
                    }
                }
            });

            if (!user) {
                return NextResponse.json({ message: 'User not found' }, { status: 404 });
            }

            const formattedUser = {
                id: user.id,
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || '',
                password: (user.metadata as any)?.originalPassword || user.password || '',
                role: user.role || 'USER',
                createdAt: user.createdAt,
                institute: user.institutes?.[0] ? { name: (user.institutes[0] as any).name } : null,
                metadata: user.metadata || {},
                faceDescriptor: (user as any).faceDescriptor || []
            };

            return NextResponse.json(formattedUser);
        }

        const pipeline: any[] = [];

        // Filter by role if provided
        const match: any = {};
        if (role) match.role = role;

        // --- Role-Based Visibility Filtering ---
        // Only skip filtering if the user is a SUPER_ADMIN AND they are actively in SUPER_ADMIN mode.
        if (baseRole !== 'SUPER_ADMIN' || activeRole !== 'SUPER_ADMIN') {
            const managedInstIds = (instituteIds || []).filter((id: any) => typeof id === 'string' && id.length === 24);
            const joinedInstIds = (teacherProfiles || [])
                .filter((p: any) => p.status !== 'REJECTED' && p.instituteId)
                .map((p: any) => p.instituteId)
                .filter((id: any) => typeof id === 'string' && id.length === 24);
            
            const allAllowedInstIds = Array.from(new Set([...managedInstIds, ...joinedInstIds]));

            if (instituteId) {
                // If specific institute requested, check access
                if (!allAllowedInstIds.includes(instituteId)) {
                    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
                }
                match.instituteIds = { $oid: instituteId };
            } else {
                // Otherwise, restrict to ALL allowed institutes
                match.instituteIds = { 
                    $in: allAllowedInstIds.map(id => ({ $oid: id })) 
                };
            }
        } else if (instituteId) {
            // Super admin mode but requested specific institute
            match.instituteIds = { $oid: instituteId };
        }

        // Support filtering by multiple IDs
        if (ids) {
            const idList = ids.split(',').filter(Boolean);
            if (idList.length > 0) {
                match._id = { $in: idList.map(i => ({ $oid: i })) };
            }
        }

        // Filter by metadata.classId with teacher assignment check
        if (activeRole === 'TEACHER') {
            const targetInstituteId = instituteId || (session.user as any).defaultInstituteId || (instituteIds && instituteIds[0]);
            if (!targetInstituteId) {
                return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
            }

            const profile = await prisma.teacherProfile.findUnique({
                where: {
                    userId_instituteId: {
                        userId: userId,
                        instituteId: targetInstituteId
                    }
                }
            });

            if (!profile || profile.status !== 'ACTIVE') {
                return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
            }

            if (!profile.isAdmin) {
                let assignedClassIds = (profile.assignedClassIds || []).map(id => id.toString());
                const classWise = (profile.permissions as any)?.classWise;
                if (classWise) {
                    assignedClassIds = Array.from(new Set([...assignedClassIds, ...Object.keys(classWise)]));
                }

                if (assignedClassIds.length === 0) {
                    return NextResponse.json([]); // Return empty list, no classes assigned
                }

                if (classId && classId !== 'all') {
                    if (!assignedClassIds.includes(classId)) {
                        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
                    }
                    match.$and = match.$and || [];
                    match.$and.push({
                        $or: [
                            { 'metadata.classId': classId },
                            { 'metadata.classId': { $oid: classId } }
                        ]
                    });
                } else {
                    match.$and = match.$and || [];
                    match.$and.push({
                        $or: [
                            { 'metadata.classId': { $in: assignedClassIds } },
                            { 'metadata.classId': { $in: assignedClassIds.map(id => ({ $oid: id })) } }
                        ]
                    });
                }
            } else {
                if (classId && classId !== 'all') {
                    match.$and = match.$and || [];
                    match.$and.push({
                        $or: [
                            { 'metadata.classId': classId },
                            { 'metadata.classId': { $oid: classId } }
                        ]
                    });
                }
            }
        } else {
            if (classId && classId !== 'all') {
                match.$and = match.$and || [];
                match.$and.push({
                    $or: [
                        { 'metadata.classId': classId },
                        { 'metadata.classId': { $oid: classId } }
                    ]
                });
            }
        }
        if (groupId) {
            match.$and = match.$and || [];
            match.$and.push({
                $or: [
                    { 'metadata.groupId': groupId },
                    { 'metadata.groupId': { $oid: groupId } }
                ]
            });
        }

        if (admissionStatus) {
            match['metadata.admissionStatus'] = admissionStatus;
        } else if (role === 'STUDENT') {
            // Default: Hide pending applications from main student list
            match['metadata.admissionStatus'] = { $ne: 'PENDING' };
        }

        if (status === 'ACTIVE') {
            match.$and = match.$and || [];
            match.$and.push({
                $or: [
                    { 'metadata.status': 'ACTIVE' },
                    { 'metadata.status': { $exists: false } },
                    { 'metadata.status': null }
                ]
            });
        } else if (status === 'INACTIVE') {
            match['metadata.status'] = 'INACTIVE';
        }

        if (feeTier && feeTier !== 'ALL') {
            match['metadata.feeTier'] = feeTier;
        }

        // Apply search filter if provided
        if (search) {
            match.$and = match.$and || [];
            match.$and.push({
                $or: [
                    { email: { $regex: search, $options: 'i' } },
                    { name: { $regex: search, $options: 'i' } },
                    { phone: { $regex: search, $options: 'i' } },
                    { 'metadata.studentId': { $regex: search, $options: 'i' } },
                    { 'metadata.rollNumber': { $regex: search, $options: 'i' } }
                ]
            });
        }

        if (Object.keys(match).length > 0) {
            pipeline.push({ $match: match });
        }

        // Sort removed temporarily because it causes 50s+ hangs on unindexed collections with 5000+ documents
        // pipeline.push({ $sort: { createdAt: -1 } });

        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '300');
        const skip = (page - 1) * limit;

        if (skip > 0) {
            pipeline.push({ $skip: skip });
        }
        pipeline.push({ $limit: limit });

        // Lookup first institute for each user (since they can have multiple)
        pipeline.push(
            {
                $lookup: {
                    from: 'Institute',
                    localField: 'instituteIds',
                    foreignField: '_id',
                    as: 'institutes'
                }
            },
            {
                $addFields: {
                    institute: { $arrayElemAt: ['$institutes', 0] }
                }
            },
            {
                $project: {
                    faceDescriptor: 0,
                    institutes: 0
                }
            }
        );

        const usersRaw = await (prisma as any).$runCommandRaw({
            aggregate: 'User',
            pipeline,
            cursor: { batchSize: 5000 }
        });

        const users = (usersRaw.cursor?.firstBatch || []).map((user: any) => ({
            id: user._id?.$oid || user._id?.toString(),
            name: user.name || '',
            email: user.email || '',
            phone: user.phone || '',
            password: user.metadata?.originalPassword || user.password || '',
            role: user.role || 'USER',
            createdAt: user.createdAt?.$date || user.createdAt,
            updatedAt: user.updatedAt?.$date || user.updatedAt,
            institute: user.institute ? { name: user.institute.name } : null,
            metadata: user.metadata || {},
            faceDescriptor: [] // Ensure array is returned so frontend doesn't crash
        }));

        // --- Server-side Class/Group Name Resolution ---
        const studentUsers = users.filter((u: any) => u.role === 'STUDENT' && u.metadata?.classId);
        if (studentUsers.length > 0) {
            const classIds = [...new Set(studentUsers.map((u: any) => u.metadata.classId))] as string[];
            const classes = await prisma.class.findMany({
                where: { id: { in: classIds } },
                include: { groups: true }
            }) as any[];

            studentUsers.forEach((user: any) => {
                const cls = classes.find((c: any) => c.id === user.metadata.classId);
                if (cls) {
                    user.metadata.className = cls.name;
                    if (user.metadata.groupId) {
                        const grp = cls.groups?.find((g: any) => g.id === user.metadata.groupId);
                        if (grp) user.metadata.groupName = grp.name;
                    }
                }
            });
        }
        // ----------------------------------------------

        return NextResponse.json(users);
    } catch (error) {
        console.error('Admin Users API Error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession();
        if (!session) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        let { name, email, password, role, instituteIds, metadata, phone, faceDescriptor } = body; // Destructure phone and faceDescriptor

        if (!phone) {
            phone = body.phone || metadata?.phone || (role === 'STUDENT' ? metadata?.studentPhone || metadata?.guardianPhone : metadata?.guardianPhone);
        }

        // --- Auto-assign Student ID & Roll Number for students BEFORE setting default password ---
        const finalMetadata = { ...(metadata || {}) };
        if (role === 'STUDENT' && instituteIds?.[0]) {
            const instituteId = instituteIds[0];
            if (!finalMetadata.studentId) {
                finalMetadata.studentId = await getNextStudentId(instituteId);
            }
            if (!finalMetadata.rollNumber && finalMetadata.classId) {
                finalMetadata.rollNumber = await getNextRollNumber(instituteId, finalMetadata.classId);
            }
            // Auto-approve students created via admin dashboard
            if (!finalMetadata.admissionStatus) {
                finalMetadata.admissionStatus = 'APPROVED';
            }
        }

        const skipAccountSetup = body.skipAccountSetup || metadata?.skipAccountSetup;
        const hasGuardian = role === 'STUDENT' && metadata?.guardianPhone;
        const isEmailEmpty = !email || email?.trim() === '';
        const isPhoneEmpty = !phone || phone?.trim() === '';

        if (!skipAccountSetup && isEmailEmpty && isPhoneEmpty && !hasGuardian) {
            return NextResponse.json({ message: 'ইমেইল অথবা মোবাইল নম্বর - যেকোনো একটি অবশ্যই দিতে হবে অথবা অভিভাবকের তথ্য দিন।' }, { status: 400 });
        }

        // Default Password Logic
        if (!password) {
            if (role === 'STUDENT' && finalMetadata.studentId) {
                // For students, use Student ID as default password
                password = finalMetadata.studentId;
            } else if (phone) {
                // For other roles (Guardian, etc.), use phone as password
                password = phone;
            } else if (skipAccountSetup) {
                // If skipping setup, set a random password as it's required by DB schema
                password = Math.random().toString(36).slice(-10);
            }
        }

        if (!password || !role) {
            return NextResponse.json({ message: 'Missing required fields (Password and Role required)' }, { status: 400 });
        }

        // Convert instituteIds to ObjectIds for MongoDB
        const instIds = (instituteIds || []).map((id: string) => ({ $oid: id }));

        // Store original password in metadata for superadmin visibility
        finalMetadata.originalPassword = password;

        const userDoc: any = {
            name: name || '',
            password,
            role,
            instituteIds: instIds,
            metadata: finalMetadata,
            faceDescriptor: Array.isArray(faceDescriptor) ? faceDescriptor : [],
            createdAt: { $date: new Date().toISOString() },
            updatedAt: { $date: new Date().toISOString() }
        };

        if (email && email.trim() !== '') {
            userDoc.email = email.trim();
        }
        if (phone) {
            userDoc.phone = phone;
        }

        await (prisma as any).$runCommandRaw({
            insert: 'User',
            documents: [userDoc]
        });

        // -----------------------------------

        // --- Guardian Account Automation (for Students) ---
        if (role === 'STUDENT' && metadata?.guardianPhone && metadata?.guardianName) {
            try {
                const guardianPhone = metadata.guardianPhone.trim();

                // Find existing Guardian by phone
                const existingGuardianRaw = await (prisma as any).$runCommandRaw({
                    find: 'User',
                    filter: { phone: guardianPhone },
                    limit: 1
                });

                const existingGuardian = existingGuardianRaw.cursor?.firstBatch?.[0];
                let guardianId = existingGuardian ? (existingGuardian._id?.$oid || existingGuardian._id?.toString()) : null;

                if (!existingGuardian) {
                    // Create New Guardian User
                    const guardianEmail = null;
                    const guardianPassword = metadata.guardianPassword || guardianPhone;

                    await (prisma as any).$runCommandRaw({
                        insert: 'User',
                        documents: [
                            {
                                name: metadata.guardianName,
                                email: guardianEmail,
                                phone: guardianPhone,
                                password: guardianPassword,
                                role: 'GUARDIAN',
                                instituteIds: instIds,
                                metadata: { childrenIds: [] },
                                createdAt: { $date: new Date().toISOString() },
                                updatedAt: { $date: new Date().toISOString() }
                            }
                        ]
                    });

                    const createdGuardianRaw = await (prisma as any).$runCommandRaw({
                        find: 'User',
                        filter: { phone: guardianPhone },
                        limit: 1
                    });
                    const createdGuardian = createdGuardianRaw.cursor?.firstBatch?.[0];
                    if (createdGuardian) {
                        guardianId = createdGuardian._id?.$oid || createdGuardian._id?.toString();
                    }
                } else {
                    await (prisma as any).$runCommandRaw({
                        update: 'User',
                        updates: [
                            {
                                q: { _id: { $oid: guardianId } },
                                u: { $addToSet: { instituteIds: { $each: instIds.map((i: any) => i.$oid) } } }
                            }
                        ]
                    });
                }

                const studentRaw = await (prisma as any).$runCommandRaw({
                    find: 'User',
                    filter: { email: email?.trim() || null }, // Use email or null for lookup
                    limit: 1
                });
                const student = studentRaw.cursor?.firstBatch?.[0];

                if (student && guardianId) {
                    const studentId = student._id?.$oid || student._id?.toString();

                    await (prisma as any).$runCommandRaw({
                        update: 'User',
                        updates: [
                            {
                                q: { _id: { $oid: studentId } },
                                u: { $set: { "metadata.guardianId": guardianId } }
                            }
                        ]
                    });

                    await (prisma as any).$runCommandRaw({
                        update: 'User',
                        updates: [
                            {
                                q: { _id: { $oid: guardianId } },
                                u: { $addToSet: { "metadata.childrenIds": studentId } }
                            }
                        ]
                    });
                }
            } catch (guardianError) {
                console.error('Guardian Automation Error:', guardianError);
            }
        }

        // --- Manual Student Linking (for Guardians) ---
        if (role === 'GUARDIAN' && body.studentId) {
            try {
                const studentId = body.studentId;
                const relationship = body.relationship;

                const createdGuardianRaw = await (prisma as any).$runCommandRaw({
                    find: 'User',
                    filter: { email: email?.trim() || null }, // Use email or null for lookup
                    limit: 1
                });
                const createdGuardian = createdGuardianRaw.cursor?.firstBatch?.[0];
                const guardianId = createdGuardian?._id?.$oid || createdGuardian?._id?.toString();

                if (guardianId && studentId) {
                    await (prisma as any).$runCommandRaw({
                        update: 'User',
                        updates: [
                            {
                                q: { _id: { $oid: guardianId } },
                                u: { $addToSet: { "metadata.childrenIds": studentId } }
                            }
                        ]
                    });

                    await (prisma as any).$runCommandRaw({
                        update: 'User',
                        updates: [
                            {
                                q: { _id: { $oid: studentId } },
                                u: {
                                    $set: {
                                        "metadata.guardianId": guardianId,
                                        "metadata.guardianRelation": relationship
                                    }
                                }
                            }
                        ]
                    });
                }
            } catch (linkError) {
                console.error('Manual Student Linking Error:', linkError);
            }
        }
        // -----------------------------------

        return NextResponse.json({ success: true, message: 'User created successfully' }, { status: 201 });
    } catch (error) {
        console.error('Admin User Creation Error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const session = await getServerSession();
        if (!session) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { id, email, password, role, name, metadata, phone, faceDescriptor } = body;

        if (!id) return NextResponse.json({ message: 'User ID is required' }, { status: 400 });

        const set: any = {};
        if (email) set.email = email;
        if (password) {
            set.password = password;
            set['metadata.originalPassword'] = password;
        }
        if (role) set.role = role;
        if (name) set.name = name;
        if (metadata) {
            set.metadata = {
                ...metadata,
                originalPassword: password || metadata.originalPassword
            };
        }
        if (phone) set.phone = phone;
        if (faceDescriptor && Array.isArray(faceDescriptor) && faceDescriptor.length > 0) set.faceDescriptor = faceDescriptor;

        await (prisma as any).$runCommandRaw({
            update: 'User',
            updates: [
                {
                    q: { _id: { $oid: id } },
                    u: { $set: set }
                }
            ]
        });

        return NextResponse.json({ success: true, message: 'User updated successfully' });
    } catch (error) {
        console.error('Admin User Update Error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const session = await getServerSession();
        if (!session) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ message: 'User ID is required' }, { status: 400 });

        await (prisma as any).$runCommandRaw({
            delete: 'User',
            deletes: [
                {
                    q: { _id: { $oid: id } },
                    limit: 1
                }
            ]
        });

        return NextResponse.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Admin User Delete Error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

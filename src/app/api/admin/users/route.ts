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
        const includeFaceData = searchParams.get('includeFaceData') === 'true';
        const lightweight = searchParams.get('lightweight') === 'true';
        const countOnly = searchParams.get('countOnly') === 'true';

        const session = await getServerSession();
        if (!session) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id: userId, role: baseRole, instituteIds, teacherProfiles } = session.user as any;
        const activeRole = activeRoleQuery || baseRole;


        // Support fetching a single user by ID
        if (id) {
            // Validate that id looks like a MongoDB ObjectId
            if (!/^[a-f0-9]{24}$/i.test(id)) {
                return NextResponse.json({ message: 'Invalid user ID format' }, { status: 400 });
            }

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

            const metadata = (user.metadata as any) || {};
            const faceDescriptor = (user as any).faceDescriptor || [];
            const formattedUser = {
                id: user.id,
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || '',
                password: metadata.originalPassword || user.password || '',
                role: user.role || 'USER',
                createdAt: user.createdAt,
                institute: user.institutes?.[0] ? { name: (user.institutes[0] as any).name } : null,
                metadata: {
                    ...metadata,
                    hasFaceId: metadata.hasFaceId || (Array.isArray(faceDescriptor) && faceDescriptor.length > 0)
                },
                ...(includeFaceData ? { faceDescriptor } : {})
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
                    const classFilters: any[] = [{ 'metadata.classId': classId }];
                    if (/^[a-fA-F0-9]{24}$/.test(classId)) {
                        classFilters.push({ 'metadata.classId': { $oid: classId } });
                    }
                    match.$and = match.$and || [];
                    match.$and.push({ $or: classFilters });
                }
            }
        } else {
            if (classId && classId !== 'all') {
                const classFilters: any[] = [{ 'metadata.classId': classId }];
                if (/^[a-fA-F0-9]{24}$/.test(classId)) {
                    classFilters.push({ 'metadata.classId': { $oid: classId } });
                }
                match.$and = match.$and || [];
                match.$and.push({ $or: classFilters });
            }
        }
        if (groupId && groupId !== 'all') {
            const groupFilters: any[] = [{ 'metadata.groupId': groupId }];
            if (/^[a-fA-F0-9]{24}$/.test(groupId)) {
                groupFilters.push({ 'metadata.groupId': { $oid: groupId } });
            }
            match.$and = match.$and || [];
            match.$and.push({ $or: groupFilters });
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
            
            // Number normalization: Bengali to English, English to Bengali
            const banglaToEnglish: { [key: string]: string } = {
                '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
                '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
            };
            const englishToBangla: { [key: string]: string } = {
                '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
                '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
            };
            
            const normalizedSearch = search.replace(/[০-৯]/g, (m: string) => banglaToEnglish[m]);
            const searchBangla = normalizedSearch.replace(/[0-9]/g, (m: string) => englishToBangla[m]);
            
            const searchTerms = Array.from(new Set([search, normalizedSearch, searchBangla]));
            const searchOrFilters: any[] = [];
            
            searchTerms.forEach(term => {
                // Add regex for text fields
                searchOrFilters.push({ name: { $regex: term, $options: 'i' } });
                searchOrFilters.push({ email: { $regex: term, $options: 'i' } });
                searchOrFilters.push({ phone: { $regex: term, $options: 'i' } });
                searchOrFilters.push({ 'metadata.fathersName': { $regex: term, $options: 'i' } });
                searchOrFilters.push({ 'metadata.mothersName': { $regex: term, $options: 'i' } });
                searchOrFilters.push({ 'metadata.studentPhone': { $regex: term, $options: 'i' } });
                searchOrFilters.push({ 'metadata.guardianPhone': { $regex: term, $options: 'i' } });

                const isNumericTerm = /^\d+$/.test(term);
                if (isNumericTerm) {
                    // Exact match on studentId or rollNumber as integer
                    searchOrFilters.push({ 'metadata.studentId': parseInt(term) });
                    searchOrFilters.push({ 'metadata.rollNumber': parseInt(term) });
                } 
                
                // String matches for studentId/rollNumber
                searchOrFilters.push({ 'metadata.studentId': term });
                searchOrFilters.push({ 'metadata.rollNumber': term });

                // If the searched value is a valid MongoDB ObjectId, allow direct user lookup too
                if (/^[a-fA-F0-9]{24}$/.test(term)) {
                    searchOrFilters.push({ _id: { $oid: term } });
                }
            });

            match.$and.push({ $or: searchOrFilters });
        }

        if (Object.keys(match).length > 0) {
            pipeline.push({ $match: match });
        }

        if (countOnly) {
            pipeline.push({ $count: 'total' });
            const result = await (prisma as any).$runCommandRaw({
                aggregate: 'User',
                pipeline,
                cursor: {}
            });
            const total = result.cursor?.firstBatch?.[0]?.total || 0;
            return NextResponse.json({ total });
        }

        // PRE-PROJECT: Strip heavy faceDescriptor arrays immediately so $sort doesn't exceed 100MB RAM limit
        if (!includeFaceData) {
            pipeline.push({ $project: { faceDescriptor: 0 } });
        }

        // Re-enabled sort: Now that documents are lightweight, in-memory sort takes < 1ms
        if (!lightweight) {
            if (!classId || classId === 'all') {
                pipeline.push({ $sort: { 'metadata.classId': 1, createdAt: -1 } });
            } else {
                pipeline.push({ $sort: { createdAt: -1 } });
            }
        }

        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '300');
        const skip = (page - 1) * limit;

        if (skip > 0) {
            pipeline.push({ $skip: skip });
        }
        pipeline.push({ $limit: limit });

        // Optimize: Skip Institute lookup for students to drastically improve performance (20x faster)
        // since the frontend already has the activeInstitute context and doesn't display it anyway.
        if (role !== 'STUDENT') {
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
                        institute: { $arrayElemAt: ['$institutes', 0] },
                        hasFaceId: { $ifNull: ["$metadata.hasFaceId", false] }
                    }
                }
            );
        }

        
        let projectStage: any = {
            institutes: 0
        };

        if (lightweight && role === 'STUDENT') {
            projectStage = {
                name: 1,
                email: 1,
                phone: 1,
                role: 1,
                updatedAt: 1,
                createdAt: 1,
                'metadata.classId': 1,
                'metadata.groupId': 1,
                'metadata.studentId': 1,
                'metadata.rollNumber': 1,
                'metadata.phone': 1,
                'metadata.guardianPhone': 1,
                'metadata.status': 1,
                'metadata.feeTier': 1,
                'metadata.guardianId': 1
            };
        }

        pipeline.push({ $project: projectStage });

        const usersRaw = await (prisma as any).$runCommandRaw({
            aggregate: 'User',
            pipeline,
            cursor: { batchSize: 5000 }
        });

        const users = (usersRaw.cursor?.firstBatch || []).map((user: any) => {
            const mappedUser: any = {
                id: user._id?.$oid || user._id?.toString(),
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || '',
                role: user.role || 'USER',
                createdAt: user.createdAt?.$date || user.createdAt,
                updatedAt: user.updatedAt?.$date || user.updatedAt,
                institute: user.institute ? { name: user.institute.name } : null,
                metadata: {
                    ...(user.metadata || {}),
                    hasFaceId: user.hasFaceId || user.metadata?.hasFaceId || false
                }
            };

            if (!lightweight) {
                mappedUser.password = user.metadata?.originalPassword || user.password || '';
                mappedUser.faceDescriptor = user.faceDescriptor || [];
            } else if (includeFaceData) {
                mappedUser.faceDescriptor = user.faceDescriptor || [];
            }

            // Exclude passwords from metadata to be safe
            if (mappedUser.metadata?.originalPassword) delete mappedUser.metadata.originalPassword;

            return mappedUser;
        });



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
                // If skipping setup, set a default password instead of a random one
                password = '123456';
            } else {
                password = '123456';
            }
        }

        if (!password || !role) {
            return NextResponse.json({ message: 'Missing required fields (Password and Role required)' }, { status: 400 });
        }

        // Convert instituteIds to ObjectIds for MongoDB
        const instIds = (instituteIds || []).map((id: string) => ({ $oid: id }));

        // Store original password in metadata for superadmin visibility
        finalMetadata.originalPassword = password;
        if (Array.isArray(faceDescriptor) && faceDescriptor.length > 0) {
            finalMetadata.hasFaceId = true;
        }

        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(password, 10);

        const userDoc: any = {
            name: name || '',
            password: hashedPassword,
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

        const createdUserRaw = await (prisma as any).$runCommandRaw({
            insert: 'User',
            documents: [userDoc]
        });

        const newUserId = userDoc._id || createdUserRaw?.insertedIds?.['0'];

        // --- Create TeacherProfile automatically if role is TEACHER ---
        if (role === 'TEACHER' && instIds.length > 0 && newUserId) {
            try {
                await (prisma as any).$runCommandRaw({
                    insert: 'TeacherProfile',
                    documents: [
                        {
                            userId: { $oid: newUserId.$oid || newUserId.toString() },
                            instituteId: instIds[0],
                            status: 'ACTIVE',
                            permissions: {},
                            assignedClassIds: [],
                            createdAt: { $date: new Date().toISOString() },
                            updatedAt: { $date: new Date().toISOString() }
                        }
                    ]
                });
            } catch (err) {
                console.error('Failed to create TeacherProfile during admin user creation:', err);
            }
        }
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
        if (role) set.role = role;
        if (name) set.name = name;
        if (phone) set.phone = phone;

        // Safely construct the updated metadata to avoid Mongo path conflicts
        let updatedMetadata = { ...(metadata || {}) };
        
        if (password) {
            // Hash the password for DB security
            const bcrypt = require('bcryptjs');
            set.password = await bcrypt.hash(password, 10);
            
            // Keep the plaintext available in metadata for admin visibility
            updatedMetadata.originalPassword = password;
        }

        if (faceDescriptor && Array.isArray(faceDescriptor) && faceDescriptor.length > 0) {
            set.faceDescriptor = faceDescriptor;
            updatedMetadata.hasFaceId = true;
        }

        // Only update metadata if it was provided or modified
        if (metadata || password || faceDescriptor) {
            set.metadata = updatedMetadata;
        }

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

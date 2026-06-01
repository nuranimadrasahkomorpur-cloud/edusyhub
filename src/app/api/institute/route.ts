import { NextResponse } from 'next/server';
import prisma from '@/utils/db';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        console.log('GET /api/institute', { userId });

        if (!userId) {
            return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
        }


        // Check DB Connectivity
        try {
            await prisma.$runCommandRaw({ ping: 1 });
        } catch (e: any) {
            console.error('❌ Database Connection Failed (ping):', e);
            return NextResponse.json({
                message: 'Database connection failed',
                error: e.message || String(e),
                hint: 'Please ensure MongoDB is running and network is stable.'
            }, { status: 503 });
        }

        // Step 1: Try Standard Prisma Client first (more robust if schema matches)
        let instituteIds: string[] = [];
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { instituteIds: true }
            });
            if (user && user.instituteIds) {
                instituteIds = user.instituteIds;
                console.log(`✅ Fetched ${instituteIds.length} instituteIds via Standard Prisma`);
            }
        } catch (prismaError) {
            console.warn('⚠️ Standard Prisma Find failed, falling back to Raw Command:', prismaError);

            // Fallback: Raw Find User to get instituteIds
            const rawUserResponse: any = await prisma.$runCommandRaw({
                find: "User",
                filter: { _id: { "$oid": userId } },
                projection: { instituteIds: 1 },
                limit: 1
            });

            if (
                rawUserResponse &&
                rawUserResponse.cursor &&
                rawUserResponse.cursor.firstBatch &&
                rawUserResponse.cursor.firstBatch.length > 0
            ) {
                const userDoc = rawUserResponse.cursor.firstBatch[0];
                const rawIds = userDoc.instituteIds;

                if (Array.isArray(rawIds)) {
                    instituteIds = rawIds.map((idObj: any) => {
                        if (typeof idObj === 'string') return idObj;
                        if (idObj && idObj.$oid) return idObj.$oid;
                        return null;
                    }).filter(Boolean) as string[];
                }
            } else {
                console.log('User not found or no institutes via raw fetch');
            }
        }

        // Auto-heal: upgrade any PENDING teacher profiles to ACTIVE
        try {
            await (prisma as any).teacherProfile.updateMany({
                where: { userId: userId, status: 'PENDING' },
                data: { status: 'ACTIVE' }
            });
        } catch (e) {
            console.error('Auto-heal teacher profile error:', e);
        }

        // Fetch any institutes where user is an ACTIVE teacher
        try {
            const teacherProfiles = await (prisma as any).teacherProfile.findMany({
                where: { userId: userId, status: 'ACTIVE' },
                select: { instituteId: true }
            });
            if (teacherProfiles && teacherProfiles.length > 0) {
                const teacherInstIds = teacherProfiles.map((tp: any) => tp.instituteId);
                instituteIds = Array.from(new Set([...instituteIds, ...teacherInstIds]));
                console.log(`✅ Added ${teacherInstIds.length} instituteIds via TeacherProfile`);
            }
        } catch (tpError) {
            console.warn('⚠️ Failed to fetch teacher profiles:', tpError);
        }

        console.log(`GET /api/institute found ${instituteIds.length} total IDs:`, instituteIds);

        if (instituteIds.length === 0) {
            return NextResponse.json([]);
        }

        // Step 2: Fetch Institutes using RAW command to ensure ALL fields (including coverImage) are returned
        // Prisma client might be out of sync, so we use raw MongoDB to bypass schema validation
        const rawInstitutesResponse: any = await prisma.$runCommandRaw({
            find: "Institute",
            filter: {
                _id: {
                    "$in": instituteIds.map(id => ({ "$oid": id }))
                }
            }
        });

        let institutes: any[] = [];
        if (
            rawInstitutesResponse &&
            rawInstitutesResponse.cursor &&
            rawInstitutesResponse.cursor.firstBatch
        ) {
            institutes = rawInstitutesResponse.cursor.firstBatch.map((doc: any) => ({
                id: doc._id.$oid || doc._id,
                name: doc.name,
                type: doc.type,
                address: doc.address,
                phone: doc.phone,
                email: doc.email,
                website: doc.website,
                logo: doc.logo,
                coverImage: doc.coverImage,  // CRITICAL: Ensure this is included
                adminIds: doc.adminIds?.map((id: any) => id.$oid || id) || [],
                createdAt: doc.createdAt?.$date || doc.createdAt,
                updatedAt: doc.updatedAt?.$date || doc.updatedAt
            }));
        }

        console.log(`✅ Returning ${institutes.length} institutes with full data including coverImage`);

        // Filter institutes to only those where user is:
        // 1. An Admin (in adminIds), OR
        // 2. Has an ACTIVE TeacherProfile

        const filteredInstitutes = [];
        for (const inst of institutes) {
            // Check if user is admin
            const isAdmin = inst.adminIds.includes(userId);

            if (isAdmin) {
                filteredInstitutes.push({
                    ...inst,
                    isOwner: true
                });
                continue;
            }

            // Check if user has ACTIVE teacher profile
            const teacherProfile = await (prisma as any).teacherProfile.findFirst({
                where: {
                    userId: userId,
                    instituteId: inst.id,
                    status: 'ACTIVE'
                }
            });

            if (teacherProfile) {
                filteredInstitutes.push({
                    ...inst,
                    isOwner: false
                });
            }
        }

        console.log(`Filtered from ${institutes.length} to ${filteredInstitutes.length} institutes (excluding PENDING teacher invitations)`);
        return NextResponse.json(filteredInstitutes);

    } catch (error) {
        console.error('Fetch Institutes Error details:', error);
        return NextResponse.json({ message: 'Internal server error', error: String(error) }, { status: 500 });
    }
}


export async function POST(req: Request) {
    try {
        const body = await req.json();
        console.log('CREATE INSTITUTE BODY:', body);
        const { name, type, address, phone, website, logo, coverImage, userId } = body;

        if (!name || !userId) {
            console.log('MISSING FIELDS:', { name, userId });
            return NextResponse.json({ message: 'Missing fields' }, { status: 400 });
        }

        // Verify user exists first
        const existingUser = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!existingUser) {
            console.log('USER NOT FOUND:', userId);
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        // Create institute using Raw MongoDB command to bypass Prisma Client validation error
        // (Client seems out of sync with schema for adminIds/admins)

        const timestamp = Math.floor(Date.now() / 1000).toString(16);
        const random = 'xxxxxxxxxxxxxxxx'.replace(/[x]/g, () => (Math.random() * 16 | 0).toString(16));
        const objectId = timestamp + random; // 24 hex chars

        const instituteDoc = {
            _id: { "$oid": objectId },
            name,
            type,
            address,
            phone,
            website,
            logo,
            coverImage,
            adminIds: [{ "$oid": userId }],
            createdAt: { "$date": new Date().toISOString() },
            updatedAt: { "$date": new Date().toISOString() }
        };

        console.log('Inserting Raw Institute:', instituteDoc);

        await prisma.$runCommandRaw({
            insert: "Institute",
            documents: [instituteDoc]
        });

        // Manually update the user to include this institute
        try {
            await prisma.$runCommandRaw({
                update: "User",
                updates: [
                    {
                        q: { _id: { "$oid": userId } },
                        u: { "$push": { instituteIds: { "$oid": objectId } } }
                    }
                ]
            });
            console.log('User linked to institute via RAW command');
        } catch (updateError) {
            console.error('Failed to link institute to user via Raw Command:', updateError);
        }

        // AUTO-UPGRADE: If teacher creates institute, make them ADMIN
        if (existingUser.role === 'TEACHER') {
            try {
                await prisma.user.update({
                    where: { id: userId },
                    data: { role: 'ADMIN' }
                });
                console.log(`User ${userId} upgraded from TEACHER to ADMIN`);
            } catch (roleError) {
                console.error('Failed to upgrade user role:', roleError);
            }
        }

        // Fetch the fully updated user with relations for session sync
        const updatedUser = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                institutes: true
            }
        });

        const responseInst = {
            id: objectId,
            name,
            type,
            address,
            phone,
            website,
            logo,
            coverImage,
            adminIds: [userId]
        };

        console.log('INSTITUTE CREATED (RAW):', responseInst);

        return NextResponse.json({
            institute: responseInst,
            user: updatedUser
        });
    } catch (error) {
        console.error('Create Institute Error:', error);
        return NextResponse.json({ message: 'Internal server error', error: String(error) }, { status: 500 });
    }
}


export async function PATCH(req: Request) {
    try {
        const body = await req.json();
        const { id, name, type, address, phone, website, logo, coverImage, isDefault, userId } = body;

        if (!id) return NextResponse.json({ message: 'ID is required' }, { status: 400 });

        // Use Raw Command for Update to avoid any schema/client mismatch issues
        // Since POST required it, PATCH likely will too if we touch any fields Prisma is sensitive about.
        // Even for simple fields (name, type), using raw ensures consistency.

        console.log('PATCHING INSTITUTE RAW:', { id, name, type, address, phone, website, logo, coverImage }); // Added logo/cover log

        const updateFields: any = {};
        if (name !== undefined) updateFields.name = name;
        if (type !== undefined) updateFields.type = type;
        if (address !== undefined) updateFields.address = address;
        if (phone !== undefined) updateFields.phone = phone;
        if (website !== undefined) updateFields.website = website;
        if (logo !== undefined) updateFields.logo = logo;             // Use undefined check for empty strings
        if (coverImage !== undefined) updateFields.coverImage = coverImage; // Use undefined check for empty strings
        updateFields.updatedAt = { "$date": new Date().toISOString() };

        await prisma.$runCommandRaw({
            update: "Institute",
            updates: [
                {
                    q: { _id: { "$oid": id } },
                    u: { "$set": updateFields }
                }
            ]
        });

        if (isDefault && userId) {
            await prisma.$runCommandRaw({
                update: "User",
                updates: [
                    {
                        q: { _id: { "$oid": userId } },
                        u: { "$set": { defaultInstituteId: { "$oid": id } } }
                    }
                ]
            });
        }

        return NextResponse.json({ id, ...updateFields });
    } catch (error) {
        console.error('Update Institute Error:', error);
        return NextResponse.json({ message: 'Internal server error', error: String(error) }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const body = await req.json();
        const { instituteId, userId, password } = body;

        console.log('DELETE INSTITUTE REQUEST:', { instituteId, userId });

        if (!instituteId || !userId || !password) {
            return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
        }

        // 1. Verify User Password
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user || user.password !== password) {
            return NextResponse.json({ message: 'Invalid password' }, { status: 401 });
        }

        // 2. Verify Institute Ownership (Admin check)
        const isOwner = user.instituteIds.includes(instituteId);
        if (!isOwner && user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        }

        // 3. Manual Cascade Delete using Raw Commands (Safety first)

        // Find all classes for this institute to get their IDs
        const classes = await prisma.class.findMany({
            where: { instituteId: instituteId },
            select: { id: true }
        });
        const classIds = classes.map(c => c.id);

        console.log(`Found ${classIds.length} classes to delete for institute ${instituteId}`);

        // Delete Groups related to these classes
        if (classIds.length > 0) {
            const deleteGroups = await prisma.$runCommandRaw({
                delete: "Group",
                deletes: [{ q: { classId: { "$in": classIds.map(id => ({ "$oid": id })) } }, limit: 0 }]
            });
            console.log('Deleted Groups:', deleteGroups);
        }

        // Delete Classes
        const deleteClasses = await prisma.$runCommandRaw({
            delete: "Class",
            deletes: [{ q: { instituteId: { "$oid": instituteId } }, limit: 0 }]
        });
        console.log('Deleted Classes:', deleteClasses);

        // 4. Unlink Institute from User
        await prisma.$runCommandRaw({
            update: "User",
            updates: [
                {
                    q: { _id: { "$oid": userId } },
                    u: { "$pull": { instituteIds: { "$oid": instituteId } } }
                }
            ]
        });

        // 5. Delete Institute
        const deleteInstitute = await prisma.$runCommandRaw({
            delete: "Institute",
            deletes: [{ q: { _id: { "$oid": instituteId } }, limit: 1 }]
        });
        console.log('Deleted Institute:', deleteInstitute);

        return NextResponse.json({ message: 'Institute deleted successfully' });

    } catch (error) {
        console.error('Delete Institute Error:', error);
        return NextResponse.json({ message: 'Internal server error', error: String(error) }, { status: 500 });
    }
}

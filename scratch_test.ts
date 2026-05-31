import prisma from './src/utils/db';

async function main() {
    try {
        console.log("Querying database with runCommandRaw...");
        const result = await (prisma as any).$runCommandRaw({
            find: 'User',
            filter: {
                role: 'STUDENT'
            },
            projection: {
                _id: 1,
                name: 1,
                faceDescriptor: 1
            }
        });
        
        const students = (result.cursor?.firstBatch || []).map((s: any) => ({
            id: s._id?.$oid || s._id?.toString(),
            name: s.name,
            faceDescriptor: s.faceDescriptor
        }));

        console.log(`Success! Found ${students.length} students.`);
        console.log("Sample student:", students[0]);
    } catch (error) {
        console.error("Database Query Failed:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

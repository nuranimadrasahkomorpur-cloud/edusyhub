const { MongoClient } = require('mongodb');
const url = 'mongodb+srv://edusy_admin:admin123@cluster0.cgr1coc.mongodb.net/edusy?retryWrites=true&w=majority&appName=Cluster0';

async function main() {
    const client = new MongoClient(url);
    try {
        await client.connect();
        const db = client.db('edusy');

        console.log('--- Institutes ---');
        const institutes = await db.collection('Institute').find({}).toArray();
        for (const inst of institutes) {
            console.log(`ID: ${inst._id.toString()}, Name: ${inst.name}`);
            console.log(`  adminIds:`, inst.adminIds ? inst.adminIds.map(id => id.toString()) : 'None');
        }

        console.log('\n--- Admin Users ---');
        const admins = await db.collection('User').find({ role: { $in: ['ADMIN', 'SUPER_ADMIN'] } }).toArray();
        for (const admin of admins) {
            console.log(`ID: ${admin._id.toString()}, Name: ${admin.name}, Email: ${admin.email}, Role: ${admin.role}`);
            console.log(`  instituteIds:`, admin.instituteIds ? admin.instituteIds.map(id => id.toString()) : 'None');
        }

        console.log('\n--- Teacher Profiles ---');
        const profiles = await db.collection('TeacherProfile').find({}).toArray();
        for (const p of profiles) {
            console.log(`ID: ${p._id.toString()}, User ID: ${p.userId ? p.userId.toString() : 'None'}, Inst ID: ${p.instituteId ? p.instituteId.toString() : 'None'}`);
            console.log(`  Status: ${p.status}, isAdmin: ${p.isAdmin}`);
        }
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

main();

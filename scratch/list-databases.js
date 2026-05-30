const { MongoClient } = require('mongodb');
const url = 'mongodb+srv://edusy_admin:admin123@cluster0.cgr1coc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function main() {
    const client = new MongoClient(url);
    try {
        await client.connect();
        console.log('Connected to MongoDB Atlas cluster.');
        
        // List databases
        const adminDb = client.db().admin();
        const dbs = await adminDb.listDatabases();
        console.log('Databases on Cluster0:', dbs.databases.map(db => db.name));
        
        for (const dbInfo of dbs.databases) {
            const db = client.db(dbInfo.name);
            const collections = await db.listCollections().toArray();
            console.log(`- Database: ${dbInfo.name}, Collections:`, collections.map(c => c.name));
            if (collections.some(c => c.name === 'User')) {
                const userCount = await db.collection('User').countDocuments();
                console.log(`  User count in ${dbInfo.name}: ${userCount}`);
                const sampleUser = await db.collection('User').findOne({ email: 'superadmin@edusy.com' });
                console.log(`  superadmin@edusy.com exists in ${dbInfo.name}?:`, !!sampleUser);
                if (sampleUser) {
                    console.log(`    Role: ${sampleUser.role}, Password: ${sampleUser.password}`);
                }
            }
        }
    } catch (e) {
        console.error('Error listing databases:', e);
    } finally {
        await client.close();
    }
}

main();

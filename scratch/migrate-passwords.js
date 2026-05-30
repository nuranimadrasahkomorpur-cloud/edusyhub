const { MongoClient } = require('mongodb');
const url = 'mongodb+srv://edusy_admin:admin123@cluster0.cgr1coc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function main() {
    const client = new MongoClient(url);
    try {
        await client.connect();
        console.log('Connected to MongoDB Atlas cluster.');
        const db = client.db('edusy');
        const collection = db.collection('User');

        const users = await collection.find({}).toArray();
        console.log(`Found ${users.length} users in total.`);

        let updatedCount = 0;
        for (const user of users) {
            const password = user.password || '';
            const isHashed = password.startsWith('$2a$') || password.startsWith('$2b$');

            // If the password is plaintext and originalPassword is not already set
            if (!isHashed && (!user.metadata || !user.metadata.originalPassword)) {
                const currentMetadata = user.metadata || {};
                const updatedMetadata = {
                    ...currentMetadata,
                    originalPassword: password
                };

                await collection.updateOne(
                    { _id: user._id },
                    { $set: { metadata: updatedMetadata } }
                );
                updatedCount++;
            }
        }

        console.log(`Successfully migrated ${updatedCount} users to store originalPassword in metadata.`);

    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        await client.close();
    }
}

main();

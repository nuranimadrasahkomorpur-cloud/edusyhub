const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env' });
MongoClient.connect(process.env.DATABASE_URL).then(async client => {
    const db = client.db();
    
    const institutes = await db.collection('Institute').find({}).toArray();
    console.log(`Found ${institutes.length} institutes.`);
    
    for (const institute of institutes) {
        const instituteId = institute._id;
        
        const students = await db.collection('User').find({
            role: 'STUDENT',
            instituteIds: instituteId
        }).sort({ createdAt: 1 }).toArray();
        
        console.log(`Processing ${students.length} students for institute ${institute.name}...`);
        
        let counter = 101;
        for (const student of students) {
            const metadata = student.metadata || {};
            metadata.studentId = counter.toString();
            
            await db.collection('User').updateOne(
                { _id: student._id },
                { $set: { metadata: metadata } }
            );
            
            counter++;
        }
        
        await db.collection('Counter').updateOne(
            { _id: `${instituteId.toString()}_studentId` },
            { $set: { seq: counter } },
            { upsert: true }
        );
    }
    
    console.log("All student IDs have been successfully reset!");
    client.close();
});

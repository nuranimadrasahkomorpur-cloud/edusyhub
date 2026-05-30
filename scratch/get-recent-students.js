const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env' });
MongoClient.connect(process.env.DATABASE_URL).then(async client => {
    const db = client.db();
    const students = await db.collection('User').find({ role: 'STUDENT', 'metadata.studentId': { $exists: true } })
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray();
    console.log(students.map(s => ({
        name: s.name, 
        studentId: s.metadata.studentId, 
        createdAt: s.createdAt
    })));
    client.close();
});

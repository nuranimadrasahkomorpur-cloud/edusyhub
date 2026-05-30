const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env' });
MongoClient.connect(process.env.DATABASE_URL).then(async client => {
    const db = client.db();
    const students = await db.collection('User').find({ role: 'STUDENT', 'metadata.studentId': { $exists: true } }).toArray();
    console.log(students.map(s => s.metadata.studentId));
    client.close();
});

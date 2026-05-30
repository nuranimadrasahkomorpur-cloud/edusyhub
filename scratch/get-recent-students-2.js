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
    
    // find max id
    const max = await db.collection('User').aggregate([
        { $match: { role: 'STUDENT', 'metadata.studentId': { $exists: true } } },
        { $project: { numId: { $convert: { input: "$metadata.studentId", to: "int", onError: 0, onNull: 0 } } } },
        { $group: { _id: null, max: { $max: "$numId" } } }
    ]).toArray();
    console.log('MAX ID IN DB:', max[0].max);
    
    client.close();
});

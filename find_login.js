const fs = require('fs');
const content = fs.readFileSync('src/app/dashboard/students/page.tsx', 'utf8');
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('SKIP') || lines[i].includes('skip') || lines[i].includes('Login') || lines[i].includes('login')) {
        console.log(`${i + 1}: ${lines[i].trim()}`);
    }
}

const fs = require('fs');
const lines = fs.readFileSync('src/app/dashboard/students/page.tsx', 'utf8').split('\n');
lines.forEach((line, i) => {
  if (line.includes('isFeesMode')) {
    console.log(`${i + 1}: ${line.trim()}`);
  }
});

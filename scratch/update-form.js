const fs = require('fs');
const file = 'f:/Edusy User flow/Edusy app/src/app/dashboard/students/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const returnBlockStart = content.indexOf('return (\n                                        <div className="space-y-8">\n                                            {activeFormTab === \'profile\' ? (');

if (returnBlockStart === -1) {
    console.log('Return block not found');
} else {
    console.log('Found return block at ' + returnBlockStart);
}

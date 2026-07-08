import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/app/dashboard/students/page.tsx';
let content = readFileSync(filePath, 'utf8');

// Patch 1: Insert father/mother name row before dob row
const dobRow = `                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                {renderField('dob')}
                                                                {renderField('gender')}
                                                                {renderField('religion')}
                                                                {renderField('bloodGroup')}
                                                            </div>`;

const parentRow = `                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                {renderField('fathersName')}
                                                                {renderField('mothersName')}
                                                            </div>
` + dobRow;

if (content.includes(dobRow)) {
    content = content.replace(dobRow, parentRow);
    console.log('✅ Patch 1 applied: fathersName/mothersName row inserted before dob row');
} else {
    // Try with \r\n
    const dobRowCRLF = dobRow.replace(/\n/g, '\r\n');
    const parentRowCRLF = parentRow.replace(/\n/g, '\r\n');
    if (content.includes(dobRowCRLF)) {
        content = content.replace(dobRowCRLF, parentRowCRLF);
        console.log('✅ Patch 1 applied (CRLF): fathersName/mothersName row inserted before dob row');
    } else {
        console.log('❌ Patch 1 FAILED: could not find dobRow');
        // Print surrounding context
        const idx = content.indexOf("renderField('dob')");
        if (idx > -1) {
            console.log('Context around dob:', JSON.stringify(content.slice(idx - 200, idx + 200)));
        }
    }
}

// Patch 2: Exclude fathersName/mothersName from catch-all filter
const oldFilter = `!['nameEnglish', 'dob', 'gender', 'religion', 'bloodGroup', 'nationality', 'birthRegNo'].includes(f.id)`;
const newFilter = `!['nameEnglish', 'dob', 'gender', 'religion', 'bloodGroup', 'nationality', 'birthRegNo', 'fathersName', 'mothersName'].includes(f.id)`;

if (content.includes(oldFilter)) {
    content = content.replace(oldFilter, newFilter);
    console.log('✅ Patch 2 applied: exclusion list updated');
} else {
    console.log('❌ Patch 2 FAILED: could not find oldFilter string');
}

writeFileSync(filePath, content, 'utf8');
console.log('Done.');

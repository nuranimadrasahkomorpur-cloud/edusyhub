// Emergency fix script
// Run from: f:\Edusy User flow\Edusy app
// Command: node fix_page.mjs

import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/app/dashboard/students/page.tsx';
let lines = readFileSync(filePath, 'utf8').split('\n');

// Find the broken section:
// We look for the onPaste line followed by a line containing '<div className="space-y-4">'
// which is the wrong JSX that was inserted inside the event handler

let brokenStart = -1;
let brokenEnd = -1;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/\r$/, ''); // strip CR
    if (line.trimEnd().endsWith('onPaste={(e) => {')) {
        // Check if next line is broken JSX (not valid JS inside an event handler)
        const nextLine = (lines[i + 1] || '').replace(/\r$/, '').trim();
        if (nextLine.startsWith('<div className="space-y-4">')) {
            brokenStart = i;
            console.log(`Found broken onPaste at line ${i + 1}`);
        }
    }
    // Find the end: the broken line that has '</div>' and 'placeholder=' on the same line
    if (brokenStart !== -1 && brokenEnd === -1) {
        const line2 = lines[i].replace(/\r$/, '');
        if (line2.includes('</div>') && line2.includes('placeholder={field.placeholder')) {
            brokenEnd = i;
            console.log(`Found broken end at line ${i + 1}`);
        }
    }
}

if (brokenStart === -1 || brokenEnd === -1) {
    console.log('Could not find the broken section. File may already be fixed or pattern changed.');
    console.log(`brokenStart=${brokenStart}, brokenEnd=${brokenEnd}`);
    process.exit(1);
}

console.log(`Replacing lines ${brokenStart + 1} to ${brokenEnd + 1}`);

// The correct replacement for the onPaste handler + closing tags
const indent = '                                                                 ';
const replacement = [
    `${indent}onPaste={(e) => {`,
    `${indent}   e.preventDefault();`,
    `${indent}   const pasted = normalizeAuthIdentifier(e.clipboardData.getData('text')).replace(/\\D/g, '').slice(0, 17);`,
    `${indent}   if (pasted) {`,
    `${indent}       let newVal = (fieldValue || '').split('');`,
    `${indent}       for(let j=0; j<pasted.length; j++) {`,
    `${indent}           if(i+j < 17) newVal[i+j] = pasted[j];`,
    `${indent}       }`,
    `${indent}       const finalVal = newVal.join('').slice(0, 17);`,
    `${indent}       if (isTopLevel) setFormData({ ...formData, [field.id]: finalVal });`,
    `${indent}       else setFormData({ ...formData, metadata: { ...formData.metadata, [field.id]: finalVal } });`,
    `${indent}       `,
    `${indent}       const nextIndex = Math.min(16, i + pasted.length);`,
    `${indent}       const targetInput = e.currentTarget.parentElement?.children[nextIndex] as HTMLInputElement;`,
    `${indent}       if (targetInput) targetInput.focus();`,
    `${indent}   }`,
    `${indent}}}`,
    `                                                            />`,
    `                                                        ))}`,
    `                                                    </div>`,
    `                                                ) : (`,
    `                                                    <div className="relative group/field">`,
    `                                                        <input`,
    `                                                            type={field.type === 'number' ? 'text' : field.type === 'date' ? 'date' : 'text'}`,
    `                                                            inputMode={field.type === 'number' ? 'numeric' : undefined}`,
    `                                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#045c84]/10 transition-all outline-none font-bold text-slate-900 placeholder:text-slate-300"`,
    `                                                            placeholder={field.placeholder || \`\${field.label} \u09a6\u09bf\u09a8\`}`,
];

// Replace the broken lines
lines.splice(brokenStart, brokenEnd - brokenStart + 1, ...replacement);

// Preserve original line endings (CRLF)
const result = lines.join('\n');
writeFileSync(filePath, result, 'utf8');
console.log('✅ File restored successfully!');
console.log(`Replaced ${brokenEnd - brokenStart + 1} broken lines with ${replacement.length} correct lines`);

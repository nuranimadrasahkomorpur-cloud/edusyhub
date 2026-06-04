const fs = require('fs');
const path = 'f:/Edusy User flow/Edusy app/src/app/dashboard/students/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add State
if (!content.includes('const [tableColumns')) {
    content = content.replace(
        'const [loadingFees, setLoadingFees] = useState(false);',
        `const [loadingFees, setLoadingFees] = useState(false);
    const [tableColumns, setTableColumns] = useState({
        student: true,
        idRoll: true,
        contact: true,
        action: true
    });`
    );
}

// 2. Wrap tabs and add dropdown
if (!content.includes('Column Visibility Dropdown')) {
    content = content.replace(
        '{/* Main Navigation Tabs */}\n                <div className="flex items-center gap-2 p-1 bg-slate-100/50 rounded-2xl w-fit">',
        `{/* Main Navigation Tabs */}
                <div className="flex items-center justify-between gap-4 w-full">
                    <div className="flex items-center gap-2 p-1 bg-slate-100/50 rounded-2xl w-fit shrink-0">`
    );

    const endTabsTarget = `                        <span className="bg-[#045c84]/10 text-[#045c84] px-2 py-0.5 rounded-lg text-[10px]">\n                            {pendingCount || 0}\n                        </span>\n                    </button>\n                </div>`;
    
    const tabsReplacement = `                        <span className="bg-[#045c84]/10 text-[#045c84] px-2 py-0.5 rounded-lg text-[10px]">
                            {pendingCount || 0}
                        </span>
                    </button>
                </div>

                {/* Column Visibility Dropdown */}
                {activeTab === 'students' && viewMode === 'ADMISSION' && (
                    <details className="relative shrink-0 group z-[200]">
                        <summary className="list-none flex items-center gap-2 bg-white border border-slate-200 px-3 sm:px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold text-slate-700 shadow-sm cursor-pointer hover:border-[#045c84] hover:text-[#045c84] transition-all focus:outline-none">
                            <Settings2 size={16} />
                            <span className="hidden sm:inline-block">কলাম</span>
                            <ChevronDown size={16} className="text-slate-400 group-open:rotate-180 transition-transform" />
                        </summary>
                        
                        <div className="absolute right-0 top-[calc(100%+0.5rem)] w-48 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-[210] flex flex-col gap-1">
                            {[
                                { id: 'student', label: 'শিক্ষার্থী' },
                                { id: 'idRoll', label: 'আইডি ও রোল' },
                                { id: 'contact', label: 'যোগাযোগ' },
                                { id: 'action', label: 'অ্যাকশন' }
                            ].map((col) => (
                                <label key={col.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-xl cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={(tableColumns as any)[col.id]}
                                        onChange={(e) => {
                                            setTableColumns(prev => ({ ...prev, [col.id]: e.target.checked }));
                                        }}
                                        className="w-4 h-4 rounded border-slate-300 text-[#045c84] focus:ring-[#045c84]"
                                    />
                                    <span className="text-sm font-medium text-slate-700">{col.label}</span>
                                </label>
                            ))}
                        </div>
                    </details>
                )}
                </div>`;

    content = content.replace(endTabsTarget, tabsReplacement);
}

// 3. Update thead
if (!content.includes('tableColumns.student &&')) {
    const theadTarget = `<thead className="bg-[#045c84]/5 border-b border-[#045c84]/10">
                                        <tr>
                                            <th className="p-4 text-xs font-black text-[#045c84] whitespace-nowrap">শিক্ষার্থী</th>
                                            <th className="p-4 text-xs font-black text-[#045c84] whitespace-nowrap">আইডি ও রোল</th>
                                            <th className="p-4 text-xs font-black text-[#045c84] whitespace-nowrap">যোগাযোগ</th>
                                            <th className="p-4 text-xs font-black text-[#045c84] whitespace-nowrap text-right">অ্যাকশন</th>
                                        </tr>
                                    </thead>`;
                                    
    const theadReplacement = `<thead className="bg-[#045c84]/5 border-b border-[#045c84]/10">
                                        <tr>
                                            {tableColumns.student && <th className="p-4 text-xs font-black text-[#045c84] whitespace-nowrap">শিক্ষার্থী</th>}
                                            {tableColumns.idRoll && <th className="p-4 text-xs font-black text-[#045c84] whitespace-nowrap">আইডি ও রোল</th>}
                                            {tableColumns.contact && <th className="p-4 text-xs font-black text-[#045c84] whitespace-nowrap">যোগাযোগ</th>}
                                            {tableColumns.action && <th className="p-4 text-xs font-black text-[#045c84] whitespace-nowrap text-right">অ্যাকশন</th>}
                                        </tr>
                                    </thead>`;

    content = content.replace(theadTarget, theadReplacement);
}

// 4. Update tds
if (!content.includes('{tableColumns.student && <td className="p-4">')) {
    // Student td
    content = content.replace(
        `<td className="p-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className={\`w-10 h-10 rounded-full \${bgColor} border-2 border-white shadow-sm overflow-hidden flex items-center justify-center text-white font-bold text-sm relative shrink-0 group-hover:scale-105 transition-transform\`}>`,
        `{tableColumns.student && <td className="p-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className={\`w-10 h-10 rounded-full \${bgColor} border-2 border-white shadow-sm overflow-hidden flex items-center justify-center text-white font-bold text-sm relative shrink-0 group-hover:scale-105 transition-transform\`}>`
    );
    // Student td closing
    content = content.replace(
        `                                                        </div>
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-bold text-slate-700">ID:`,
        `                                                        </div>
                                                        </td>}
                                                        {tableColumns.idRoll && <td className="p-4">
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-bold text-slate-700">ID:`
    );
    // idRoll td closing
    content = content.replace(
        `                                                        </td>
                                                        <td className="p-4">
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-bold text-slate-700">{s.phone`,
        `                                                        </td>}
                                                        {tableColumns.contact && <td className="p-4">
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-bold text-slate-700">{s.phone`
    );
    // contact td closing
    content = content.replace(
        `                                                            </div>
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            <div className="flex justify-end items-center gap-2">`,
        `                                                            </div>
                                                        </td>}
                                                        {tableColumns.action && <td className="p-4 text-right">
                                                            <div className="flex justify-end items-center gap-2">`
    );
    // action td closing
    content = content.replace(
        `                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>`,
        `                                                                </button>
                                                            </div>
                                                        </td>}
                                                    </tr>`
    );
}

fs.writeFileSync(path, content);
console.log("Done");

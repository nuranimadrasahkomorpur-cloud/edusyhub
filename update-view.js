const fs = require('fs');
const path = 'f:/Edusy User flow/Edusy app/src/app/dashboard/students/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const tableCode = `
                        {(() => {
                            const filteredStudents = students.filter(s => {
                                // Local class and group filtering
                                if (selectedClassId !== 'all' && s.metadata?.classId !== selectedClassId) return false;
                                if (selectedGroupId !== 'all' && s.metadata?.groupId !== selectedGroupId) return false;

                                if (activeRole === 'TEACHER') {
                                    if (allowedClasses.length > 0) {
                                        const studentClassId = s.metadata?.classId;
                                        return allowedClasses.some(c => c.id === studentClassId);
                                    }
                                    return false;
                                }
                                return true;
                            });

                            return (
                                <>
                                    {viewMode === 'ADMISSION' ? (
                                        <div className="overflow-x-auto pb-32 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
                                            <table className="w-full text-left border-collapse bg-white rounded-2xl shadow-sm overflow-hidden min-w-[800px]">
                                                <thead className="bg-[#045c84]/5 border-b border-[#045c84]/10">
                                                    <tr>
                                                        <th className="p-4 text-xs font-black text-[#045c84] whitespace-nowrap">শিক্ষার্থী</th>
                                                        <th className="p-4 text-xs font-black text-[#045c84] whitespace-nowrap">আইডি ও রোল</th>
                                                        <th className="p-4 text-xs font-black text-[#045c84] whitespace-nowrap">যোগাযোগ</th>
                                                        <th className="p-4 text-xs font-black text-[#045c84] whitespace-nowrap text-right">অ্যাকশন</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {filteredStudents.map((s, index) => {
                                                        const colors = ['bg-orange-500', 'bg-yellow-400', 'bg-teal-500', 'bg-emerald-500', 'bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500'];
                                                        const colorIndex = s.name ? s.name.length % colors.length : 0;
                                                        const bgColor = colors[colorIndex];
                                                        
                                                        return (
                                                            <tr 
                                                                key={s.id} 
                                                                className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                                                                onClick={() => { setSelectedStudent(s); setIsProfileModalOpen(true); }}
                                                            >
                                                                <td className="p-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className={\`w-10 h-10 rounded-full \${bgColor} border-2 border-white shadow-sm overflow-hidden flex items-center justify-center text-white font-bold text-sm relative shrink-0 group-hover:scale-105 transition-transform\`}>
                                                                            <span className="absolute inset-0 flex items-center justify-center z-0">{s.name?.[0] || 'S'}</span>
                                                                            {s.metadata?.studentPhoto && (
                                                                                <img 
                                                                                    src={s.metadata.studentPhoto} 
                                                                                    alt={s.name} 
                                                                                    loading="lazy"
                                                                                    className="w-full h-full object-cover relative z-10 opacity-0 transition-opacity duration-500" 
                                                                                    onLoad={(e) => e.target.classList.remove('opacity-0')}
                                                                                />
                                                                            )}
                                                                        </div>
                                                                        <div>
                                                                            <h3 className="font-bold text-slate-800 text-sm">{s.name}</h3>
                                                                            <div className="text-xs text-slate-500 font-medium">
                                                                                {classes.find(c => c.id === s.metadata?.classId)?.name || 'শ্রেণী নেই'}
                                                                                {s.metadata?.groupId ? \` • \${groups.find(g => g.id === s.metadata?.groupId)?.name}\` : ''}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="p-4">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-xs font-bold text-slate-700">ID: {s.metadata?.studentId || s.id.substring(0, 6)}</span>
                                                                        <span className="text-xs font-medium text-slate-500">Roll: {s.metadata?.rollNumber || '-'}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="p-4">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-xs font-bold text-slate-700">{s.phone || s.metadata?.phone || s.metadata?.guardianPhone || '-'}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="p-4 text-right">
                                                                    <div className="flex justify-end items-center gap-2">
                                                                        {(s.phone || s.metadata?.phone || s.metadata?.guardianPhone) && (
                                                                            <a
                                                                                href={\`tel:\${s.phone || s.metadata?.phone || s.metadata?.guardianPhone}\`}
                                                                                onClick={(e) => e.stopPropagation()}
                                                                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                                                                title="কল করুন"
                                                                            >
                                                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-phone"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                                                                            </a>
                                                                        )}
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                // Using a simpler trigger for the action menu
                                                                                setIsActionMenuOpen(isActionMenuOpen === s.id ? null : s.id);
                                                                            }}
                                                                            className="p-2 text-slate-500 hover:text-[#045c84] hover:bg-blue-50 rounded-xl transition-all"
                                                                        >
                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-more-vertical"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 pb-32">
                                            {filteredStudents.map((s, index) => {
`;

// Now find the original grid start and extract it
const startTarget = `<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 pb-32">\n                            {students\n                                .filter(s => {\n                                    // Local class and group filtering\n                                    if (selectedClassId !== 'all' && s.metadata?.classId !== selectedClassId) return false;\n                                    if (selectedGroupId !== 'all' && s.metadata?.groupId !== selectedGroupId) return false;\n\n                                    if (activeRole === 'TEACHER') {\n                                        if (allowedClasses.length > 0) {\n                                            const studentClassId = s.metadata?.classId;\n                                            return allowedClasses.some(c => c.id === studentClassId);\n                                        }\n                                        return false;\n                                    }\n                                    return true;\n                                })\n                                .map((s, index) => {`;

const startTarget2 = startTarget.replace(/\\n/g, '\n').replace(/\\r/g, '\r');

let newContent = content.replace(startTarget, tableCode);

// If the previous replace failed because of exact match issues, use index slicing
if (newContent === content) {
    const gridIndex = content.indexOf('<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 pb-32">');
    if (gridIndex > -1) {
        const mapIndex = content.indexOf('.map((s, index) => {', gridIndex);
        if (mapIndex > -1) {
            newContent = content.substring(0, gridIndex) + tableCode + content.substring(mapIndex + '.map((s, index) => {'.length);
        }
    }
}

// Now replace the end part
const endTargetIndex = newContent.indexOf('</div>\n                        {students.filter(s => {');
if (endTargetIndex > -1) {
    const nextCodeIndex = newContent.indexOf('</button>\n                            </div>\n                        )}\n                    </>', endTargetIndex);
    if (nextCodeIndex > -1) {
        const afterIndex = nextCodeIndex + '</button>\n                            </div>\n                        )}\n                    </>'.length;
        
        const replaceString = `</div>
                                    )}
                                    {filteredStudents.length > 0 && hasMore && (
                                        <div className="flex justify-center mt-8 pb-10">
                                            <button 
                                                onClick={() => fetchStudents(currentPage + 1)} 
                                                disabled={isLoadingMore}
                                                className="px-6 py-2.5 bg-blue-50 text-[#045c84] hover:bg-[#045c84] hover:text-white rounded-xl font-bold transition-all flex items-center gap-2 disabled:opacity-50"
                                            >
                                                {isLoadingMore ? (
                                                    <><Loader2 className="animate-spin" size={18} /> লোড হচ্ছে...</>
                                                ) : (
                                                    <>আরও লোড করুন <ChevronDown size={18} /></>
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </>`;
        
        newContent = newContent.substring(0, endTargetIndex) + replaceString + newContent.substring(afterIndex);
    }
}

fs.writeFileSync(path, newContent);
console.log("Done");

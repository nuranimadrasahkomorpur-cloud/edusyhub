'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Users,
    TrendingUp,
    Calendar as CalendarIcon,
    ArrowUpRight,
    ArrowDownRight,
    Loader2,
    PieChart as PieChartIcon,
    BarChart3,
    Activity,
    UserCheck,
    UserX,
    Clock,
    LayoutGrid,
    ChevronDown
} from 'lucide-react';
import { useSession } from './SessionProvider';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar,
    Cell,
    PieChart,
    Pie
} from 'recharts';

interface SummaryData {
    summary: {
        totalCount: number;
        present: number;
        absent: number;
        late: number;
        leave: number;
    };
    dailyTrends: Array<{
        date: string;
        present: number;
        absent: number;
        late: number;
    }>;
    classBreakdown: Array<{
        className: string;
        rate: number;
    }>;
}

export default function AttendanceSummary({
    initialClassId = '',
    initialStartDate,
    initialEndDate
}: {
    initialClassId?: string;
    initialStartDate?: string;
    initialEndDate?: string;
} = {}) {
    const { user, activeRole, activeInstitute } = useSession();
    const isAdminUser = activeRole === 'ADMIN' || activeRole === 'SUPER_ADMIN' || (() => {
        const profile = (user?.teacherProfiles || []).find((p: any) => p.instituteId === activeInstitute?.id);
        return profile?.isAdmin === true;
    })();
    const [classes, setClasses] = useState<any[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId);
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<SummaryData | null>(null);
    const [startDate, setStartDate] = useState(() => {
        if (initialStartDate) return initialStartDate;
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => initialEndDate || new Date().toISOString().split('T')[0]);
    const [quickDate, setQuickDate] = useState<string>(() => {
        if (initialStartDate && initialEndDate) {
            const startDay = initialStartDate.split('-')[2];
            const endMonthStr = initialEndDate.substring(0, 7);
            const startMonthStr = initialStartDate.substring(0, 7);
            if (startDay === '01' && startMonthStr === endMonthStr) {
                const year = parseInt(initialEndDate.substring(0, 4));
                const month = parseInt(initialEndDate.substring(5, 7));
                const lastDay = new Date(year, month, 0).getDate();
                if (parseInt(initialEndDate.split('-')[2]) === lastDay) {
                    return 'thisMonth';
                }
            }
        }
        return '';
    });

    const handleQuickDateSelect = (range: string) => {
        setQuickDate(range);
        if (!range) return;
        
        const today = new Date();
        let start = new Date();
        let end = new Date();

        switch (range) {
            case 'today':
                break;
            case 'yesterday':
                start.setDate(today.getDate() - 1);
                end.setDate(today.getDate() - 1);
                break;
            case 'thisWeek':
                // Assuming week starts on Sunday
                const day = today.getDay();
                start.setDate(today.getDate() - day);
                break;
            case 'thisMonth':
                start.setDate(1);
                break;
            case 'thisYear':
                start.setMonth(0, 1);
                break;
        }

        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
    };

    useEffect(() => {
        if (activeInstitute) {
            fetchClasses();
            fetchSummary();
        }
    }, [activeInstitute, selectedClassId, startDate, endDate]);

    const canViewReportForClass = (classId: string) => {
        if (!classId) return true; // Keep 'All Classes' option, but it will be filtered in the breakdown if we implemented filtering there.
        // For simplicity, if they can take attendance, they can see reports.
        if (activeRole === 'ADMIN' || activeRole === 'SUPER_ADMIN') return true;
        if (activeRole === 'TEACHER' && user?.teacherProfiles) {
            const profile = (user.teacherProfiles || []).find((p: any) => p.instituteId === activeInstitute?.id);
            if (!profile) return false;
            if (profile.isAdmin) return true;
            if (!profile.permissions?.classWise) return false;

            const classPermissions = profile.permissions.classWise[classId];
            if (!classPermissions) return false;

            if (classPermissions && typeof classPermissions === 'object' && classPermissions.permissions && Array.isArray(classPermissions.permissions)) {
                return classPermissions.permissions.includes('canTakeAttendance');
            }
            if (Array.isArray(classPermissions)) {
                return classPermissions.includes('canTakeAttendance');
            }
        }
        return false;
    };

    const fetchClasses = async () => {
        try {
            const res = await fetch(`/api/admin/classes?instituteId=${activeInstitute?.id}`);
            if (res.ok) {
                const data = await res.json();
                const filteredClasses = Array.isArray(data) ? data.filter((c: any) => canViewReportForClass(c.id)) : [];
                setClasses(filteredClasses);
                
                if (!isAdminUser && filteredClasses.length > 0 && (!selectedClassId || !filteredClasses.some(c => c.id === selectedClassId))) {
                    setSelectedClassId(filteredClasses[0].id);
                }
            }
        } catch (err) {
            console.error('Error fetching classes:', err);
        }
    };

    const fetchSummary = async () => {
        setLoading(true);
        try {
            const url = `/api/attendance/summary?instituteId=${activeInstitute?.id}&classId=${selectedClassId}&startDate=${startDate}&endDate=${endDate}`;
            const res = await fetch(url);
            if (res.ok) {
                const result = await res.json();
                setData(result);
            }
        } catch (err) {
            console.error('Error fetching summary:', err);
        } finally {
            setLoading(false);
        }
    };

    const totalPieCount = data ? (data.summary.present + data.summary.absent + data.summary.late + data.summary.leave) : 0;
    const pieData = data ? [
        { name: 'উপস্থিত', value: data.summary.present, color: '#10b981' },
        { name: 'অনুপস্থিত', value: data.summary.absent, color: '#f43f5e' },
        { name: 'দেরি', value: data.summary.late, color: '#f59e0b' },
        { name: 'ছুটি', value: data.summary.leave, color: '#3b82f6' },
    ].filter(d => d.value > 0).map(item => {
        const pct = totalPieCount > 0 ? Math.round((item.value / totalPieCount) * 100) : 0;
        return { ...item, percentage: pct };
    }) : [];

    const isRange = startDate !== endDate;
    const stats = [
        {
            name: 'গড় উপস্থিতি',
            value: data ? (data.summary.totalCount > 0 ? Math.round(((data.summary.present + data.summary.late) / data.summary.totalCount) * 100) : 0) + '%' : '0%',
            icon: Activity,
            color: 'blue'
        },
        {
            name: 'মোট রেকর্ড',
            value: data?.summary.totalCount.toLocaleString('bn-BD') || '০',
            icon: Users,
            color: 'teal'
        },
        {
            name: isRange ? 'মোট উপস্থিত' : 'আজ উপস্থিত',
            value: data ? (data.summary.present + data.summary.late).toLocaleString('bn-BD') : '০',
            icon: UserCheck,
            color: 'emerald'
        },
        {
            name: isRange ? 'মোট অনুপস্থিত' : 'আজ অনুপস্থিত',
            value: data?.summary.absent.toLocaleString('bn-BD') || '০',
            icon: UserX,
            color: 'rose'
        }
    ];

    return (
        <div className="space-y-8 font-bengali p-6 max-w-7xl mx-auto">
            {/* Filters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => { setStartDate(e.target.value); setQuickDate(''); }}
                            className="bg-transparent border-none outline-none text-sm font-black text-slate-600 px-4 py-1.5 cursor-pointer"
                        />
                        <span className="text-slate-300 font-bold px-1 self-center">থেকে</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => { setEndDate(e.target.value); setQuickDate(''); }}
                            className="bg-transparent border-none outline-none text-sm font-black text-slate-600 px-4 py-1.5 cursor-pointer"
                        />
                    </div>

                    <div className="relative group min-w-[140px]">
                        <select
                            value={quickDate}
                            onChange={(e) => handleQuickDateSelect(e.target.value)}
                            className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 ring-[#045c84]/20 transition-all cursor-pointer h-[42px]"
                        >
                            <option value="">কাস্টম তারিখ</option>
                            <option value="today">আজ</option>
                            <option value="yesterday">গতকাল</option>
                            <option value="thisWeek">এই সপ্তাহ</option>
                            <option value="thisMonth">এই মাস</option>
                            <option value="thisYear">এই বছর</option>
                        </select>
                        <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>

                    <div className="relative group min-w-[180px]">
                        <select
                            value={selectedClassId}
                            onChange={(e) => setSelectedClassId(e.target.value)}
                            className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 ring-[#045c84]/20 transition-all cursor-pointer h-[42px]"
                        >
                            {isAdminUser && <option value="">সব ক্লাস</option>}
                            {classes.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchSummary}
                        className="bg-[#045c84] text-white px-8 py-3.5 rounded-2xl font-black text-base flex items-center gap-2 hover:bg-[#034a6b] transition-all shadow-lg shadow-blue-900/10"
                    >
                        রিফ্রেশ করুন
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {stats.map((stat, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-all group"
                    >
                        <div className={`p-5 rounded-2xl bg-${stat.color}-50 text-${stat.color}-600 inline-flex mb-4 group-hover:bg-${stat.color}-600 group-hover:text-white transition-all`}>
                            <stat.icon size={32} />
                        </div>
                        <p className="text-slate-400 font-black uppercase text-xs tracking-widest mb-1">{stat.name}</p>
                        <h3 className="text-4xl font-black text-slate-800 tracking-tighter">{stat.value}</h3>
                    </motion.div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Daily Trend Chart */}
                <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col min-h-[450px]">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                                <TrendingUp className="text-[#045c84]" />
                                উপস্থিতি প্রবণতা
                            </h3>
                            <p className="text-slate-400 text-xs font-bold mt-1">গত ৩০ দিনের উপস্থিতির পরিবর্তন</p>
                        </div>
                    </div>
                    <div className="flex-1 w-full">
                        {loading ? (
                            <div className="h-full flex items-center justify-center">
                                <Loader2 className="animate-spin text-slate-300" size={40} />
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                                <AreaChart data={data?.dailyTrends}>
                                    <defs>
                                        <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#045c84" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#045c84" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="date"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }}
                                        dy={10}
                                        tickFormatter={(val) => val.split('-').slice(1).join('/')}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        labelStyle={{ fontWeight: 'black', color: '#1e293b', marginBottom: '4px' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="present"
                                        stroke="#045c84"
                                        strokeWidth={4}
                                        fillOpacity={1}
                                        fill="url(#colorPresent)"
                                        name="উপস্থিত"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Status Breakdown Pie */}
                <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col min-h-[450px]">
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2 mb-8">
                        <PieChartIcon className="text-[#045c84]" />
                        পরিস্থিতি বিশ্লেষণ
                    </h3>
                    <div className="flex-1 w-full relative">
                        {loading ? (
                            <div className="h-full flex items-center justify-center">
                                <Loader2 className="animate-spin text-slate-300" size={40} />
                            </div>
                        ) : (
                            <>
                                <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            innerRadius={80}
                                            outerRadius={110}
                                            paddingAngle={8}
                                            dataKey="value"
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-xs font-black text-slate-400 uppercase">গড় হার</span>
                                    <span className="text-3xl font-black text-slate-800">{stats[0].value}</span>
                                </div>
                            </>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                        {pieData.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                <span className="text-[11px] font-bold text-slate-500 uppercase">
                                    {item.name} {item.percentage}%
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Class Breakdown Section */}
            {!selectedClassId && (
                <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2 mb-8">
                        <BarChart3 className="text-[#045c84] text-lg" />
                        ক্লাস ভিত্তিক পারফরম্যান্স
                    </h3>
                    <div className="h-[300px]">
                        {loading ? (
                            <div className="h-full flex items-center justify-center">
                                <Loader2 className="animate-spin text-slate-300" size={40} />
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                                <BarChart data={data?.classBreakdown} layout="vertical" margin={{ left: 40, right: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                    <XAxis type="number" hide />
                                    <YAxis
                                        type="category"
                                        dataKey="className"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: '#64748b', fontWeight: 'black' }}
                                        width={100}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar
                                        dataKey="rate"
                                        radius={[0, 10, 10, 0]}
                                        barSize={24}
                                        name="উপস্থিতির হার (%)"
                                    >
                                        {data?.classBreakdown.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.rate >= 80 ? '#10b981' : entry.rate >= 50 ? '#f59e0b' : '#f43f5e'}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

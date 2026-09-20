'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/SessionProvider';
import {
    Sparkles,
    Key,
    Link as LinkIcon,
    Save,
    Loader2,
    Eye,
    EyeOff,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Play,
    Copy,
    Check,
    Cpu,
    ExternalLink,
    ShieldCheck,
    RefreshCw
} from 'lucide-react';
import Toast from '@/components/Toast';

export default function GeminiSettingsPage() {
    const { user, activeRole } = useSession();
    const isSuperAdmin = activeRole === 'SUPER_ADMIN';

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);

    // Settings state
    const [apiKey, setApiKey] = useState('');
    const [apiUrl, setApiUrl] = useState('');
    const [model, setModel] = useState('gemini-2.5-flash');
    const [isActive, setIsActive] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);

    // UI state
    const [showKey, setShowKey] = useState(false);
    const [copied, setCopied] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [testResult, setTestResult] = useState<{
        success: boolean;
        message?: string;
        reply?: string;
        latencyMs?: number;
        error?: string;
    } | null>(null);

    const getStoredUserId = () => {
        if (user?.id) return user.id;
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem('edusy_session');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    return parsed.id || '';
                }
            } catch {}
        }
        return '';
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const uid = getStoredUserId();
            const headers: Record<string, string> = {};
            if (uid) headers['x-user-id'] = uid;
            const url = uid ? `/api/admin/settings/gemini?userId=${encodeURIComponent(uid)}` : '/api/admin/settings/gemini';

            const res = await fetch(url, { headers });
            if (res.ok) {
                const data = await res.json();
                setApiKey(data.geminiApiKey || '');
                setApiUrl(data.geminiApiUrl || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent');
                setModel(data.geminiModel || 'gemini-2.5-flash');
                setIsActive(data.isGeminiActive ?? true);
                if (data.updatedAt) {
                    setLastUpdated(new Date(data.updatedAt).toLocaleString('bn-BD'));
                }
            } else {
                const errData = await res.json().catch(() => ({}));
                setToast({ message: errData.message || 'সেটিংস লোড করতে সমস্যা হয়েছে।', type: 'error' });
            }
        } catch (error) {
            console.error('Fetch error:', error);
            setToast({ message: 'সার্ভারের সাথে সংযোগ স্থাপন করা যায়নি।', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!isSuperAdmin) {
            setToast({ message: 'শুধুমাত্র সুপার অ্যাডমিন সেটিংস পরিবর্তন করতে পারবেন।', type: 'error' });
            return;
        }

        setSaving(true);
        try {
            const uid = getStoredUserId();
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (uid) headers['x-user-id'] = uid;
            const url = uid ? `/api/admin/settings/gemini?userId=${encodeURIComponent(uid)}` : '/api/admin/settings/gemini';

            const res = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    geminiApiKey: apiKey,
                    geminiApiUrl: apiUrl,
                    geminiModel: model,
                    isGeminiActive: isActive
                })
            });

            const data = await res.json();
            if (res.ok) {
                setToast({ message: 'Gemini AI সেটিংস ডাটাবেসে সফলভাবে সংরক্ষিত হয়েছে!', type: 'success' });
                if (data.settings?.updatedAt) {
                    setLastUpdated(new Date(data.settings.updatedAt).toLocaleString('bn-BD'));
                }
            } else {
                setToast({ message: data.message || 'সেটিংস সংরক্ষণ ব্যর্থ হয়েছে।', type: 'error' });
            }
        } catch (error) {
            console.error('Save error:', error);
            setToast({ message: 'সংরক্ষণের সময় ত্রুটি ঘটেছে।', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleTestConnection = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const uid = getStoredUserId();
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (uid) headers['x-user-id'] = uid;
            const url = uid ? `/api/admin/settings/gemini/test?userId=${encodeURIComponent(uid)}` : '/api/admin/settings/gemini/test';

            const res = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    geminiApiKey: apiKey,
                    geminiApiUrl: apiUrl,
                    geminiModel: model
                })
            });

            const data = await res.json();
            setTestResult(data);
            if (data.success) {
                setToast({ message: 'Gemini API সংযোগ সফল হয়েছে!', type: 'success' });
            } else {
                setToast({ message: 'API টেস্ট ব্যর্থ: ' + (data.error || 'অজানা ত্রুটি'), type: 'error' });
            }
        } catch (error: any) {
            setTestResult({
                success: false,
                error: error.message || 'টেস্ট চলাকালীন নেটওয়ার্ক ত্রুটি ঘটেছে।'
            });
        } finally {
            setTesting(false);
        }
    };

    const handleCopy = () => {
        if (!apiKey) return;
        navigator.clipboard.writeText(apiKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        setToast({ message: 'API Key কপি করা হয়েছে!', type: 'info' });
    };

    const handleResetDefaultUrl = () => {
        setApiUrl(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`);
        setToast({ message: 'ডিফল্ট এন্ডপয়েন্ট লিঙ্ক সেট করা হয়েছে।', type: 'info' });
    };

    if (loading) {
        return (
            <div className="flex h-[60vh] w-full items-center justify-center">
                <Loader2 className="animate-spin text-[#045c84]" size={36} />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#045c84] to-cyan-600 flex items-center justify-center text-white shadow-md shadow-[#045c84]/20">
                        <Sparkles size={24} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl sm:text-2xl font-black text-slate-800">
                                Google Gemini AI সিস্টেম সেটিংস
                            </h1>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                                সুপার অ্যাডমিন নিয়ন্ত্রণ
                            </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1">
                            এডুসি প্ল্যাটফর্মের এআই ও অটোমেশন ফিচারের জন্য ডাটাবেস ভিত্তিক Gemini API Key ও লিঙ্ক পরিচালনা করুন।
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        id="btn-refresh-gemini-settings"
                        type="button"
                        onClick={fetchSettings}
                        className="p-2.5 text-slate-500 hover:text-[#045c84] hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
                        title="রিফ্রেশ করুন"
                    >
                        <RefreshCw size={18} />
                    </button>
                    <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                    >
                        <span>Google AI Studio</span>
                        <ExternalLink size={14} />
                    </a>
                </div>
            </div>

            {/* Main Form */}
            <form onSubmit={handleSave} className="space-y-6">
                {/* System Status Banner */}
                <div className={`p-4 rounded-2xl border transition-all ${
                    isActive 
                        ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' 
                        : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full animate-ping ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            <div>
                                <span className="font-bold text-sm">
                                    {isActive ? 'Gemini AI সক্রিয় রয়েছে (Active)' : 'Gemini AI বর্তমানে নিষ্ক্রিয় (Disabled)'}
                                </span>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {isActive 
                                        ? 'প্ল্যাটফর্মের সকল শিক্ষক ও অ্যাডমিন এআই সুবিধা ব্যবহার করতে পারছেন।' 
                                        : 'সিস্টেমব্যাপী সকল এআই সার্ভিস সাময়িকভাবে বন্ধ রাখা হয়েছে।'}
                                </p>
                            </div>
                        </div>

                        {/* Active Toggle */}
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                id="toggle-gemini-active"
                                type="checkbox"
                                checked={isActive}
                                onChange={(e) => setIsActive(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#045c84]"></div>
                        </label>
                    </div>
                </div>

                {/* Configuration Card */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
                    <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                        <Key size={16} className="text-[#045c84]" />
                        <span>API কি ও কানেকশন তথ্য</span>
                    </h2>

                    {/* Gemini API Key */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                            <span>Gemini API Key <span className="text-red-500">*</span></span>
                            <span className="text-[10px] font-medium text-slate-400">ডাটাবেসে সংরক্ষিত</span>
                        </label>
                        <div className="relative">
                            <input
                                id="input-gemini-api-key"
                                type={showKey ? 'text' : 'password'}
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="AIzaSy..."
                                className="w-full pl-4 pr-24 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#045c84]/20 focus:border-[#045c84] transition-all"
                                required
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                <button
                                    id="btn-toggle-key-visibility"
                                    type="button"
                                    onClick={() => setShowKey(!showKey)}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                                    title={showKey ? 'গোপন করুন' : 'দেখুন'}
                                >
                                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                                <button
                                    id="btn-copy-gemini-key"
                                    type="button"
                                    onClick={handleCopy}
                                    className="p-1.5 text-slate-400 hover:text-[#045c84] rounded-lg"
                                    title="কপি করুন"
                                >
                                    {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Gemini API Link / Endpoint */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                <LinkIcon size={14} className="text-[#045c84]" />
                                <span>Gemini API Link / Endpoint URL</span>
                            </label>
                            <button
                                id="btn-reset-api-url"
                                type="button"
                                onClick={handleResetDefaultUrl}
                                className="text-[11px] text-[#045c84] hover:underline font-bold"
                            >
                                ডিফল্ট লিঙ্ক সেট করুন
                            </button>
                        </div>
                        <input
                            id="input-gemini-api-url"
                            type="text"
                            value={apiUrl}
                            onChange={(e) => setApiUrl(e.target.value)}
                            placeholder="https://generativelanguage.googleapis.com/v1beta/models/..."
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#045c84]/20 focus:border-[#045c84] transition-all"
                            required
                        />
                    </div>

                    {/* Model Selector */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                <Cpu size={14} className="text-[#045c84]" />
                                <span>মডেল নির্বাচন (Model)</span>
                            </label>
                            <select
                                id="select-gemini-model"
                                value={model}
                                onChange={(e) => {
                                    const selected = e.target.value;
                                    setModel(selected);
                                    if (apiUrl.includes('generativelanguage.googleapis.com')) {
                                        setApiUrl(`https://generativelanguage.googleapis.com/v1beta/models/${selected}:generateContent`);
                                    }
                                }}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#045c84]/20 focus:border-[#045c84] transition-all cursor-pointer"
                            >
                                <option value="gemini-2.5-flash">Gemini 2.5 Flash (সুপার ফাস্ট ও নির্ভুল - সাজেস্টেড)</option>
                                <option value="gemini-flash-latest">Gemini Flash Latest</option>
                                <option value="gemini-2.5-pro">Gemini 2.5 Pro (উন্নত বিশ্লেষণ ও যুক্তি)</option>
                                <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                সর্বশেষ আপডেট
                            </label>
                            <div className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 flex items-center justify-between">
                                <span>{lastUpdated || 'এখনই কনফিগার করা হলো'}</span>
                                <ShieldCheck size={16} className="text-emerald-600" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Test Result Card */}
                {testResult && (
                    <div className={`p-5 rounded-2xl border animate-in fade-in duration-200 ${
                        testResult.success 
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-950' 
                            : 'bg-red-50 border-red-200 text-red-950'
                    }`}>
                        <div className="flex items-start gap-3">
                            {testResult.success ? (
                                <CheckCircle2 size={22} className="text-emerald-600 shrink-0 mt-0.5" />
                            ) : (
                                <XCircle size={22} className="text-red-600 shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1">
                                <h4 className="font-bold text-sm">
                                    {testResult.success ? 'টেস্ট সফল: Google Gemini রেসপন্স করেছে!' : 'টেস্ট ব্যর্থ হয়েছে'}
                                </h4>
                                {testResult.reply && (
                                    <div className="mt-2 p-3 bg-white/80 rounded-xl border border-emerald-200/60 font-mono text-xs text-slate-800">
                                        &ldquo;{testResult.reply}&rdquo;
                                    </div>
                                )}
                                {testResult.latencyMs && (
                                    <span className="inline-block mt-2 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                                        রেসপন্স সময়: {testResult.latencyMs} ms
                                    </span>
                                )}
                                {testResult.error && (
                                    <p className="mt-1 text-xs text-red-700 font-medium">
                                        ত্রুটি: {testResult.error}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <button
                        id="btn-test-gemini-connection"
                        type="button"
                        onClick={handleTestConnection}
                        disabled={testing || !apiKey}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2 border-[#045c84] text-[#045c84] hover:bg-[#045c84]/5 font-bold text-sm transition-all disabled:opacity-50 cursor-pointer active:scale-95"
                    >
                        {testing ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
                        <span>{testing ? 'কানেকশন টেস্ট হচ্ছে...' : 'কানেকশন টেস্ট করুন (Test API)'}</span>
                    </button>

                    <button
                        id="btn-save-gemini-settings"
                        type="submit"
                        disabled={saving}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl bg-[#045c84] hover:bg-[#034664] text-white font-bold text-sm shadow-md transition-all disabled:opacity-50 cursor-pointer active:scale-95"
                    >
                        {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        <span>{saving ? 'সংরক্ষণ হচ্ছে...' : 'সেটিংস সেভ ও আপডেট করুন'}</span>
                    </button>
                </div>
            </form>
        </div>
    );
}

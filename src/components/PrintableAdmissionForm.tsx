"use client";

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import JsBarcode from 'jsbarcode';
import EditableText from './EditableText';

export interface PrintSettings {
    themeColor: string;
    fontFamily: string;
    layoutStyle: 'compact' | 'standard' | 'spacious';
    contentPlacement: 'center' | 'left';
    textBlocks?: Record<string, string>;
}

interface Props {
    student: any;
    institute: any;
    classes: any[];
    groups: any[];
    settings?: PrintSettings;
    onTextChange?: (key: string, text: string) => void;
}

// Small helper component for rendering barcode SVGs using JsBarcode
const BarcodeSVG = React.memo(({ value, width = 120, height = 36 }: { value: string; width?: number; height?: number }) => {
    const [svgHtml, React_useState] = React.useState<string>('');
    React.useEffect(() => {
        try {
            const ns = 'http://www.w3.org/2000/svg';
            const svgEl = document.createElementNS(ns, 'svg') as SVGSVGElement;
            JsBarcode(svgEl, String(value || ''), {
                format: 'CODE128',
                width: Math.max(1, Math.min(2.2, width / 100)),
                height: height,
                displayValue: false,
                margin: 2,
            });
            const wAttr = svgEl.getAttribute('width');
            const hAttr = svgEl.getAttribute('height');
            const w = wAttr ? wAttr.replace(/px/g, '') : null;
            const h = hAttr ? hAttr.replace(/px/g, '') : null;
            if (w && h) {
                svgEl.setAttribute('viewBox', `0 0 ${w} ${h}`);
                svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
                svgEl.style.width = '100%';
                svgEl.style.height = '100%';
                svgEl.removeAttribute('width');
                svgEl.removeAttribute('height');
            }
            React_useState(svgEl.outerHTML || '');
        } catch (e) {
            console.error('JsBarcode error', e);
            React_useState('');
        }
    }, [value, width, height]);
    if (!svgHtml) return <div style={{ width: `${width}px`, height: `${height}px` }} />;
    return (
        <div 
            dangerouslySetInnerHTML={{ __html: svgHtml }} 
            className="flex justify-center items-center"
            style={{ width: `${width}px`, maxWidth: '100%', height: `${height}px` }} 
        />
    );
});

export default function PrintableAdmissionForm({ student, institute, classes, groups, settings, onTextChange }: Props) {
    const [logoError, setLogoError] = React.useState(false);
    if (!student) return null;

    const className = classes?.find(c => c.id === student.metadata?.classId)?.name || '';
    const dateObj = student.metadata?.admissionDate ? new Date(student.metadata.admissionDate) : new Date();
    const formattedDate = dateObj.toLocaleDateString('bn-BD', { day: 'numeric', month: 'numeric', year: 'numeric' });
    
    // Fallbacks
    const fName = student.name || '';
    const mData = student.metadata || {};
    
    const themeColor = settings?.themeColor || '#107044';
    const fontFamily = settings?.fontFamily || "'SolaimanLipi', 'Hind Siliguri', 'Noto Sans Bengali', sans-serif";
    const layout = settings?.layoutStyle || 'standard';
    const alignment = settings?.contentPlacement || 'center';

    const pStyle = layout === 'compact' ? 'p-2' : layout === 'spacious' ? 'p-6 md:p-12' : 'p-4 md:p-8';
    const gapStyle = layout === 'compact' ? 'gap-y-1 text-xs' : layout === 'spacious' ? 'gap-y-3 text-base' : 'gap-y-2 text-sm';
    
    return (
        <div 
            className={`printable-form bg-white text-black ${pStyle}`} 
            style={{ 
                fontFamily: fontFamily,
                '--theme-color': themeColor
            } as React.CSSProperties}
        >
            {/* Header Box */}
            <div className={`flex flex-col ${alignment === 'left' ? 'items-start text-left' : 'items-center text-center'} pb-4 mb-6 border-b-2 border-[var(--theme-color)] relative`}>
                    <h1 className={`text-2xl md:text-3xl font-extrabold text-[var(--theme-color)] mb-2 leading-tight`}>
                        {institute?.name || 'আল-জামিআতুল ইসলামিয়া দারুস সুফফাহ মাদ্রাসা ও লিল্লাহ বোর্ডিং'}
                    </h1>
                    <div className={`flex items-center ${alignment === 'left' ? 'justify-start' : 'justify-center'} gap-4`}>
                        {institute?.logo && !logoError && (
                            <img 
                                src={institute.logo} 
                                alt="" 
                                className="w-12 h-12 object-contain" 
                                onError={() => setLogoError(true)}
                            />
                        )}
                        <p className="text-sm font-bold">{institute?.address || 'কেয়া-পেছী মেলা বাজার, শেরপুর, বগুড়া।'} | {institute?.phone || '017-5890-6571'}</p>
                    </div>
                </div>
            {/* Top Row Fields (Title & Barcode) */}
            <div className="flex justify-between items-start mb-4 relative">
                {/* Left: Empty Spacer for alignment */}
                <div className="flex-1"></div>
                
                {/* Center: Title Pill */}
                <div className="flex flex-col items-center gap-3 flex-none mx-4">
                    <div className="bg-[var(--theme-color)] text-white px-8 py-1.5 rounded-full font-bold text-lg shadow-sm whitespace-nowrap">
                        ভর্তি ফর্ম
                    </div>
                </div>

                {/* Right: Barcode or Name */}
                <div className="flex-1 flex items-start justify-end">
                    {mData.studentId ? (
                        <div className="border border-[var(--theme-color)] rounded px-2 py-1 bg-white flex items-center justify-center">
                            <BarcodeSVG value={mData.studentId} width={120} height={32} />
                        </div>
                    ) : (
                        <div className="border border-[var(--theme-color)] rounded flex flex-col items-center justify-center px-4 py-1 text-[var(--theme-color)] min-w-[140px] min-h-[42px] bg-white">
                            <span className="font-bold text-sm truncate max-w-[120px]">{fName}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Metadata Row (Full Width) */}
            <div className="flex justify-between items-center w-full mb-6 px-4 text-[var(--theme-color)]">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">ফর্ম নং:</span>
                    <span className="font-bold text-base">{mData.studentId || ''}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">তারিখ:</span>
                    <span className="font-bold text-base">{formattedDate}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">শিক্ষাবর্ষ:</span>
                    <span className="font-bold text-base">{new Date().getFullYear().toLocaleString('bn-BD', {useGrouping: false})}</span>
                </div>
            </div>

            {/* Declaration */}
            <div className="mb-4 text-sm font-medium border border-gray-200 p-3 rounded leading-relaxed">
                <EditableText value={settings?.textBlocks?.['decl_greeting']} onChange={(text) => onTextChange?.('decl_greeting', text)} defaultText="আসসালামু আলাইকুম ওয়ারাহমাতুল্লাহ!" className="mb-2 font-bold inline-block min-w-[200px]" />
                <br />
                <EditableText value={settings?.textBlocks?.['decl_to']} onChange={(text) => onTextChange?.('decl_to', text)} defaultText="মাননীয় মুহতামিম সাহেব," className="mb-2 inline-block min-w-[150px]" />
                <div>
                    <EditableText value={settings?.textBlocks?.['decl_body1']} onChange={(text) => onTextChange?.('decl_body1', text)} defaultText="বিনীত নিবেদন এই যে আমি " className="inline" />
                    <span className="font-bold border-b border-dashed border-gray-400 px-1 mx-1">{fName || '__________'}</span>
                    <EditableText value={settings?.textBlocks?.['decl_body2']} onChange={(text) => onTextChange?.('decl_body2', text)} defaultText="অত্র মাদ্রাসার যাবতীয় বিধি-বিধান ও নিয়মাবলী এবং ভবিষ্যতে গৃহিত আইন-কানুন মেনে চলার অঙ্গীকারবদ্ধ হয়ে অত্র মাদ্রাসায় ভর্তি হওয়ার আবেদন করছি। মেহেরবানি করে আমাকে সুযোগ দেওয়ার অনুরোধ জানাচ্ছি।" className="inline" multiline />
                </div>
            </div>

            {/* Admission Form Main Section */}
            <div className="border border-[var(--theme-color)] rounded overflow-hidden mb-4 break-inside-avoid">
                <div className="bg-[var(--theme-color)] text-white px-3 py-1 font-bold">ভর্তি ফর্ম</div>
                <div className="flex p-3">
                    <div className={`flex-1 grid grid-cols-2 gap-x-6 ${gapStyle} pr-4`}>
                        <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-[var(--theme-color)] font-semibold">নাম</span> <strong>{fName}</strong></div>
                        <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-[var(--theme-color)] font-semibold">জন্ম তারিখ</span> <strong>{mData.dob || mData.dateOfBirth || ''}</strong></div>
                        
                        <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-[var(--theme-color)] font-semibold">ক্লাস</span> <strong>{className}</strong></div>
                        <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-[var(--theme-color)] font-semibold">ভর্তির ধরন</span> <strong>{mData.admissionType || 'নতুন ভর্তি'}</strong></div>
                        
                        <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-[var(--theme-color)] font-semibold">লিঙ্গ</span> <strong>{mData.gender || ''}</strong></div>
                        <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-[var(--theme-color)] font-semibold">আইডি নাম্বার</span> <strong>{mData.studentId || ''}</strong></div>
                        
                        <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-[var(--theme-color)] font-semibold">রক্তের গ্রুপ</span> <strong>{mData.bloodGroup || ''}</strong></div>
                        <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-[var(--theme-color)] font-semibold">জন্ম নিবন্ধন নং</span> <strong>{mData.birthRegNo || ''}</strong></div>
                        
                        <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-[var(--theme-color)] font-semibold">এতিম</span> <strong>{mData.orphan || 'না'}</strong></div>
                        <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-[var(--theme-color)] font-semibold">রেজাল্ট</span> <strong>{mData.result || ''}</strong></div>
                        
                        <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-[var(--theme-color)] font-semibold">পূর্ববর্তী প্রতিষ্ঠান</span> <strong>{mData.previousSchool || ''}</strong></div>
                        <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-[var(--theme-color)] font-semibold">পূর্ববর্তী ক্লাস</span> <strong>{mData.previousClass || ''}</strong></div>
                    </div>
                    {/* Photo Area */}
                    <div className="w-32 flex flex-col justify-between items-center border-l border-gray-200 pl-3">
                        <div className="w-full aspect-[3/4] border-2 border-gray-300 border-dashed rounded flex items-center justify-center overflow-hidden bg-gray-50">
                            {mData.studentPhoto ? (
                                <img src={mData.studentPhoto} alt="Student" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-gray-400 text-xs">ছবি</span>
                            )}
                        </div>
                        <div className="mt-2 text-center w-full border border-gray-200 rounded p-1">
                            <div className="text-[10px] text-gray-500">শিক্ষার্থীর ধরন</div>
                            <div className="font-bold text-xs">{mData.residentialStatus || 'আবাসিক'}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Guardian Info */}
            <div className="border border-[var(--theme-color)] rounded overflow-hidden mb-4 break-inside-avoid">
                <div className="bg-[var(--theme-color)] text-white px-3 py-1 font-bold">পিতা / মাতা / বর্তমান অভিভাবক</div>
                <div className={`p-3 grid grid-cols-2 gap-x-6 ${gapStyle}`}>
                    <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-[var(--theme-color)] font-semibold">পিতা</span> <strong>{mData.fathersName || ''}</strong></div>
                    <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-[var(--theme-color)] font-semibold">মাতা</span> <strong>{mData.mothersName || ''}</strong></div>
                    
                    <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-[var(--theme-color)] font-semibold">বর্তমান অভিভাবক</span> <strong>{mData.guardianName || ''}</strong></div>
                    <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-[var(--theme-color)] font-semibold">সম্পর্ক</span> <strong>{mData.guardianRelation || ''}</strong></div>
                    
                    <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-[var(--theme-color)] font-semibold">মোবাইল</span> <strong>{mData.guardianPhone || ''}</strong></div>
                    <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-[var(--theme-color)] font-semibold">এনআইডি</span> <strong>{mData.guardianNid || ''}</strong></div>
                    
                    <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-[var(--theme-color)] font-semibold">অভিভাবক ২</span> <strong>{mData.guardian2 || ''}</strong></div>
                    <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-[var(--theme-color)] font-semibold">মোবাইল</span> <strong>{mData.guardian2Phone || ''}</strong></div>

                    <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-[var(--theme-color)] font-semibold">অভিভাবক ৩</span> <strong>{mData.guardian3 || ''}</strong></div>
                    <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-[var(--theme-color)] font-semibold">মোবাইল</span> <strong>{mData.guardian3Phone || ''}</strong></div>
                </div>
            </div>

            {/* Address Info */}
            <div className="border border-[var(--theme-color)] rounded overflow-hidden mb-4 break-inside-avoid">
                <div className="bg-[var(--theme-color)] text-white px-3 py-1 font-bold">গ্রাম / ডাকঘর / জেলা</div>
                <div className={`p-3 grid grid-cols-2 gap-x-6 ${gapStyle}`}>
                    <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-[var(--theme-color)] font-semibold">গ্রাম</span> <strong>{mData.village || ''}</strong></div>
                    <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-[var(--theme-color)] font-semibold">ডাকঘর</span> <strong>{mData.postOffice || ''}</strong></div>
                    
                    <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-[var(--theme-color)] font-semibold">থানা</span> <strong>{mData.thana || ''}</strong></div>
                    <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-[var(--theme-color)] font-semibold">জেলা</span> <strong>{mData.district || ''}</strong></div>
                </div>
            </div>

            {/* Declarations */}
            <div className="grid grid-cols-2 gap-4 mb-16 break-inside-avoid">
                <div className="border border-green-200 rounded p-3 bg-green-50/30">
                    <EditableText value={settings?.textBlocks?.['rule1_title']} onChange={(text) => onTextChange?.('rule1_title', text)} defaultText="অভিভাবকের প্রতি" className="font-bold text-[var(--theme-color)] mb-2 border-b border-green-200 pb-1 block" />
                    <EditableText value={settings?.textBlocks?.['rule1_body']} onChange={(text) => onTextChange?.('rule1_body', text)} defaultText="আপনার সন্তানের লেখা-পড়া ও চারিত্রিক উন্নতির লক্ষ্যে মাঝে মাঝে ওস্তাদদের সাথে যোগাযোগ করুন। লেখা-পড়ার স্বার্থে প্রাতিষ্ঠানিক ছুটি ব্যতীত অন্য ছুটি না নেওয়াই শ্রেয়। প্রতি মাসে নির্ধারিত ফি যথাসময়ে পরিশোধ করুন।" className="text-xs text-justify leading-relaxed" multiline />
                </div>
                <div className="border border-blue-200 rounded p-3 bg-blue-50/30">
                    <EditableText value={settings?.textBlocks?.['rule2_title']} onChange={(text) => onTextChange?.('rule2_title', text)} defaultText="শিক্ষার্থীর অঙ্গীকারনামা" className="font-bold text-[#045c84] mb-2 border-b border-blue-200 pb-1 block" />
                    <EditableText value={settings?.textBlocks?.['rule2_body']} onChange={(text) => onTextChange?.('rule2_body', text)} defaultText={`• আমি শরীয়তের আলোকে সবকিছু মেনে চলব。\n• ওস্তাদদের সম্মান করব এবং আনুগত্য করব。\n• কর্তৃপক্ষের অনুমতি ছাড়া মাদ্রাসার বাইরে যাব না。\n• লেখা-পড়া ছাড়া অন্য কোনো ব্যস্ততা রাখব না。\n• ওস্তাদদের কখনো অসম্মান বা বেয়াদবি করব না。\n• মাদ্রাসা কর্তৃক নির্ধারিত সকল নিয়ম-কানুন মেনে চলব।`} className="text-xs leading-relaxed" multiline />
                </div>
            </div>

            {/* Signatures */}
            <div className="flex justify-between items-end px-4 mt-8 pb-4 break-inside-avoid">
                <div className="text-center w-32 border-t border-gray-400 pt-1 font-bold text-sm">শিক্ষার্থীর স্বাক্ষর</div>
                <div className="text-center w-32 border-t border-gray-400 pt-1 font-bold text-sm">অভিভাবকের স্বাক্ষর</div>
                <div className="text-center w-32 border-t border-gray-400 pt-1 font-bold text-sm">মুহতামিমের স্বাক্ষর</div>
            </div>
            

        </div>
    );
}

"use client";

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import JsBarcode from 'jsbarcode';

interface Props {
    student: any;
    institute: any;
    classes: any[];
    groups: any[];
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

export default function PrintableAdmissionForm({ student, institute, classes, groups }: Props) {
    const [logoError, setLogoError] = React.useState(false);
    if (!student) return null;

    const className = classes?.find(c => c.id === student.metadata?.classId)?.name || '';
    const dateObj = student.metadata?.admissionDate ? new Date(student.metadata.admissionDate) : new Date();
    const formattedDate = dateObj.toLocaleDateString('bn-BD', { day: 'numeric', month: 'numeric', year: 'numeric' });
    
    // Fallbacks
    const fName = student.name || '';
    const mData = student.metadata || {};
    
    return (
        <div className="printable-form bg-white text-black p-4 md:p-8" style={{ fontFamily: "'SolaimanLipi', 'Hind Siliguri', 'Noto Sans Bengali', sans-serif" }}>
            {/* Header Box */}
            <div className="border-[3px] border-[#107044] p-3 mb-4 rounded relative">
                {/* Decorative borders could be added here, but keeping it clean and close to the image */}
                <div className="text-center">
                    <h1 className="text-2xl md:text-3xl font-extrabold text-[#107044] mb-2 leading-tight">
                        {institute?.name || 'আল-জামিআতুল ইসলামিয়া দারুস সুফফাহ মাদ্রাসা ও লিল্লাহ বোর্ডিং'}
                    </h1>
                    <div className="flex items-center justify-center gap-4">
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
            </div>

            {/* Top Row Fields */}
            <div className="flex justify-between items-center mb-4 gap-2">
                <div className="border border-[#107044] rounded flex flex-col items-center px-4 py-1 text-[#107044]">
                    <span className="text-[10px] font-bold">ফর্ম নং</span>
                    <span className="font-bold">{mData.studentId || ''}</span>
                </div>
                <div className="border border-[#107044] rounded flex flex-col items-center px-4 py-1 text-[#107044]">
                    <span className="text-[10px] font-bold">তারিখ</span>
                    <span className="font-bold">{formattedDate}</span>
                </div>
                <div className="border border-[#107044] rounded flex flex-col items-center px-4 py-1 text-[#107044]">
                    <span className="text-[10px] font-bold">শিক্ষাবর্ষ</span>
                    <span className="font-bold">{new Date().getFullYear().toLocaleString('bn-BD', {useGrouping: false})}</span>
                </div>
                
                <div className="bg-[#107044] text-white px-8 py-2 rounded-full font-bold text-lg whitespace-nowrap mx-4">
                    ভর্তি ফর্ম
                </div>

                <div className="border border-[#107044] rounded flex-1 flex flex-col items-center justify-center px-4 py-1 text-[#107044] min-w-[150px]">
                    <span className="font-bold">{fName}</span>
                </div>
            </div>

            {/* Declaration */}
            <div className="mb-4 text-sm font-medium border border-gray-200 p-3 rounded">
                <p className="mb-2 font-bold">আসসালামু আলাইকুম ওয়ারাহমাতুল্লাহ!</p>
                <p className="mb-2">মাননীয় মুহতামিম সাহেব,</p>
                <p>
                    বিনীত নিবেদন এই যে আমি <span className="font-bold">{fName}</span> অত্র মাদ্রাসার যাবতীয় বিধি-বিধান ও নিয়মাবলী এবং ভবিষ্যতে গৃহিত আইন-কানুন মেনে চলার 
                    অঙ্গীকারবদ্ধ হয়ে অত্র মাদ্রাসায় ভর্তি হওয়ার আবেদন করছি। মেহেরবানি করে আমাকে সুযোগ দেওয়ার অনুরোধ জানাচ্ছি।
                </p>
            </div>

            {/* Admission Form Main Section */}
            <div className="border border-[#107044] rounded overflow-hidden mb-4">
                <div className="bg-[#107044] text-white px-3 py-1 font-bold">ভর্তি ফর্ম</div>
                <div className="flex p-3">
                    <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-2 text-sm pr-4">
                        <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-gray-600">নাম</span> <strong>{fName}</strong></div>
                        <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-gray-600">জন্ম তারিখ</span> <strong>{mData.dob || mData.dateOfBirth || ''}</strong></div>
                        
                        <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-gray-600">ক্লাস</span> <strong>{className}</strong></div>
                        <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-gray-600">ভর্তির ধরন</span> <strong>{mData.admissionType || 'নতুন ভর্তি'}</strong></div>
                        
                        <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-gray-600">লিঙ্গ</span> <strong>{mData.gender || ''}</strong></div>
                        <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-gray-600">আইডি নাম্বার</span> <strong>{mData.studentId || ''}</strong></div>
                        
                        <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-gray-600">রক্তের গ্রুপ</span> <strong>{mData.bloodGroup || ''}</strong></div>
                        <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-gray-600">জন্ম নিবন্ধন নং</span> <strong>{mData.birthRegNo || ''}</strong></div>
                        
                        <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-gray-600">এতিম</span> <strong>{mData.orphan || 'না'}</strong></div>
                        <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-gray-600">রেজাল্ট</span> <strong>{mData.result || ''}</strong></div>
                        
                        <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-gray-600">পূর্ববর্তী প্রতিষ্ঠান</span> <strong>{mData.previousSchool || ''}</strong></div>
                        <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-gray-600">পূর্ববর্তী ক্লাস</span> <strong>{mData.previousClass || ''}</strong></div>
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
            <div className="border border-[#107044] rounded overflow-hidden mb-4">
                <div className="bg-[#107044] text-white px-3 py-1 font-bold">পিতা / মাতা / বর্তমান অভিভাবক</div>
                <div className="p-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-gray-600">পিতা</span> <strong>{mData.fathersName || ''}</strong></div>
                    <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-gray-600">মাতা</span> <strong>{mData.mothersName || ''}</strong></div>
                    
                    <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-gray-600">বর্তমান অভিভাবক</span> <strong>{mData.guardianName || ''}</strong></div>
                    <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-gray-600">সম্পর্ক</span> <strong>{mData.guardianRelation || ''}</strong></div>
                    
                    <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-gray-600">মোবাইল</span> <strong>{mData.guardianPhone || ''}</strong></div>
                    <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-gray-600">এনআইডি</span> <strong>{mData.guardianNid || ''}</strong></div>
                    
                    <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-gray-600">অভিভাবক ২</span> <strong>{mData.guardian2 || ''}</strong></div>
                    <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-gray-600">মোবাইল</span> <strong>{mData.guardian2Phone || ''}</strong></div>

                    <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-gray-600">অভিভাবক ৩</span> <strong>{mData.guardian3 || ''}</strong></div>
                    <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-gray-600">মোবাইল</span> <strong>{mData.guardian3Phone || ''}</strong></div>
                </div>
            </div>

            {/* Address Info */}
            <div className="border border-[#107044] rounded overflow-hidden mb-4">
                <div className="bg-[#107044] text-white px-3 py-1 font-bold">গ্রাম / ডাকঘর / জেলা</div>
                <div className="p-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-gray-600">গ্রাম</span> <strong>{mData.village || ''}</strong></div>
                    <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-gray-600">ডাকঘর</span> <strong>{mData.postOffice || ''}</strong></div>
                    
                    <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-gray-600">থানা</span> <strong>{mData.thana || ''}</strong></div>
                    <div className="border-b border-gray-300 border-dotted pb-1 flex justify-between"><span className="text-gray-600">জেলা</span> <strong>{mData.district || ''}</strong></div>
                </div>
            </div>

            {/* Declarations */}
            <div className="grid grid-cols-2 gap-4 mb-16">
                <div className="border border-green-200 rounded p-3 bg-green-50/30">
                    <h3 className="font-bold text-[#107044] mb-2 border-b border-green-200 pb-1">অভিভাবকের প্রতি</h3>
                    <p className="text-xs text-justify leading-relaxed">
                        আপনার সন্তানের লেখা-পড়া ও চারিত্রিক উন্নতির লক্ষ্যে মাঝে মাঝে ওস্তাদদের সাথে যোগাযোগ করুন।
                        লেখা-পড়ার স্বার্থে প্রাতিষ্ঠানিক ছুটি ব্যতীত অন্য ছুটি না নেওয়াই শ্রেয়। প্রতি মাসে নির্ধারিত ফি 
                        যথাসময়ে পরিশোধ করুন।
                    </p>
                </div>
                <div className="border border-blue-200 rounded p-3 bg-blue-50/30">
                    <h3 className="font-bold text-[#045c84] mb-2 border-b border-blue-200 pb-1">শিক্ষার্থীর অঙ্গীকারনামা</h3>
                    <ul className="text-xs list-disc pl-4 space-y-1">
                        <li>আমি শরীয়তের আলোকে সবকিছু মেনে চলব।</li>
                        <li>ওস্তাদদের সম্মান করব এবং আনুগত্য করব।</li>
                        <li>কর্তৃপক্ষের অনুমতি ছাড়া মাদ্রাসার বাইরে যাব না।</li>
                        <li>লেখা-পড়া ছাড়া অন্য কোনো ব্যস্ততা রাখব না।</li>
                        <li>ওস্তাদদের কখনো অসম্মান বা বেয়াদবি করব না।</li>
                        <li>মাদ্রাসা কর্তৃক নির্ধারিত সকল নিয়ম-কানুন মেনে চলব।</li>
                    </ul>
                </div>
            </div>

            {/* Signatures */}
            <div className="flex justify-between items-end px-4 mt-8 pb-4">
                <div className="text-center w-32 border-t border-gray-400 pt-1 font-bold text-sm">শিক্ষার্থীর স্বাক্ষর</div>
                <div className="text-center w-32 border-t border-gray-400 pt-1 font-bold text-sm">অভিভাবকের স্বাক্ষর</div>
                <div className="text-center w-32 border-t border-gray-400 pt-1 font-bold text-sm">মুহতামিমের স্বাক্ষর</div>
            </div>
            
            {/* Barcode/QR if they exist, placed at bottom discretely or as requested */}
            <div className="flex justify-between items-center mt-2 border-t border-gray-200 pt-2 opacity-60">
                <div>
                    {(mData.barcode || mData.studentId) && (
                         <BarcodeSVG value={mData.barcode || mData.studentId} width={120} height={30} />
                    )}
                </div>
                <div>
                     {(mData.qr || mData.studentId) && (
                         <QRCodeSVG value={mData.qr || mData.studentId} size={40} />
                     )}
                </div>
            </div>
        </div>
    );
}

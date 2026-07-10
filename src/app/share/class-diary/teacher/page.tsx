"use client";

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function TeacherShareContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const tId = searchParams.get('tId');

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md w-full border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-2">শিক্ষক ডায়েরি পোর্টাল</h2>
        <p className="text-slate-600 mb-4">এই পোর্টালে শিক্ষকরা তাদের বিষয় অনুযায়ী ডায়েরি আপডেট করতে পারবেন।</p>
        <div className="bg-indigo-50 text-indigo-700 p-3 rounded-lg text-sm mb-4">
          <strong>ডায়েরি আইডি:</strong> {id}
          <br/>
          <strong>শিক্ষক আইডি:</strong> {tId}
        </div>
        <p className="text-xs text-slate-500">
          (এখানে ডায়েরি আপডেট করার ফর্ম প্রদর্শিত হবে)
        </p>
      </div>
    </div>
  );
}

export default function TeacherSharePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
      </div>
    }>
      <TeacherShareContent />
    </Suspense>
  );
}

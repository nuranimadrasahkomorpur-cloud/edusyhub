import { NextRequest, NextResponse } from 'next/server';
import { generateGeminiContent } from '@/utils/gemini';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            sourceContent = '',
            planItems = [],         // [{ type: 'task'|'activity', text: string }]
            subject = '',
            chapter = '',
            objective = '',
            title = '',
            existingMaterials = [] // already listed — don't re-suggest
        } = body;

        const taskTexts = planItems.filter((i: any) => i.type === 'task').map((i: any) => i.text).join(', ');
        const actTexts  = planItems.filter((i: any) => i.type === 'activity').map((i: any) => i.text).join(', ');

        const prompt = `
তুমি একজন অভিজ্ঞ শিক্ষক-সহায়ক AI। নিচের পাঠপরিকল্পনা ও উৎস-বিষয়বস্তু বিশ্লেষণ করে শুধুমাত্র প্রয়োজনীয় উপকরণের তালিকা দাও।

## পাঠ্যক্রম তথ্য
- বিষয়: ${subject}
- অধ্যায়: ${chapter}
- পাঠের শিরোনাম: ${title}
- উদ্দেশ্য: ${objective}

## আজকের কার্যক্রম
- কাজ (Task): ${taskTexts || 'নেই'}
- কার্যক্রম (Activity): ${actTexts || 'নেই'}

## উৎস-বিষয়বস্তু (Source Content)
${sourceContent ? sourceContent.slice(0, 1500) : 'কোনো উৎস নেই'}

## ইতিমধ্যে তালিকায় আছে (পুনরায় দেওয়া নিষেধ)
${existingMaterials.length > 0 ? existingMaterials.join(', ') : 'কিছু নেই'}

## নির্দেশনা
- উপরের তথ্য বিশ্লেষণ করে প্রয়োজনীয় ও প্রাসঙ্গিক উপকরণ সাজেস্ট করো।
- প্রতিটি উপকরণ আলাদা লাইনে লেখো।
- কোনো শিরোনাম, ব্যাখ্যা, নম্বর বা বুলেট দিও না — শুধু উপকরণের নাম।
- ইতিমধ্যে তালিকায় আছে এমন কিছু দেওয়া যাবে না।
- সর্বোচ্চ ৮টি উপকরণ দাও।
- বাংলায় উত্তর দাও।
`;

        const result = await generateGeminiContent(prompt, undefined, {
            temperature: 0.4,
            maxOutputTokens: 256
        });

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        // Parse the plain-text list — one item per line
        const suggested = result.text
            .split('\n')
            .map((l: string) => l.replace(/^[\-\*\d\.\s]+/, '').trim())
            .filter(Boolean);

        return NextResponse.json({ materials: suggested });
    } catch (err: any) {
        console.error('suggest-materials error:', err);
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
    }
}

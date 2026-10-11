import { NextResponse } from 'next/server';
import { generateGeminiContent } from '@/utils/gemini';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { content, subject } = body;

        if (!content) {
            return NextResponse.json({ success: false, error: 'Content is required' }, { status: 400 });
        }

        const systemInstruction = `You are an expert educational content designer. 
Analyze the provided educational text (subject: ${subject || 'General'}) and format it into the best structure for reading.
You must output ONLY valid JSON in the following format, without any markdown formatting or code blocks:
{
    "type": "poem" | "word_meaning" | "story",
    "items": [
        // If type is "poem" or "story", this should be an array of strings (lines/paragraphs).
        // If type is "word_meaning", this should be an array of objects: { "word": "...", "meaning": "..." }
    ],
    "designNotes": "Brief explanation of why this format was chosen"
}

Rules:
1. If it looks like a poem or rhyme, preserve the stanza line breaks. Return type "poem".
2. If it is a list of vocabulary/meanings, separate the words and meanings. Return type "word_meaning".
3. Otherwise, return type "story" and break it into clean paragraphs.
4. Output raw JSON only. Do not wrap in \`\`\`json.`;

        const response = await generateGeminiContent(
            `Content to format:\n\n${content}`,
            systemInstruction,
            { temperature: 0.2 }
        );

        if (!response.success) {
            return NextResponse.json({ success: false, error: response.error }, { status: 500 });
        }

        let jsonStr = response.text.trim();
        // Clean up markdown if the model accidentally included it
        if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
        if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
        if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);

        const parsedData = JSON.parse(jsonStr.trim());

        return NextResponse.json({ success: true, data: parsedData });
    } catch (error: any) {
        console.error('Error formatting content with AI:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

import prisma from '@/utils/db';

export interface GeminiConfig {
    apiKey: string;
    apiUrl: string;
    model: string;
    isActive: boolean;
}

/**
 * Fetch current Gemini AI settings from database (SiteSettings), with environment variable fallback.
 */
export async function getGeminiConfig(): Promise<GeminiConfig> {
    try {
        let settings: any = null;
        try {
            const rawDocs = await (prisma as any).siteSettings.findRaw({});
            if (Array.isArray(rawDocs) && rawDocs.length > 0) {
                settings = rawDocs[0];
            }
        } catch {
            settings = await (prisma as any).siteSettings.findFirst();
        }

        return {
            apiKey: settings?.geminiApiKey || process.env.GEMINI_API_KEY || 'AIzaSyDa2aX6RPyg0Fp_2OijWfQpifQAiVhV3t4',
            apiUrl: settings?.geminiApiUrl || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
            model: settings?.geminiModel || 'gemini-2.5-flash',
            isActive: settings?.isGeminiActive ?? true
        };
    } catch (error) {
        console.error('Failed to get Gemini config from DB, using fallback:', error);
        return {
            apiKey: process.env.GEMINI_API_KEY || 'AIzaSyDa2aX6RPyg0Fp_2OijWfQpifQAiVhV3t4',
            apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
            model: 'gemini-2.5-flash',
            isActive: true
        };
    }
}

/**
 * Generate AI content using the Gemini API configured in system settings.
 */
export async function generateGeminiContent(
    prompt: string,
    systemInstruction?: string,
    options?: { temperature?: number; maxOutputTokens?: number }
): Promise<{ text: string; model: string; success: boolean; error?: string }> {
    const config = await getGeminiConfig();

    if (!config.isActive) {
        return {
            text: '',
            model: config.model,
            success: false,
            error: 'Gemini AI সেবাটি সুপার অ্যাডমিন দ্বারা নিষ্ক্রিয় রাখা হয়েছে।'
        };
    }

    if (!config.apiKey) {
        return {
            text: '',
            model: config.model,
            success: false,
            error: 'Gemini API Key কনফিগার করা হয়নি।'
        };
    }

    try {
        let endpoint = config.apiUrl;
        if (!endpoint || !endpoint.includes('generateContent')) {
            endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent`;
        }

        const separator = endpoint.includes('?') ? '&' : '?';
        const targetUrl = endpoint.includes('key=') ? endpoint : `${endpoint}${separator}key=${config.apiKey.trim()}`;

        const payload: any = {
            contents: [
                {
                    parts: [{ text: prompt }]
                }
            ],
            generationConfig: {
                temperature: options?.temperature ?? 0.7,
                maxOutputTokens: options?.maxOutputTokens ?? 1024
            }
        };

        if (systemInstruction) {
            payload.systemInstruction = {
                parts: [{ text: systemInstruction }]
            };
        }

        const res = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (!res.ok) {
            const err = data?.error?.message || `Google API error (Status: ${res.status})`;
            return {
                text: '',
                model: config.model,
                success: false,
                error: err
            };
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return {
            text: text.trim(),
            model: config.model,
            success: true
        };
    } catch (err: any) {
        console.error('Gemini call failed:', err);
        return {
            text: '',
            model: config.model,
            success: false,
            error: err.message || 'Gemini API কল করতে ত্রুটি হয়েছে।'
        };
    }
}

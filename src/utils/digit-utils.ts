/**
 * Utility to normalize Bengali digits to English digits for numeric processing.
 */
export function normalizeBengaliDigits(input: string | number): number {
    if (input === undefined || input === null) return 0;
    if (typeof input === 'number') return input;

    const bengaliToEnglish: { [key: string]: string } = {
        '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
        '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
    };

    const normalized = input.toString().replace(/[০-৯]/g, (digit) => bengaliToEnglish[digit]);
    return parseFloat(normalized) || 0;
}

/**
 * Utility to check if a string contains Bengali digits.
 */
export function hasBengaliDigits(input: string): boolean {
    return /[০-৯]/.test(input);
}

/**
 * Standardizes an authentication identifier (email, phone, or studentId).
 * Trims, converts Bengali numerals, and strips phone prefixes (+88, 88).
 */
export function normalizeAuthIdentifier(input: string): string {
    if (!input) return '';
    const bengaliToEnglish: { [key: string]: string } = {
        '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
        '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
    };
    
    // Trim and convert Bengali numerals
    let normalized = String(input).trim().replace(/[০-৯]/g, (digit) => bengaliToEnglish[digit]);
    
    // Phone specific normalization (if it doesn't look like an email)
    if (!normalized.includes('@')) {
        if (normalized.startsWith('+88')) normalized = normalized.slice(3);
        else if (normalized.startsWith('88')) normalized = normalized.slice(2);
    }
    
    return normalized;
}

/**
 * Standardizes a password by trimming and converting Bengali numerals to English.
 */
export function normalizePassword(input: string): string {
    if (!input) return '';
    const bengaliToEnglish: { [key: string]: string } = {
        '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
        '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
    };
    
    return String(input).trim().replace(/[০-৯]/g, (digit) => bengaliToEnglish[digit]);
}

/**
 * Normalizes any ObjectId representation or wrapped string ID (e.g. from Json field) to a plain string.
 */
export function getCleanId(id: any): string {
    if (!id) return '';
    if (typeof id === 'string') return id;
    if (typeof id === 'object') {
        if (id.$oid) return id.$oid;
        if (id.toString) {
            const str = id.toString();
            if (str !== '[object Object]') return str;
        }
    }
    return String(id);
}

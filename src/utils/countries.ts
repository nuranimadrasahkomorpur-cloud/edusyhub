export interface CountryData {
    code: string;
    name: string;
    dialCode: string;
    length: number;
    flag: string;
}

export const COUNTRIES: CountryData[] = [
    { code: 'BD', name: 'Bangladesh', dialCode: '+880', length: 11, flag: '🇧🇩' },
    { code: 'US', name: 'United States', dialCode: '+1', length: 10, flag: '🇺🇸' },
    { code: 'IN', name: 'India', dialCode: '+91', length: 10, flag: '🇮🇳' },
    { code: 'PK', name: 'Pakistan', dialCode: '+92', length: 10, flag: '🇵🇰' },
    { code: 'LK', name: 'Sri Lanka', dialCode: '+94', length: 9, flag: '🇱🇰' },
    { code: 'NP', name: 'Nepal', dialCode: '+977', length: 10, flag: '🇳🇵' },
    { code: 'SA', name: 'Saudi Arabia', dialCode: '+966', length: 9, flag: '🇸🇦' },
    { code: 'AE', name: 'United Arab Emirates', dialCode: '+971', length: 9, flag: '🇦🇪' },
    { code: 'QA', name: 'Qatar', dialCode: '+974', length: 8, flag: '🇶🇦' },
    { code: 'OM', name: 'Oman', dialCode: '+968', length: 8, flag: '🇴🇲' },
    { code: 'KW', name: 'Kuwait', dialCode: '+965', length: 8, flag: '🇰🇼' },
    { code: 'BH', name: 'Bahrain', dialCode: '+973', length: 8, flag: '🇧🇭' },
    { code: 'MY', name: 'Malaysia', dialCode: '+60', length: 9, flag: '🇲🇾' },
    { code: 'SG', name: 'Singapore', dialCode: '+65', length: 8, flag: '🇸🇬' },
    { code: 'GB', name: 'United Kingdom', dialCode: '+44', length: 10, flag: '🇬🇧' },
    { code: 'AU', name: 'Australia', dialCode: '+61', length: 9, flag: '🇦🇺' },
    { code: 'CA', name: 'Canada', dialCode: '+1', length: 10, flag: '🇨🇦' },
    { code: 'IT', name: 'Italy', dialCode: '+39', length: 10, flag: '🇮🇹' },
    { code: 'FR', name: 'France', dialCode: '+33', length: 9, flag: '🇫🇷' },
    { code: 'DE', name: 'Germany', dialCode: '+49', length: 10, flag: '🇩🇪' },
    { code: 'OTHER', name: 'Other Country', dialCode: '+', length: 15, flag: '🌐' }
];

export const getCountryByDialCode = (dialCode: string): CountryData => {
    return COUNTRIES.find(c => c.dialCode === dialCode) || COUNTRIES[0];
};

export const parsePhoneNumber = (fullNumber: string | undefined): { dialCode: string, localNumber: string } => {
    if (!fullNumber) return { dialCode: '+880', localNumber: '' };
    
    // Find the longest matching dial code
    let matchedCountry = COUNTRIES[0]; // Default BD
    let longestMatch = 0;

    for (const country of COUNTRIES) {
        if (country.code === 'OTHER') continue;
        if (fullNumber.startsWith(country.dialCode) && country.dialCode.length > longestMatch) {
            matchedCountry = country;
            longestMatch = country.dialCode.length;
        }
    }

    if (longestMatch > 0) {
        return {
            dialCode: matchedCountry.dialCode,
            localNumber: fullNumber.slice(longestMatch)
        };
    }

    // If no match but starts with +, assume OTHER
    if (fullNumber.startsWith('+')) {
        return { dialCode: '+', localNumber: fullNumber.slice(1) };
    }

    // Fallback: assume local BD number
    return { dialCode: '+880', localNumber: fullNumber };
};

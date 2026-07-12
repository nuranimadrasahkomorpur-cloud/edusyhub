export const banglaDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

export const toBanglaNumber = (num: number | string): string => {
    return num
        .toString()
        .split("")
        .map((d) => (isNaN(parseInt(d)) ? d : banglaDigits[parseInt(d)]))
        .join("");
};

export const getRelativeTimeBangla = (date: Date | string | number): string => {
    const now = new Date();
    const past = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (diffInSeconds < 60) {
        return "এইমাত্র";
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return `${toBanglaNumber(diffInMinutes)} মিনিট আগে`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return `${toBanglaNumber(diffInHours)} ঘণ্টা আগে`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) {
        return `${toBanglaNumber(diffInDays)} দিন আগে`;
    }

    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
        return `${toBanglaNumber(diffInMonths)} মাস আগে`;
    }

    const diffInYears = Math.floor(diffInMonths / 12);
    return `${toBanglaNumber(diffInYears)} বছর আগে`;
};

export const processHtmlForNumbering = (html: string, useBullet: boolean = false): string => {
  if (!html || /<(table)[> ]/i.test(html)) return html;
  
  // Clean leading empty tags or spaces (e.g., <p><br></p>, <p>&nbsp;</p>, <br>)
  let cleanedHtml = html.replace(/^(?:\s*<(?:p|div)[^>]*>(?:\s|<br\s*\/?>|&nbsp;)*<\/(?:p|div)>\s*)+/i, '');
  cleanedHtml = cleanedHtml.replace(/^(?:\s*<br\s*\/?>\s*)+/i, '');
  
  // Clean trailing empty tags
  cleanedHtml = cleanedHtml.replace(/(?:\s*<(?:p|div)[^>]*>(?:\s|<br\s*\/?>|&nbsp;)*<\/(?:p|div)>\s*)+$/i, '');
  cleanedHtml = cleanedHtml.replace(/(?:\s*<br\s*\/?>\s*)+$/i, '');
  
  // If useBullet is false, we do NOT want any auto-numbering at all.
  // The user explicitly requested to remove auto serial numbering.
  if (!useBullet) {
      return cleanedHtml;
  }

  // If useBullet is true, we apply bullet points to blocks.
  // Split HTML into blocks based on block tags or <br>
  const parts = cleanedHtml.split(/(<br\s*\/?>|<\/?p[^>]*>|<\/?div[^>]*>|<\/?ul[^>]*>|<\/?ol[^>]*>|<\/?li[^>]*>)/gi);
  
  let processed = "";
  let insideList = false;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    
    // Check if it's a delimiter
    if (/^<(ul|ol)[> ]/i.test(part)) insideList = true;
    if (/^<\/(ul|ol)>/i.test(part)) insideList = false;
    
    if (/^(<br\s*\/?>|<\/?p[^>]*>|<\/?div[^>]*>|<\/?ul[^>]*>|<\/?ol[^>]*>|<\/?li[^>]*>)$/i.test(part)) {
      processed += part;
      continue;
    }

    // It's a text/content segment
    const textContent = part.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim();
    
    if (!textContent || insideList) {
      processed += part;
      continue;
    }

    const alreadyHasBullet = /^[•\-*]\s/.test(textContent);
    
    if (alreadyHasBullet) {
      processed += part;
    } else {
      processed += `<span class="font-bold select-none mr-2 text-gray-800">•</span>${part}`;
    }
  }

  return processed;
};

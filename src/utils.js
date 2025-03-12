export function numberToWords(num) {
    const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
    const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    const thousands = ['', 'thousand', 'million', 'billion', 'trillion'];

    if (num === 0) return 'zero';

    function convertChunk(n) {
        let word = '';
        if (n >= 100) {
            word += ones[Math.floor(n / 100)] + ' hundred ';
            n %= 100;
        }
        if (n >= 20) {
            word += tens[Math.floor(n / 10)];
            if (n % 10 > 0) word += '-' + ones[n % 10];
            word += ' ';
        } else if (n >= 10) {
            word += teens[n - 10] + ' ';
        } else if (n > 0) {
            word += ones[n] + ' ';
        }
        return word.trim();
    }

    let words = '';
    let chunkCount = 0;
    let wholeNum = Math.floor(num);

    if (wholeNum === 0) {
        words = 'zero';
    } else {
        while (wholeNum > 0) {
            const chunk = wholeNum % 1000;
            if (chunk > 0) {
                words = convertChunk(chunk) + ' ' + thousands[chunkCount] + ' ' + words;
            }
            wholeNum = Math.floor(wholeNum / 1000);
            chunkCount++;
        }
    }

    const decimal = Math.round((num % 1) * 100);
    if (decimal > 0) {
        words += 'and ' + convertChunk(decimal) + ' cents';
    }

    return words.trim();
}

export const isMobile = () => window.innerWidth <= 640;

export const getSvgHeight = () => (isMobile() ? 250 : 400);

export function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

export function setCookie(name, value, days) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

export function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}
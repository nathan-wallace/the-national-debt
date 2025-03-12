import * as d3 from 'd3'; // Add this import
import { numberToWords, isMobile } from './utils.js';
import { getTimeFrame } from './debtData.js';

export function updateDebtInWords(data) {
    const latestDebt = data[data.length - 1].debt;
    const debtInWordsText = d3.select('#debtInWordsText');
    
    // Base font size for consistency with mobile/desktop
    const baseFontSize = isMobile() ? 0.9 : 1.1; // in rem

    const wholeDollars = Math.floor(latestDebt);
    const cents = Math.round((latestDebt % 1) * 100);
    const debtWords = numberToWords(wholeDollars) + ' dollars';
    const fullDebtWords = cents > 0 
        ? `${debtWords} and ${numberToWords(cents)} cents`
        : debtWords;
    
    const formattedDebtWords = fullDebtWords
        .replace('trillion ', 'trillion, ')
        .replace('billion ', 'billion, ')
        .replace('million ', 'million, ')
        .replace('thousand ', 'thousand, ')
        .trim();

    // Split the formatted text into individual words
    const words = formattedDebtWords.split(' ');

    // Clear existing content
    debtInWordsText.html('');

    // Add the introductory text
    debtInWordsText.append('span')
        .style('font-size', `${baseFontSize}rem`);

    // Calculate font size decrease: start large (e.g., 2x base) and taper to 0.5x base
    const startFontSize = baseFontSize * 2; // Starting size (e.g., 2.2rem desktop, 1.8rem mobile)
    const endFontSize = baseFontSize * 0.5; // Ending size (e.g., 0.55rem desktop, 0.45rem mobile)
    const step = (startFontSize - endFontSize) / (words.length - 1); // Linear decrease per word

    // Append each word with a decreasing font size
    words.forEach((word, index) => {
        const fontSize = startFontSize - (index * step);
        debtInWordsText.append('span')
            .text(word + (index < words.length - 1 ? ' ' : '.')) // Add space except for last word
            .style('font-size', `${fontSize}rem`)
            .style('font-weight', index === 0 ? 'bold' : 'normal'); // Bold the first word for emphasis
    });
}

export function updateAnalysis(data) {
    const { startDate, endDate } = getTimeFrame(data);
    const filteredData = data.filter(d => d.date >= startDate && d.date <= endDate);

    const yearlyData = {};
    filteredData.forEach(d => {
        const yr = d.date.getFullYear();
        yearlyData[yr] = d.debt;
    });
    const years = Object.keys(yearlyData).map(Number).sort((a, b) => a - b);
    const startYear = years[0];
    const endYear = years[years.length - 1];
    const startDebt = yearlyData[startYear];
    const endDebt = yearlyData[endYear];

    const totalGrowth = ((endDebt - startDebt) / startDebt) * 100;
    const cagr = (Math.pow(endDebt / startDebt, 1 / (endYear - startYear)) - 1) * 100;

    const annualGrowth = [];
    for (let i = 1; i < years.length; i++) {
        const growth = ((yearlyData[years[i]] - yearlyData[years[i - 1]]) / yearlyData[years[i - 1]]) * 100;
        annualGrowth.push({ year: years[i], growth });
    }
    const highestGrowth = annualGrowth.reduce((prev, curr) => (curr.growth > prev.growth ? curr : prev), annualGrowth[0]);
    const lowestGrowth = annualGrowth.reduce((prev, curr) => (curr.growth < prev.growth ? curr : prev), annualGrowth[0]);

    const avgAnnualIncrease = (endDebt - startDebt) / (endYear - startYear);
    let doublingYear = null;
    const doubleStartDebt = startDebt * 2;
    for (let i = 0; i < years.length; i++) {
        if (yearlyData[years[i]] >= doubleStartDebt) {
            doublingYear = years[i];
            break;
        }
    }
    const doublingTime = doublingYear ? doublingYear - startYear : null;

    const meanGrowth = annualGrowth.reduce((sum, d) => sum + d.growth, 0) / annualGrowth.length;
    const variance = annualGrowth.reduce((sum, d) => sum + Math.pow(d.growth - meanGrowth, 2), 0) / annualGrowth.length;
    const growthVolatility = Math.sqrt(variance);

    const analysisText = d3.select('#analysisText');
    analysisText.style('font-size', isMobile() ? '0.9rem' : '1.1rem');

    let analysisString = `From ${startYear} to ${endYear}, the U.S. national debt increased from $${startDebt.toLocaleString('en-US', { minimumFractionDigits: 2 })} to $${endDebt.toLocaleString('en-US', { minimumFractionDigits: 2 })}, a total growth of ${totalGrowth.toFixed(2)}%. The compound annual growth rate (CAGR) was ${cagr.toFixed(2)}%. The highest annual growth occurred in ${highestGrowth.year} at ${highestGrowth.growth.toFixed(2)}%, and the lowest was in ${lowestGrowth.year} at ${lowestGrowth.growth.toFixed(2)}%. `;

    analysisString += `On average, the debt increased by $${avgAnnualIncrease.toLocaleString('en-US', { minimumFractionDigits: 0 })} per year. `;

    if (doublingTime) {
        analysisString += `The debt doubled from its ${startYear} value in ${doublingTime} years, reaching $${(startDebt * 2).toLocaleString('en-US', { minimumFractionDigits: 2 })} by ${doublingYear}. `;
    }

    analysisString += `The annual growth rate volatility was ${growthVolatility.toFixed(2)}%, indicating ${growthVolatility > 10 ? 'high' : 'moderate'} variability in debt increases. `;

    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const today = new Date().toLocaleDateString('en-US', options);
    analysisString += `Data accessed on ${today}. Source: <a href="https://fiscaldata.treasury.gov" target="_blank" rel="noopener noreferrer">U.S. Treasury Fiscal Data.</a>`;

    analysisText.html(analysisString);
}
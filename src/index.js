import './styles.css';
import * as d3 from 'd3';

// Number to words conversion function with hyphens
function numberToWords(num) {
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
            if (n % 10 > 0) word += '-' + ones[n % 10]; // Add hyphen for numbers like "twenty-one"
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

// Utility to detect mobile devices
const isMobile = () => window.innerWidth <= 640;

// Dynamic SVG height
const getSvgHeight = () => (isMobile() ? 250 : 400);

// Determine time frame for data (last 40 years or full range)
function getTimeFrame(data) {
    const minDate = d3.min(data, d => d.date);
    const maxDate = d3.max(data, d => d.date);
    const minYear = minDate.getFullYear();
    const maxYear = maxDate.getFullYear();

    if (maxYear - minYear >= 40) {
        return {
            startDate: new Date(maxYear - 40, 0, 1),
            endDate: new Date(maxYear, 11, 31),
        };
    }
    return { startDate: minDate, endDate: maxDate };
}

// Fetch debt data from Treasury API
async function fetchDebtData() {
    const apiURL = 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny?fields=record_date,tot_pub_debt_out_amt&sort=-record_date&page[size]=10000';
    try {
        const res = await fetch(apiURL, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
        const json = await res.json();

        const monthlyData = {};
        json.data.forEach(d => {
            const date = new Date(d.record_date);
            const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyData[yearMonth] = {
                date,
                debt: parseFloat(d.tot_pub_debt_out_amt),
            };
        });

        return Object.values(monthlyData).sort((a, b) => a.date - b.date);
    } catch (error) {
        console.error('Error fetching debt data:', error);
        return [];
    }
}

// Draw the line chart and animate the ticker with theme support
function drawLineChartAndTicker(data) {
    const svg = d3.select('#debtChart');
    const height = getSvgHeight();
    svg.attr('height', height);

    const margin = isMobile()
        ? { top: 40, right: 20, bottom: 80, left: 50 }
        : { top: 60, right: 60, bottom: 100, left: 80 };
    const width = parseInt(svg.style('width')) - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    svg.selectAll('*').remove();
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const { startDate, endDate } = getTimeFrame(data);
    const filteredData = data.filter(d => d.date >= startDate && d.date <= endDate);

    const x = d3.scaleTime().domain([startDate, endDate]).range([0, width]);
    const y = d3.scaleLinear()
        .domain([d3.min(filteredData, d => d.debt) * 0.95, d3.max(filteredData, d => d.debt) * 1.05])
        .range([chartHeight, 0]);

    svg.style('opacity', 0).transition().duration(1000).style('opacity', 1);

    svg.append('text')
        .attr('x', margin.left + width / 2)
        .attr('y', margin.top / 2)
        .attr('text-anchor', 'middle')
        .attr('font-family', 'Press Start 2P')
        .attr('font-size', isMobile() ? '1rem' : '1.2rem')
        .attr('class', 'fill-black dark:fill-green-500')
        .text('U.S. National Debt Over Time');

    g.append('g')
        .attr('transform', `translate(0,${chartHeight})`)
        .attr('class', 'axis')
        .call(d3.axisBottom(x).ticks(isMobile() ? d3.timeYear.every(5) : d3.timeYear.every(1)).tickFormat(d3.timeFormat('%Y')))
        .selectAll('text')
        .attr('transform', 'rotate(45)')
        .style('text-anchor', 'start');

    svg.append('text')
        .attr('x', margin.left + width / 2)
        .attr('y', height - 20)
        .attr('text-anchor', 'middle')
        .attr('font-family', 'Courier New')
        .attr('font-size', '14px')
        .attr('class', 'fill-gray-700 dark:fill-gray-200')
        .text('Year');

    g.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(y).ticks(isMobile() ? 4 : 6).tickFormat(d => `$${d3.format('.2s')(d)}`));

    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -(chartHeight / 2) - margin.top)
        .attr('y', margin.left / 3)
        .attr('text-anchor', 'middle')
        .attr('font-family', 'Courier New')
        .attr('font-size', '14px')
        .attr('class', 'fill-gray-700 dark:fill-gray-200')
        .text('Debt (Trillions USD)');

    const line = d3.line()
        .x(d => x(d.date))
        .y(d => y(d.debt))
        .curve(d3.curveMonotoneX);

    const path = g.append('path')
        .datum(filteredData)
        .attr('fill', 'none')
        .attr('class', 'stroke-black dark:stroke-green-500')
        .attr('stroke-width', isMobile() ? 2 : 3)
        .attr('d', line);

    const movingCircle = g.append('circle')
        .attr('r', isMobile() ? 6 : 8)
        .attr('fill', 'red')
        .attr('class', 'glow');

    const animationDuration = isMobile() ? 4000 : 8000;
    const totalLength = path.node().getTotalLength();
    const tickerInterpolator = d3.interpolateNumber(filteredData[0].debt, filteredData[filteredData.length - 1].debt);

    path
        .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
        .attr('stroke-dashoffset', totalLength)
        .transition()
        .duration(animationDuration)
        .ease(d3.easeQuadOut)
        .attrTween('stroke-dashoffset', function () {
            const interpolateOffset = d3.interpolateNumber(totalLength, 0);
            return t => {
                const offset = interpolateOffset(t);
                const point = path.node().getPointAtLength(totalLength - offset);
                movingCircle.attr('cx', point.x).attr('cy', point.y);
                const debtValue = tickerInterpolator(t);
                d3.select('#debtTicker').text(`$${debtValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
                return offset;
            };
        });
}

// Update debt in words section with Option 1 copy, proper hyphens, and commas
function updateDebtInWords(data) {
    const latestDebt = data[data.length - 1].debt;
    const debtInWordsText = d3.select('#debtInWordsText');
    debtInWordsText.style('font-size', isMobile() ? '0.9rem' : '1.1rem');
    
    const wholeDollars = Math.floor(latestDebt);
    const cents = Math.round((latestDebt % 1) * 100);
    const debtWords = numberToWords(wholeDollars) + ' dollars';
    const fullDebtWords = cents > 0 
        ? `${debtWords} and ${numberToWords(cents)} cents`
        : debtWords;
    
    // Add commas between major number groups (trillion, billion, etc.)
    const formattedDebtWords = fullDebtWords
        .replace('trillion ', 'trillion, ')
        .replace('billion ', 'billion, ')
        .replace('million ', 'million, ')
        .replace('thousand ', 'thousand, ')
        .trim();

    debtInWordsText.text(
        `The U.S. national debt stands at $${latestDebt.toLocaleString('en-US', { minimumFractionDigits: 2 })}—` +
        `that’s ${formattedDebtWords}.`
    );
}

// Update analysis text (without debt in words)
function updateAnalysis(data) {
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

// Show preloader with green-500 for terminal effect
function showPreloader(debtData) {
    const preloader = d3.select('#preloader');
    const container = d3.select('.container');
    container.style('opacity', '0');
    preloader.style('display', 'block');

    const svg = preloader.append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('xmlns', 'http://www.w3.org/2000/svg')
        .style('position', 'absolute');

    const width = window.innerWidth;
    const height = window.innerHeight;

    const screen = svg.append('rect')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('fill', '#000000');

    svg.append('defs')
        .append('radialGradient')
        .attr('id', 'crt-boot-glow')
        .attr('cx', '50%')
        .attr('cy', '50%')
        .attr('r', '60%')
        .selectAll('stop')
        .data([
            { offset: '0%', color: '#22c55e', opacity: 0.3 },
            { offset: '100%', color: '#0a0a0a', opacity: 1 }
        ])
        .enter().append('stop')
        .attr('offset', d => d.offset)
        .attr('stop-color', d => d.color)
        .attr('stop-opacity', d => d.opacity);

    const glow = svg.append('rect')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('fill', 'url(#crt-boot-glow)')
        .style('opacity', 0);

    const scanlines = svg.append('g');
    const scanlineCount = Math.floor(height / 4);
    for (let i = 0; i < scanlineCount; i++) {
        scanlines.append('line')
            .attr('x1', 0)
            .attr('y1', i * 4)
            .attr('x2', width)
            .attr('y2', i * 4)
            .attr('stroke', '#22c55e')
            .attr('stroke-width', 0.6)
            .style('opacity', 0);
    }

    const surgeLine = svg.append('line')
        .attr('x1', width / 2)
        .attr('x2', width / 2)
        .attr('y1', 0)
        .attr('y2', 0)
        .attr('stroke', '#22c55e')
        .attr('stroke-width', 4)
        .style('filter', 'drop-shadow(0 0 10px #22c55e)')
        .style('opacity', 0);

    const bootText = svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('font-family', 'Press Start 2P')
        .attr('font-size', isMobile() ? '2rem' : '3rem')
        .attr('fill', '#22c55e')
        .style('text-shadow', '0 0 15px #22c55e')
        .text('CALCULATING DEBT')
        .style('opacity', 0);

    svg.append('defs')
        .append('filter')
        .attr('id', 'crt-noise')
        .append('feTurbulence')
        .attr('type', 'fractalNoise')
        .attr('baseFrequency', '0.8')
        .attr('numOctaves', '1')
        .attr('stitchTiles', 'stitch');

    const noise = svg.append('rect')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('fill', 'none')
        .style('filter', 'url(#crt-noise)')
        .style('opacity', 0);

    preloader.transition()
        .duration(200)
        .style('opacity', 1)
        .on('end', () => {
            screen.transition()
                .duration(100)
                .attr('fill', '#1a1a1a')
                .transition()
                .duration(50)
                .attr('fill', '#000000')
                .transition()
                .duration(100)
                .attr('fill', '#1a1a1a')
                .on('end', () => {
                    surgeLine
                        .style('opacity', 0)
                        .transition()
                        .duration(200)
                        .style('opacity', 1)
                        .on('end', () => {
                            surgeLine
                                .attr('stroke-width', 2)
                                .style('filter', 'drop-shadow(0 0 15px #22c55e)')
                                .transition()
                                .duration(100)
                                .attr('stroke-width', 20)
                                .style('opacity', 0.9)
                                .transition()
                                .duration(100)
                                .attr('stroke-width', 10)
                                .style('filter', 'drop-shadow(0 0 10px #22c55e)')
                                .on('end', () => {
                                    const ripple = svg.append('rect')
                                        .attr('x', 0)
                                        .attr('y', 0)
                                        .attr('width', '100%')
                                        .attr('height', '100%')
                                        .attr('fill', '#22c55e')
                                        .style('opacity', 0);

                                    surgeLine
                                        .transition()
                                        .duration(500)
                                        .ease(d3.easeQuadInOut)
                                        .attr('y2', height)
                                        .attrTween('stroke-width', () => t => 5 + Math.sin(t * Math.PI * 4) * 5)
                                        .style('opacity', 0.7)
                                        .attrTween('filter', () => t => {
                                            const glowSize = 10 + Math.sin(t * Math.PI) * 10;
                                            return `drop-shadow(0 0 ${glowSize}px #22c55e)`;
                                        })
                                        .on('start', () => {
                                            ripple
                                                .transition()
                                                .duration(200)
                                                .style('opacity', 0.2)
                                                .transition()
                                                .duration(300)
                                                .style('opacity', 0)
                                                .on('end', () => ripple.remove());
                                        })
                                        .on('end', () => {
                                            surgeLine
                                                .transition()
                                                .duration(150)
                                                .style('opacity', 0.3)
                                                .transition()
                                                .duration(100)
                                                .style('opacity', 0)
                                                .on('end', () => {
                                                    surgeLine.remove();
                                                    glow.transition().duration(600).style('opacity', 1);
                                                    scanlines.selectAll('line').transition().duration(1000).ease(d3.easeCubicIn).style('opacity', 0.08);
                                                    bootText.transition().duration(400).style('opacity', 1).on('end', () => {
                                                        const glitch = setInterval(() => {
                                                            bootText.attr('x', width / 2 + (Math.random() - 0.5) * 20).style('opacity', 0.9);
                                                            setTimeout(() => bootText.attr('x', width / 2).style('opacity', 1), 80);
                                                        }, 300);
                                                        noise.transition().duration(500).style('opacity', 0.2).transition().duration(1000).style('opacity', 0.1);
                                                        setTimeout(() => {
                                                            clearInterval(glitch);
                                                            bootText.transition().duration(300).style('opacity', 1).attr('x', width / 2);
                                                            preloader.transition().duration(800).style('opacity', 0).on('end', () => {
                                                                preloader.remove();
                                                                if (debtData.length > 0) {
                                                                    drawLineChartAndTicker(debtData);
                                                                    updateDebtInWords(debtData);
                                                                    updateAnalysis(debtData);
                                                                } else {
                                                                    d3.select('#debtTicker').text('Error loading data');
                                                                }
                                                                container.transition().duration(500).style('opacity', '1');
                                                            });
                                                        }, 1200);
                                                    });
                                                });
                                        });
                                });
                        });
                });
        });
}

// Cookie helpers
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

function setCookie(name, value, days) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

// Theme initialization with SVG toggle
function initializeTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const html = document.documentElement;

    function setupTheme() {
        const lightIcon = document.getElementById('lightIcon');
        const darkIcon = document.getElementById('darkIcon');

        if (!lightIcon || !darkIcon) {
            console.error('Theme icons not found in DOM');
            return;
        }

        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            html.classList.add('dark');
            darkIcon.classList.add('hidden');
            lightIcon.classList.remove('hidden');
        } else {
            html.classList.remove('dark');
            lightIcon.classList.add('hidden');
            darkIcon.classList.remove('hidden');
        }

        themeToggle.addEventListener('click', () => {
            html.classList.toggle('dark');
            const isDark = html.classList.contains('dark');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            if (isDark) {
                darkIcon.classList.add('hidden');
                lightIcon.classList.remove('hidden');
            } else {
                lightIcon.classList.add('hidden');
                darkIcon.classList.remove('hidden');
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupTheme);
    } else {
        setupTheme();
    }
}

// Initialize the application
async function init() {
    const debtData = await fetchDebtData();
    initializeTheme();

    if (!getCookie('visited')) {
        showPreloader(debtData);
        setCookie('visited', 'true', 365);
    } else {
        d3.select('#preloader').remove();
        d3.select('.container').style('opacity', '1');
        if (debtData.length > 0) {
            drawLineChartAndTicker(debtData);
            updateDebtInWords(debtData);
            updateAnalysis(debtData);
        } else {
            d3.select('#debtTicker').text('Error loading data');
        }
    }
}

// Handle window resize
function handleResize() {
    fetchDebtData().then(data => {
        if (data.length > 0) {
            drawLineChartAndTicker(data);
            updateDebtInWords(data);
            updateAnalysis(data);
        }
    });
}

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

init();
window.addEventListener('resize', debounce(handleResize, 200));
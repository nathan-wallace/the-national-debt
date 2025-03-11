import './styles.css';
import * as d3 from 'd3';

// Utility to detect mobile devices
const isMobile = () => window.innerWidth <= 640;

// Dynamic SVG height
const getSvgHeight = () => (isMobile() ? 250 : 400);

// Determine time frame for data (last 30 years or full range)
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

// Draw the line chart and animate the ticker
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

  // Fade in chart
  svg.style('opacity', 0).transition().duration(1000).style('opacity', 1);

  // Chart Title
  svg.append('text')
    .attr('x', margin.left + width / 2)
    .attr('y', margin.top / 2)
    .attr('text-anchor', 'middle')
    .attr('font-family', 'Press Start 2P')
    .attr('font-size', isMobile() ? '1rem' : '1.2rem')
    .attr('fill', '#00ffcc')
    .text('U.S. National Debt Over Time');

  // X-Axis
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
    .attr('fill', '#e0e0e0')
    .text('Year');

  // Y-Axis
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
    .attr('fill', '#e0e0e0')
    .text('Debt (Trillions USD)');

  const line = d3.line()
    .x(d => x(d.date))
    .y(d => y(d.debt))
    .curve(d3.curveMonotoneX);

  const path = g.append('path')
    .datum(filteredData)
    .attr('fill', 'none')
    .attr('stroke', '#00ffcc')
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

// Prevent animation on touch scroll
let isScrolling;
window.addEventListener('touchmove', () => {
  clearTimeout(isScrolling);
  isScrolling = setTimeout(() => {
    // Do nothing on touch scroll to prevent re-animation
  }, 66);
}, { passive: true });

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

  // Existing metrics
  const totalGrowth = ((endDebt - startDebt) / startDebt) * 100;
  const cagr = (Math.pow(endDebt / startDebt, 1 / (endYear - startYear)) - 1) * 100;

  const annualGrowth = [];
  for (let i = 1; i < years.length; i++) {
    const growth = ((yearlyData[years[i]] - yearlyData[years[i - 1]]) / yearlyData[years[i - 1]]) * 100;
    annualGrowth.push({ year: years[i], growth });
  }
  const highestGrowth = annualGrowth.reduce((prev, curr) => (curr.growth > prev.growth ? curr : prev), annualGrowth[0]);
  const lowestGrowth = annualGrowth.reduce((prev, curr) => (curr.growth < prev.growth ? curr : prev), annualGrowth[0]);

  // New metric: Average annual debt increase
  const avgAnnualIncrease = (endDebt - startDebt) / (endYear - startYear);

  // New metric: Debt doubling time
  let doublingYear = null;
  const doubleStartDebt = startDebt * 2;
  for (let i = 0; i < years.length; i++) {
    if (yearlyData[years[i]] >= doubleStartDebt) {
      doublingYear = years[i];
      break;
    }
  }
  const doublingTime = doublingYear ? doublingYear - startYear : null;

  // New metric: Volatility (standard deviation of annual growth rates)
  const meanGrowth = annualGrowth.reduce((sum, d) => sum + d.growth, 0) / annualGrowth.length;
  const variance = annualGrowth.reduce((sum, d) => sum + Math.pow(d.growth - meanGrowth, 2), 0) / annualGrowth.length;
  const growthVolatility = Math.sqrt(variance);

  // New metric: Longest streak of debt increase
  let longestIncrease = { length: 0, start: null, end: null };
  let currentIncrease = { length: 0, start: null, end: null };
  for (let i = 1; i < years.length; i++) {
    if (yearlyData[years[i]] > yearlyData[years[i - 1]]) {
      if (currentIncrease.length === 0) currentIncrease.start = years[i - 1];
      currentIncrease.length++;
      currentIncrease.end = years[i];
    } else {
      if (currentIncrease.length > longestIncrease.length) {
        longestIncrease = { ...currentIncrease };
      }
      currentIncrease = { length: 0, start: null, end: null };
    }
  }
  if (currentIncrease.length > longestIncrease.length) longestIncrease = currentIncrease;

  // Build the analysis string
  const analysisText = d3.select('#analysisText');
  analysisText.style('font-size', isMobile() ? '0.9rem' : '1.1rem');

  let analysisString = `From ${startYear} to ${endYear}, the U.S. national debt increased from $${startDebt.toLocaleString('en-US', { minimumFractionDigits: 2 })} to $${endDebt.toLocaleString('en-US', { minimumFractionDigits: 2 })}, a total growth of ${totalGrowth.toFixed(2)}%. The compound annual growth rate (CAGR) was ${cagr.toFixed(2)}%. The highest annual growth occurred in ${highestGrowth.year} at ${highestGrowth.growth.toFixed(2)}%, and the lowest was in ${lowestGrowth.year} at ${lowestGrowth.growth.toFixed(2)}%. `;

  analysisString += `On average, the debt increased by $${avgAnnualIncrease.toLocaleString('en-US', { minimumFractionDigits: 0 })} per year. `;

  if (doublingTime) {
    analysisString += `The debt doubled from its ${startYear} value in ${doublingTime} years, reaching $${(startDebt * 2).toLocaleString('en-US', { minimumFractionDigits: 2 })} by ${doublingYear}. `;
  }

  analysisString += `The annual growth rate volatility was ${growthVolatility.toFixed(2)}%, indicating ${growthVolatility > 10 ? 'high' : 'moderate'} variability in debt increases. `;

  if (longestIncrease.length > 0) {
    analysisString += `The longest consecutive period of debt increase spanned ${longestIncrease.length} years, from ${longestIncrease.start} to ${longestIncrease.end}. `;
  }

  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  const today = new Date().toLocaleDateString('en-US', options);
  analysisString += `Data accessed on ${today}. Source: <a href="https://fiscaldata.treasury.gov" target="_blank" rel="noopener noreferrer">U.S. Treasury Fiscal Data.</a>`;

  // Use .html() to ensure that the HTML within the string is rendered
  analysisText.html(analysisString);
}


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

  // Initial black screen
  const screen = svg.append('rect')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('fill', '#000000');

  // Define CRT glow gradient
  svg.append('defs')
    .append('radialGradient')
    .attr('id', 'crt-boot-glow')
    .attr('cx', '50%')
    .attr('cy', '50%')
    .attr('r', '60%')
    .selectAll('stop')
    .data([
      { offset: '0%', color: '#00ffcc', opacity: 0.3 },
      { offset: '100%', color: '#0a0a0a', opacity: 1 }
    ])
    .enter().append('stop')
    .attr('offset', d => d.offset)
    .attr('stop-color', d => d.color)
    .attr('stop-opacity', d => d.opacity);

  // Glow effect layer
  const glow = svg.append('rect')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('fill', 'url(#crt-boot-glow)')
    .style('opacity', 0);

  // Scanlines group
  const scanlines = svg.append('g');
  const scanlineCount = Math.floor(height / 4);
  for (let i = 0; i < scanlineCount; i++) {
    scanlines.append('line')
      .attr('x1', 0)
      .attr('y1', i * 4)
      .attr('x2', width)
      .attr('y2', i * 4)
      .attr('stroke', '#00ffcc')
      .attr('stroke-width', 0.6)
      .style('opacity', 0);
  }

  // Power surge effect (vertical line sweeping down)
  const surgeLine = svg.append('line')
    .attr('x1', width / 2)
    .attr('x2', width / 2)
    .attr('y1', 0)
    .attr('y2', 0)
    .attr('stroke', '#00ffcc')
    .attr('stroke-width', 4)
    .style('filter', 'drop-shadow(0 0 10px #00ffcc)')
    .style('opacity', 0);

  // Boot text
  const bootText = svg.append('text')
    .attr('x', width / 2)
    .attr('y', height / 2)
    .attr('text-anchor', 'middle')
    .attr('font-family', 'Press Start 2P')
    .attr('font-size', isMobile() ? '2rem' : '3rem')
    .attr('fill', '#00ffcc')
    .style('text-shadow', '0 0 15px #00ffcc')
    .text('CALCULATING DEBT')
    .style('opacity', 0);

  // Noise overlay
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

  // Animation sequence
  preloader.transition()
    .duration(200)
    .style('opacity', 1)
    .on('end', () => {
      // 1. Initial flicker (power on)
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
          // 2. Surge line sweep (CRT beam startup)
          surgeLine
            .style('opacity', 1)
            .transition()
            .duration(800)
            .ease(d3.easeLinear)
            .attr('y2', height)
            .style('opacity', 0.8)
            .on('end', () => {
              surgeLine.remove();

              // 3. Phosphor glow and scanlines fade in
              glow.transition()
                .duration(600)
                .style('opacity', 1);

              scanlines.selectAll('line')
                .transition()
                .duration(1000)
                .ease(d3.easeCubicIn)
                .style('opacity', 0.08);

              // 4. Boot text appears with slight glitch
              bootText.transition()
                .duration(400)
                .style('opacity', 1)
                .on('end', () => {
                  const glitch = setInterval(() => {
                    bootText
                      .attr('x', width / 2 + (Math.random() - 0.5) * 20)
                      .style('opacity', 0.9);
                    setTimeout(() => {
                      bootText
                        .attr('x', width / 2)
                        .style('opacity', 1);
                    }, 80);
                  }, 300);

                  // 5. Noise and final stabilization
                  noise.transition()
                    .duration(500)
                    .style('opacity', 0.2)
                    .transition()
                    .duration(1000)
                    .style('opacity', 0.1);

                  setTimeout(() => {
                    clearInterval(glitch);
                    bootText.transition()
                      .duration(300)
                      .style('opacity', 1)
                      .attr('x', width / 2);

                    // 6. Fade out preloader
                    preloader.transition()
                      .duration(800)
                      .style('opacity', 0)
                      .on('end', () => {
                        preloader.remove();
                        if (debtData.length > 0) {
                          drawLineChartAndTicker(debtData);
                          updateAnalysis(debtData);
                        } else {
                          d3.select('#debtTicker').text('Error loading data');
                        }
                        container.transition()
                          .duration(500)
                          .style('opacity', '1');
                      });
                  }, 1200);
                });
            });
        });
    });
}

// Helper functions to get and set cookies
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

// Initialize the application
async function init() {
  const debtData = await fetchDebtData(); // Fetch debt data as before

  // Check if the user has visited before by looking for the 'visited' cookie
  if (!getCookie('visited')) {
    // First visit: show preloader and set the cookie for 1 year
    showPreloader(debtData);
    setCookie('visited', 'true', 365);
  } else {
    // Returning visitor: skip the preloader
    d3.select('#preloader').remove(); // Remove preloader element if exists
    d3.select('.container').style('opacity', '1'); // Make container visible immediately

    if (debtData.length > 0) {
      drawLineChartAndTicker(debtData);
      updateAnalysis(debtData);
    } else {
      d3.select('#debtTicker').text('Error loading data');
    }
  }
}

// Handle window resize
function handleResize() {
  fetchDebtData().then(data => {
    if (data.length > 0) drawLineChartAndTicker(data);
  });
}

init();
window.addEventListener('resize', debounce(handleResize, 200));

// Debounce function to limit resize event calls
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}
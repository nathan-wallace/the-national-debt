import './styles.css';
import * as d3 from 'd3';

// Utility to detect mobile devices
const isMobile = () => window.innerWidth <= 640;

// Dynamic SVG height
const getSvgHeight = () => (isMobile() ? 300 : 500);

// Determine time frame for data (last 30 years or full range)
function getTimeFrame(data) {
  const minDate = d3.min(data, d => d.date);
  const maxDate = d3.max(data, d => d.date);
  const minYear = minDate.getFullYear();
  const maxYear = maxDate.getFullYear();

  if (maxYear - minYear >= 30) {
    return {
      startDate: new Date(maxYear - 30, 0, 1),
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

// Update analysis section with data insights
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

  const analysisText = d3.select('#analysisText');
  analysisText.style('font-size', isMobile() ? '0.9rem' : '1.1rem');

  const analysisString = `From ${startYear} to ${endYear}, the U.S. national debt increased from $${startDebt.toLocaleString('en-US', { minimumFractionDigits: 2 })} to $${endDebt.toLocaleString('en-US', { minimumFractionDigits: 2 })}, representing a total growth of ${totalGrowth.toFixed(2)}%. The compound annual growth rate (CAGR) was ${cagr.toFixed(2)}%. The highest annual growth was in ${highestGrowth.year} at ${highestGrowth.growth.toFixed(2)}%, while the lowest was in ${lowestGrowth.year} at ${lowestGrowth.growth.toFixed(2)}%. Data accessed on March 09, 2025. Source: U.S. Treasury Fiscal Data.`;

  analysisText.text(analysisString);
}

// Show preloader during initialization
function showPreloader() {
  const preloader = d3.select('#preloader');
  const container = d3.select('.container');
  container.style('opacity', '0');
  preloader.style('display', 'block');

  const svg = preloader.append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .style('position', 'absolute');

  const width = window.innerWidth;
  const height = window.innerHeight;

  svg.append('rect')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('fill', '#0a0a0a');

  svg.append('text')
    .attr('x', width / 2)
    .attr('y', height / 2)
    .attr('text-anchor', 'middle')
    .attr('font-family', 'Press Start 2P')
    .attr('font-size', isMobile() ? '1.5rem' : '2rem')
    .attr('fill', '#00ffcc')
    .text('LOADING...');

  preloader
    .transition()
    .duration(1000)
    .style('opacity', 1)
    .transition()
    .duration(2000)
    .style('opacity', 0)
    .on('end', () => {
      preloader.remove();
      container.transition().duration(500).style('opacity', '1');
    });
}

// Initialize the application
async function init() {
  showPreloader();
  const debtData = await fetchDebtData();
  if (debtData.length > 0) {
    drawLineChartAndTicker(debtData);
    updateAnalysis(debtData);
  } else {
    d3.select('#debtTicker').text('Error loading data');
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
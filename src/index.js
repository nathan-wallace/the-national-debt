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

function showPreloader(debtData) {
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

  // Retro black background with phosphor glow
  svg.append('rect')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('fill', '#0a0a0a')
    .transition()
    .duration(300)
    .style('fill', 'url(#phosphor-glow)')
    .on('start', function() {
      const defs = svg.append('defs');
      defs.append('radialGradient')
        .attr('id', 'phosphor-glow')
        .attr('cx', '50%')
        .attr('cy', '50%')
        .attr('r', '50%')
        .selectAll('stop')
        .data([
          { offset: '0%', color: '#00ffcc', opacity: 0.15 },
          { offset: '100%', color: '#0a0a0a', opacity: 1 }
        ])
        .enter().append('stop')
        .attr('offset', d => d.offset)
        .attr('stop-color', d => d.color)
        .attr('stop-opacity', d => d.opacity);
    });

  // CRT scanlines with interference
  const scanlines = svg.append('g');
  for (let i = 0; i < height / 10; i++) {
    scanlines.append('line')
      .attr('x1', 0)
      .attr('y1', i * 10)
      .attr('x2', width)
      .attr('y2', i * 10)
      .attr('stroke', '#00ffcc')
      .attr('stroke-width', 0.4)
      .attr('opacity', 0)
      .transition()
      .duration(5000)
      .ease(d3.easeSinInOut)
      .attr('y1', i * 10 - height)
      .attr('y2', i * 10 - height)
      .attr('opacity', 0.08)
      .attrTween('x2', () => t => width + Math.sin(t * 20 + i) * 20);
  }

  // 3D Revolving Eye of Providence with enhanced distortion
  const eyeGroup = svg.append('g')
    .attr('transform', `translate(${width / 2}, ${height / 2})`);

  const pyramidPointsBase = [
    { x: 0, y: -130, z: 0 },
    { x: -100, y: 70, z: -100 },
    { x: 100, y: 70, z: -100 },
    { x: 100, y: 70, z: 100 },
    { x: -100, y: 70, z: 100 }
  ];
  const eyePoint = { x: 0, y: -70, z: 0 };

  const project3D = (point, t) => {
    const scale = 250;
    const perspective = 700;
    const rotateY = t * 2.5 * Math.PI;
    const rotateX = Math.sin(t * 1.5 * Math.PI) * 0.7;
    const cosY = Math.cos(rotateY);
    const sinY = Math.sin(rotateY);
    const cosX = Math.cos(rotateX);
    const sinX = Math.sin(rotateX);

    let x1 = point.x * cosY + point.z * sinY;
    let z1 = -point.x * sinY + point.z * cosY;
    let y1 = point.y * cosX - z1 * sinX;
    z1 = point.y * sinX + z1 * cosX;

    const distort = Math.sin(t * 6 + z1 * 0.02) * 15 + Math.cos(t * 4 + x1 * 0.01) * 10;
    x1 += distort;
    y1 += distort * 0.6;

    const factor = perspective / (perspective + z1 + 250);
    return {
      x: x1 * factor * scale,
      y: y1 * factor * scale
    };
  };

  const pyramidFaces = [
    [0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 1], [1, 2, 3, 4]
  ];

  pyramidFaces.forEach((face, i) => {
    const path = eyeGroup.append('path')
      .attr('fill', i === 4 ? 'none' : '#00ffcc')
      .attr('stroke', '#00ffcc')
      .attr('stroke-width', 2.5)
      .attr('opacity', i === 4 ? 0.5 : 0.2)
      .style('filter', 'url(#glow)')
      .transition()
      .duration(5000)
      .ease(d3.easeCubicInOut)
      .attrTween('d', () => {
        return t => {
          const points = face.map(index => project3D(pyramidPointsBase[index], t));
          return d3.line()
            .x(d => d.x)
            .y(d => d.y)
            .curve(d3.curveLinearClosed)(points);
        };
      })
      .attrTween('opacity', () => t => i === 4 ? 0.5 : 0.2 + Math.sin(t * 12) * 0.08);
  });

  const eye = eyeGroup.append('g');
  eye.append('circle')
    .attr('r', 28)
    .attr('fill', 'none')
    .attr('stroke', '#00ffcc')
    .attr('stroke-width', 4)
    .style('filter', 'url(#glow)')
    .attr('opacity', 0)
    .transition()
    .duration(800)
    .delay(400)
    .attr('opacity', 0.8)
    .transition()
    .duration(4200)
    .attrTween('cx', () => t => project3D(eyePoint, t).x)
    .attrTween('cy', () => t => project3D(eyePoint, t).y)
    .attrTween('r', () => t => 28 + Math.sin(t * 10) * 5);

  eye.append('circle')
    .attr('r', 12)
    .attr('fill', '#00ffcc')
    .style('filter', 'url(#glow)')
    .attr('opacity', 0)
    .transition()
    .duration(800)
    .delay(600)
    .attr('opacity', 1)
    .transition()
    .duration(4200)
    .attrTween('cx', () => t => project3D(eyePoint, t).x + Math.cos(t * 15) * 6)
    .attrTween('cy', () => t => project3D(eyePoint, t).y + Math.sin(t * 15) * 6);

  svg.append('defs')
    .append('filter')
    .attr('id', 'glow')
    .append('feGaussianBlur')
    .attr('stdDeviation', '4')
    .attr('result', 'coloredBlur')
    .transition()
    .duration(5000)
    .attr('stdDeviation', '6');

  const textGroup = svg.append('g')
    .attr('transform', `translate(${width / 2}, ${height / 2 + 180})`);

  const mainText = textGroup.append('text')
    .attr('text-anchor', 'middle')
    .attr('font-family', 'Press Start 2P')
    .attr('font-size', isMobile() ? '1.8rem' : '2.5rem')
    .attr('fill', '#00ffcc')
    .attr('text-shadow', '0 0 15px #00ffcc')
    .text('CALCULATING DEBT');

  const tickerText = textGroup.append('text')
    .attr('text-anchor', 'middle')
    .attr('y', isMobile() ? 40 : 50)
    .attr('font-family', 'Courier New')
    .attr('font-size', isMobile() ? '1.2rem' : '1.5rem')
    .attr('fill', '#00ffcc')
    .attr('opacity', 0)
    .text('$0');

  const debtTicker = d3.interval(() => {
    const debtValue = Math.round(20000000000000 + Math.random() * 1000000000000 * Date.now() * 0.00001);
    tickerText.text(`$${debtValue.toLocaleString('en-US')}`);
    tickerText.transition()
      .duration(100)
      .attr('opacity', 0.9)
      .transition()
      .duration(100)
      .attr('opacity', 0.7);
  }, 150);

  const glitchInterval = setInterval(() => {
    mainText.transition()
      .duration(80)
      .attr('x', (Math.random() - 0.5) * 20)
      .attr('y', (Math.random() - 0.5) * 20)
      .attr('opacity', 0.85)
      .transition()
      .duration(80)
      .attr('x', 0)
      .attr('y', 0)
      .attr('opacity', 1);
  }, 200);

  preloader.transition()
    .duration(800)
    .style('opacity', 1)
    .transition()
    .duration(1200)
    .on('start', () => {
      tickerText.transition().duration(400).attr('opacity', 0.7);
      eyeGroup.transition()
        .duration(600)
        .attr('transform', `translate(${width / 2}, ${height / 2}) scale(1.1)`);
    })
    .transition()
    .duration(1200)
    .on('start', () => {
      eye.transition()
        .duration(600)
        .attr('opacity', 0.9)
        .transition()
        .duration(600)
        .attr('opacity', 0.7);
    })
    .transition()
    .duration(1200)
    .on('start', () => {
      tickerText.transition().duration(400).attr('opacity', 0.9);
      scanlines.transition().duration(600).attr('opacity', 0.12);
    })
    .transition()
    .duration(1000)
    .style('opacity', 0)
    .on('end', () => {
      debtTicker.stop();
      clearInterval(glitchInterval);
      eyeGroup.transition().duration(500).style('opacity', 0);
      scanlines.transition().duration(500).style('opacity', 0);
      textGroup.transition().duration(500).style('opacity', 0);
      preloader.remove();
      container.transition()
        .duration(500)
        .style('opacity', '1')
        .on('end', () => {
          // Start chart animation and ticker after preloader and container fade-in
          if (debtData.length > 0) {
            drawLineChartAndTicker(debtData);
            updateAnalysis(debtData);
          } else {
            d3.select('#debtTicker').text('Error loading data');
          }
        });
    });

  svg.append('rect')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('fill', 'none')
    .style('filter', 'url(#crt-noise)')
    .style('opacity', 0.25)
    .on('start', function() {
      svg.append('defs')
        .append('filter')
        .attr('id', 'crt-noise')
        .append('feTurbulence')
        .attr('type', 'fractalNoise')
        .attr('baseFrequency', '0.75')
        .attr('numOctaves', '3')
        .attr('stitchTiles', 'stitch')
        .transition()
        .duration(5000)
        .attr('baseFrequency', '0.8');
    });
}

// Initialize the application
async function init() {
  const debtData = await fetchDebtData(); // Fetch data first
  showPreloader(debtData); // Pass data to preloader, but delay chart rendering
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
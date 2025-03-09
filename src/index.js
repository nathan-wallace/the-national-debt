import './styles.css';
import * as d3 from 'd3';

function getTimeFrame(data) {
  const minDate = d3.min(data, d => d.date);
  const maxDate = d3.max(data, d => d.date);
  const minYear = minDate.getFullYear();
  const maxYear = maxDate.getFullYear();
  
  if (maxYear - minYear >= 30) {
    return {
      startDate: new Date(maxYear - 30, 0, 1),
      endDate: new Date(maxYear, 11, 31)
    };
  } else {
    return { startDate: minDate, endDate: maxDate };
  }
}

async function fetchDebtData() {
  const apiURL = 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny?fields=record_date,tot_pub_debt_out_amt&sort=-record_date&page[size]=10000';
  const res = await fetch(apiURL);
  const json = await res.json();

  const monthlyData = {};
  json.data.forEach(d => {
    const date = new Date(d.record_date);
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyData[yearMonth] = {
      date: date,
      debt: parseFloat(d.tot_pub_debt_out_amt)
    };
  });

  return Object.values(monthlyData).sort((a, b) => a.date - b.date);
}

function drawLineChartAndTicker(data) {
  const svg = d3.select('#debtChart');
  const margin = { top: 60, right: 60, bottom: 100, left: 80 }; // Adjusted top margin for title
  const width = parseInt(svg.style('width')) - margin.left - margin.right;
  const height = parseInt(svg.style('height')) - margin.top - margin.bottom;

  svg.selectAll('*').remove();
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const { startDate, endDate } = getTimeFrame(data);
  const filteredData = data.filter(d => d.date >= startDate && d.date <= endDate);

  const x = d3.scaleTime().domain([startDate, endDate]).range([0, width]);
  const y = d3.scaleLinear()
    .domain([d3.min(filteredData, d => d.debt) * 0.95, d3.max(filteredData, d => d.debt) * 1.05])
    .range([height, 0]);

  svg.style('opacity', 0);
  svg.transition()
    .delay(6000)
    .duration(1000)
    .ease(d3.easeLinear)
    .style('opacity', 1)
    .on('start', () => {
      d3.select('.crt-flicker').style('opacity', 1).transition().duration(500).style('opacity', 0);
    });

  // Chart Title
  svg.append('text')
    .attr('x', margin.left + width / 2)
    .attr('y', margin.top / 2)
    .attr('text-anchor', 'middle')
    .attr('font-family', 'Press Start 2P')
    .attr('font-size', '1.2rem')
    .attr('fill', '#00ffcc')
    .attr('text-shadow', '0 0 10px #00ffcc')
    .text('U.S. National Debt Over Time');

  // X-Axis with Label
  g.append('g')
    .attr('transform', `translate(0,${height})`)
    .attr('class', 'axis')
    .call(d3.axisBottom(x).ticks(d3.timeYear.every(1)).tickFormat(d3.timeFormat('%Y')))
    .selectAll("text")
      .attr("transform", "rotate(45)")
      .attr("dx", "0.6em")
      .attr("dy", "0.6em")
      .style("text-anchor", "start");

  svg.append('text')
    .attr('x', margin.left + width / 2)
    .attr('y', height + margin.top + 70)
    .attr('text-anchor', 'middle')
    .attr('font-family', 'Courier New')
    .attr('font-size', '14px')
    .attr('fill', '#e0e0e0')
    .attr('text-shadow', '0 0 5px #00ffcc')
    .text('Year');

  // Y-Axis with Label
  g.append('g')
    .attr('class', 'axis')
    .call(d3.axisLeft(y).ticks(6).tickFormat(d => `$${d3.format('.2s')(d)}`));

  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -(height / 2) - margin.top)
    .attr('y', margin.left / 2.4)
    .attr('text-anchor', 'middle')
    .attr('font-family', 'Courier New')
    .attr('font-size', '14px')
    .attr('fill', '#e0e0e0')
    .attr('text-shadow', '0 0 5px #00ffcc')
    .text('Debt (Trillions USD)');

  const line = d3.line()
    .x(d => x(d.date))
    .y(d => y(d.debt))
    .curve(d3.curveMonotoneX);

  const path = g.append('path')
    .datum(filteredData)
    .attr('fill', 'none')
    .attr('stroke', '#00ffcc')
    .attr('stroke-width', 3)
    .attr('d', line);

  const movingCircle = g.append('circle')
    .attr('r', 8)
    .attr('fill', 'red')
    .attr('class', 'glow');

  const animationDuration = 8000;
  const totalLength = path.node().getTotalLength();
  const tickerInterpolator = d3.interpolateNumber(filteredData[0].debt, filteredData[filteredData.length - 1].debt);

  path
    .attr('stroke-dasharray', totalLength + ' ' + totalLength)
    .attr('stroke-dashoffset', totalLength)
    .transition()
    .delay(6000)
    .duration(animationDuration)
    .ease(d3.easeQuadOut)
    .attrTween('stroke-dashoffset', function() {
      const interpolateOffset = d3.interpolateNumber(totalLength, 0);
      return function(t) {
        const offset = interpolateOffset(t);
        const point = path.node().getPointAtLength(totalLength - offset);
        movingCircle.attr('cx', point.x).attr('cy', point.y);
        const debtValue = tickerInterpolator(t);
        d3.select('#debtTicker').text(`$${debtValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
        return offset;
      };
    })
    .on('end', () => {
      startDecorativeLoop();
    });

  function startDecorativeLoop() {
    const chartSection = d3.select('#chartSection');
    function loop() {
      d3.select('.crt-flicker')
        .style('opacity', 0)
        .transition()
        .duration(200)
        .style('opacity', 0.2)
        .transition()
        .duration(200)
        .style('opacity', 0);

      chartSection
        .transition()
        .duration(3000)
        .style('box-shadow', 'inset 0 0 20px #00ffcc, 0 0 40px #00ffcc')
        .transition()
        .duration(3000)
        .style('box-shadow', 'inset 0 0 20px #00ffcc, 0 0 30px #00ffcc')
        .on('end', loop);
    }
    loop();
  }
}

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
  const highestGrowth = annualGrowth.reduce((prev, curr) => curr.growth > prev.growth ? curr : prev, annualGrowth[0]);
  const lowestGrowth = annualGrowth.reduce((prev, curr) => curr.growth < prev.growth ? curr : prev, annualGrowth[0]);

  const analysisHeader = d3.select('#analysisHeader');
  const analysisText = d3.select('#analysisText');
  const headerString = 'Analysis';
  const currentDate = 'March 09, 2025'; // Using provided current date
  const analysisString = `> From ${startYear} to ${endYear}, the U.S. national debt increased from $${startDebt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
> to $${endDebt.toLocaleString('en-US', { minimumFractionDigits: 2 })}, representing a total growth of ${totalGrowth.toFixed(2)}%.
> The compound annual growth rate (CAGR) over this period was ${cagr.toFixed(2)}%.
> The highest annual growth was recorded in ${highestGrowth.year} at ${highestGrowth.growth.toFixed(2)}%, 
> while the lowest annual growth was in ${lowestGrowth.year} at ${lowestGrowth.growth.toFixed(2)}%.
> Data accessed on ${currentDate}.
> Source: U.S. Treasury Fiscal Data (https://fiscaldata.treasury.gov).`;

  setTimeout(() => {
    document.getElementById('chartSection').scrollIntoView({ behavior: 'smooth' });

    // Animate header first
    analysisHeader.text('');
    let h = 0;
    function typeHeader() {
      if (h < headerString.length) {
        analysisHeader.text(analysisHeader.text() + headerString.charAt(h));
        h++;
        setTimeout(typeHeader, 100);
      } else {
        // Start analysis text after header
        analysisText.text('');
        let i = 0;
        function typeText() {
          if (i < analysisString.length) {
            analysisText.text(analysisText.text() + analysisString.charAt(i));
            i++;
            setTimeout(typeText, 20);
          }
        }
        typeText();
      }
    }
    typeHeader();
  }, 14000);
}

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
    .attr('fill', '#000')
    .transition()
    .duration(500)
    .attr('fill', '#0a0a0a');

  const grid = svg.append('g');
  for (let i = 0; i < 20; i++) {
    grid.append('line')
      .attr('x1', 0)
      .attr('y1', i * height / 20)
      .attr('x2', width)
      .attr('y2', i * height / 20)
      .attr('stroke', '#00ffcc')
      .attr('stroke-width', 1)
      .attr('opacity', 0)
      .transition()
      .delay(i * 100)
      .duration(500)
      .attr('opacity', 0.2);

    grid.append('line')
      .attr('x1', i * width / 20)
      .attr('y1', 0)
      .attr('x2', i * width / 20)
      .attr('y2', height)
      .attr('stroke', '#00ffcc')
      .attr('stroke-width', 1)
      .attr('opacity', 0)
      .transition()
      .delay(i * 100)
      .duration(500)
      .attr('opacity', 0.2);
  }

  const shapes = svg.append('g')
    .attr('transform', `translate(${width / 2}, ${height / 2})`);

  shapes.append('circle')
    .attr('r', 50)
    .attr('fill', 'none')
    .attr('stroke', '#ffcc00')
    .attr('stroke-width', 3)
    .transition()
    .duration(4000)
    .ease(d3.easeSin)
    .attr('r', 100)
    .attrTween('transform', () => d3.interpolateString('rotate(0)', 'rotate(360)'));

  shapes.append('rect')
    .attr('x', -40)
    .attr('y', -40)
    .attr('width', 80)
    .attr('height', 80)
    .attr('fill', 'none')
    .attr('stroke', '#00ffcc')
    .attr('stroke-width', 2)
    .transition()
    .duration(3000)
    .ease(d3.easeSin)
    .attr('width', 120)
    .attr('height', 120)
    .attr('x', -60)
    .attr('y', -60)
    .attrTween('transform', () => d3.interpolateString('rotate(0)', 'rotate(-360)'));

  const text = svg.append('text')
    .attr('x', width / 2)
    .attr('y', height / 2 + 150)
    .attr('text-anchor', 'middle')
    .attr('font-family', 'Press Start 2P')
    .attr('font-size', '2rem')
    .attr('fill', '#00ffcc')
    .attr('text-shadow', '0 0 10px #00ffcc')
    .text('INITIALIZING...');

  preloader.transition()
    .duration(1000)
    .style('opacity', 1)
    .transition()
    .duration(1000)
    .on('start', () => text.text('LOADING DATA...'))
    .transition()
    .duration(1000)
    .on('start', () => text.text('TRACKER ONLINE'))
    .transition()
    .duration(1000)
    .on('start', () => {
      shapes.transition().duration(500).style('opacity', 0.5).transition().duration(500).style('opacity', 1);
      grid.transition().duration(200).attr('transform', 'translate(10, 0)').transition().duration(200).attr('transform', 'translate(0, 0)');
    })
    .transition()
    .duration(1000)
    .style('opacity', 0)
    .on('end', () => {
      preloader.remove();
      container.transition().duration(500).style('opacity', '1');
    });
}

async function init() {
  showPreloader();
  const debtData = await fetchDebtData();
  drawLineChartAndTicker(debtData);
  updateAnalysis(debtData);
}

init();
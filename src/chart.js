import * as d3 from 'd3';
import { isMobile, getSvgHeight } from './utils.js';
import { getTimeFrame, setCustomTimeFrame } from './debtData.js';
import { updateDebtInWords, updateAnalysis } from './uiUpdates.js';

let eventsCache = null;

async function fetchEvents() {
    if (!eventsCache) {
        const res = await fetch('events.json', { cache: 'no-store' });
        eventsCache = await res.json();
        eventsCache.forEach(e => (e.date = new Date(e.date)));
    }
    return eventsCache;
}

const modal = d3.select('#eventModal');
const modalTitle = d3.select('#eventTitle');
const modalDesc = d3.select('#eventDescription');
const modalSource = d3.select('#eventSource');

d3.select('#modalClose').on('click', () => modal.classed('hidden', true));
modal.on('click', event => {
    if (event.target === modal.node()) modal.classed('hidden', true);
});

function showEventModal(evt) {
    modalTitle.text(evt.title);
    modalDesc.text(evt.description);
    modalSource.attr('href', evt.url);
    modal.classed('hidden', false);
}

export async function drawLineChartAndTicker(data) {
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

    const events = await fetchEvents();
    const formatYM = d3.timeFormat('%Y-%m');
    const debtLookup = new Map(filteredData.map(d => [formatYM(d.date), d.debt]));
    const eventPoints = events
        .map(e => ({ ...e, debt: debtLookup.get(formatYM(e.date)) }))
        .filter(e => e.debt !== undefined && e.date >= startDate && e.date <= endDate);

    d3.select('#eventTooltip').remove();
    const tooltip = d3.select('body')
        .append('div')
        .attr('id', 'eventTooltip')
        .attr('class', 'absolute px-2 py-1 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded shadow pointer-events-none opacity-0');

    const eventGroups = g.selectAll('.event-group')
        .data(eventPoints)
        .enter()
        .append('g')
        .attr('class', 'event-group cursor-pointer')
        .attr('transform', d => `translate(${x(d.date)},${y(d.debt)})`)
        .style('opacity', 0)
        .on('click', function (_, d) {
            showEventModal(d);
        })
        .on('mouseenter', function (event, d) {
            const ring = d3.select(this).select('.event-ring');
            const dot = d3.select(this).select('.event-dot');
            ring.classed('opacity-0', false).classed('animate-ping', true);
            dot.classed('animate-pulse', true);
            tooltip.style('opacity', 1).html(d.title);
            tooltip.style('left', `${event.pageX + 10}px`).style('top', `${event.pageY - 28}px`);
            setTimeout(() => {
                ring.classed('animate-ping', false).classed('opacity-0', true);
                dot.classed('animate-pulse', false);
            }, 2000);
        })
        .on('mousemove', function (event) {
            tooltip.style('left', `${event.pageX + 10}px`).style('top', `${event.pageY - 28}px`);
        })
        .on('mouseleave', function () {
            const ring = d3.select(this).select('.event-ring');
            const dot = d3.select(this).select('.event-dot');
            ring.classed('animate-ping', false).classed('opacity-0', true);
            dot.classed('animate-pulse', false);
            tooltip.style('opacity', 0);
        });

    eventGroups.append('circle')
        .attr('class', 'event-ring stroke-black dark:stroke-green-500 fill-transparent pointer-events-none opacity-0')
        .attr('r', isMobile() ? 8 : 10)
        .attr('stroke-width', isMobile() ? 2 : 3);

    eventGroups.append('circle')
        .attr('class', 'event-dot fill-black stroke-white dark:fill-green-500 dark:stroke-green-500')
        .attr('r', isMobile() ? 4 : 5);

    const movingCircle = g.append('circle')
        .attr('r', isMobile() ? 6 : 8)
        .attr('fill', 'red')
        .attr('class', 'glow');

    const animationDuration = isMobile() ? 4000 : 8000;
    const totalLength = path.node().getTotalLength();
    const tickerInterpolator = d3.interpolateNumber(filteredData[0].debt, filteredData[filteredData.length - 1].debt);

    eventGroups
        .transition()
        .delay(d => (x(d.date) / width) * animationDuration)
        .style('opacity', 1)
        .on('start', function () {
            const ring = d3.select(this).select('.event-ring');
            const dot = d3.select(this).select('.event-dot');
            ring.classed('opacity-0', false).classed('animate-ping', true);
            dot.classed('animate-pulse', true);
            setTimeout(() => {
                ring.classed('animate-ping', false).classed('opacity-0', true);
                dot.classed('animate-pulse', false);
            }, 2000);
        });

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

    const brush = d3.brushX()
        .extent([[0, 0], [width, chartHeight]])
        .on('end', event => {
            if (!event.selection) return;
            const [x0, x1] = event.selection;
            const start = x.invert(x0);
            const end = x.invert(x1);
            setCustomTimeFrame(start, end);
            drawLineChartAndTicker(data);
            updateDebtInWords(data);
            updateAnalysis(data);
        });

    g.append('g')
        .attr('class', 'brush')
        .call(brush);

    eventGroups.raise();
}
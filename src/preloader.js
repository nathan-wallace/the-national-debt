import * as d3 from 'd3';
import { drawLineChartAndTicker } from './chart.js';
import { updateDebtInWords, updateAnalysis } from './uiUpdates.js';
import { isMobile } from './utils.js';

export function showPreloader(debtData) {
    const preloader = d3.select('#preloader');
    const container = d3.select('.container');
    container.style('opacity', '0');
    preloader.style('display', 'block').html('');

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
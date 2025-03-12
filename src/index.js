import * as d3 from 'd3';
import './styles.css';
import { fetchDebtData } from './debtData.js';
import { drawLineChartAndTicker, drawLineChartStatic } from './chart.js';
import { updateDebtInWords, updateAnalysis } from './uiUpdates.js';
import { showPreloader } from './preloader.js';
import { initializeTheme } from './theme.js';
import { debounce, getCookie, setCookie, isMobile } from './utils.js';

let cachedDebtData = null;

async function init() {
    cachedDebtData = await fetchDebtData();
    initializeTheme();

    if (!getCookie('visited')) {
        showPreloader(cachedDebtData);
        setCookie('visited', 'true', 365);
    } else {
        d3.select('#preloader').remove();
        d3.select('.container').style('opacity', '1');
        if (cachedDebtData.length > 0) {
            drawLineChartAndTicker(cachedDebtData); // Animated version on initial load
            updateDebtInWords(cachedDebtData);
            updateAnalysis(cachedDebtData);
        } else {
            d3.select('#debtTicker').text('Error loading data');
        }
    }
}

let lastWidth = window.innerWidth;

function handleResize() {
    const currentWidth = window.innerWidth;
    if (currentWidth !== lastWidth && (!isMobile() || !('ontouchstart' in window))) {
        if (cachedDebtData && cachedDebtData.length > 0) {
            drawLineChartStatic(cachedDebtData); // Static version on resize
            updateDebtInWords(cachedDebtData);
            updateAnalysis(cachedDebtData);
        }
        lastWidth = currentWidth;
    }
}

// Handle print-specific rendering
function handlePrint() {
    if (cachedDebtData && cachedDebtData.length > 0) {
        drawLineChartStatic(cachedDebtData, true); // Redraw for print with 7in x 3.5in
    }
}

const debouncedHandleResize = debounce(handleResize, 200);
window.addEventListener('resize', debouncedHandleResize);
window.addEventListener('beforeprint', handlePrint);

init();
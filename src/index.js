import * as d3 from 'd3';
import './styles.css';
import { fetchDebtData } from './debtData.js';
import { drawLineChartAndTicker, drawLineChartStatic } from './chart.js'; // Updated import
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

const debouncedHandleResize = debounce(handleResize, 200);
window.addEventListener('resize', debouncedHandleResize);

init();
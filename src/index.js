import * as d3 from 'd3';
import './styles.css';
import { fetchDebtData, setCustomTimeFrame } from './debtData.js';
import { drawLineChartAndTicker } from './chart.js';
import { updateDebtInWords, updateAnalysis } from './uiUpdates.js';
import { showPreloader } from './preloader.js';
import { initializeTheme } from './theme.js';
import { debounce, getCookie, setCookie } from './utils.js';
let debtData = [];

async function init() {
    debtData = await fetchDebtData();
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

    const resetBtn = document.getElementById('resetZoom');
    resetBtn.addEventListener('click', () => {
        setCustomTimeFrame(null, null);
        drawLineChartAndTicker(debtData);
        updateDebtInWords(debtData);
        updateAnalysis(debtData);
    });
}

function handleResize() {
    if (debtData.length > 0) {
        drawLineChartAndTicker(debtData);
        updateDebtInWords(debtData);
        updateAnalysis(debtData);
    }
}

init();
window.addEventListener('resize', debounce(handleResize, 200));
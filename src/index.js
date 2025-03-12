import * as d3 from 'd3'; // Add this import
import './styles.css';
import { fetchDebtData } from './debtData.js';
import { drawLineChartAndTicker } from './chart.js';
import { updateDebtInWords, updateAnalysis } from './uiUpdates.js';
import { showPreloader } from './preloader.js';
import { initializeTheme } from './theme.js';
import { debounce, getCookie, setCookie } from './utils.js';

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

function handleResize() {
    fetchDebtData().then(data => {
        if (data.length > 0) {
            drawLineChartAndTicker(data);
            updateDebtInWords(data);
            updateAnalysis(data);
        }
    });
}

init();
window.addEventListener('resize', debounce(handleResize, 200));
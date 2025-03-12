import * as d3 from 'd3';

export async function fetchDebtData() {
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

export function getTimeFrame(data) {
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
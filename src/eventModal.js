import * as d3 from 'd3';

export function showEventModal(eventData) {
    const modal = d3.select('#eventModal');
    modal.select('#eventTitle').text(eventData.title);
    modal.select('#eventDescription').text(eventData.description);
    modal.select('#eventSource').attr('href', eventData.source);
    modal.classed('hidden', false);
}

export function initializeEventModal() {
    const modal = d3.select('#eventModal');
    modal.select('#closeModal').on('click', () => modal.classed('hidden', true));
    modal.on('click', (event) => {
        if (event.target.id === 'eventModal') {
            modal.classed('hidden', true);
        }
    });
}

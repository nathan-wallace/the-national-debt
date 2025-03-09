# U.S. National Debt Tracker

A dynamic web application for visualizing the United States national debt over time. Built with D3.js, Tailwind CSS, and Webpack, this tracker fetches live data from the U.S. Treasury Fiscal Data API and presents it through interactive charts, animated tickers, and engaging preloader effects.

## Features

- **Interactive Visualization:** Animated line chart displaying the evolution of U.S. national debt.
- **Live Ticker:** A dynamic ticker that updates the debt amount in real time as the chart progresses.
- **Data Analysis:** Analysis including total growth, compound annual growth rate (CAGR), and yearly performance.
- **Engaging Preloader:** Eye-catching SVG animations that create an immersive loading experience.
- **Modern Tooling:** Built with Webpack for module bundling, Tailwind CSS for styling, and PostCSS for CSS transformations.

## Configuration
Tailwind CSS:
The configuration is defined in tailwind.config.js, scanning both the public and src directories.

## PostCSS:
Plugins for Tailwind CSS and Autoprefixer are set up in postcss.config.js.

## Webpack:
The development server is configured to run on port 3000, with hot module replacement and automatic browser launching.

## Data Source
The application fetches U.S. national debt data from the U.S. Treasury Fiscal Data API. For more details on the data source, visit FiscalData Treasury.

## Acknowledgments
Technologies: D3.js, Tailwind CSS, Webpack
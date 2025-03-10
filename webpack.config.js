// webpack.config.js
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'development', // Webpack will override this with --mode production in the build script
  entry: './src/index.js',
  output: {
    filename: 'bundle.[contenthash].js', // Add contenthash for cache busting
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/',
    clean: true, // Automatically clean the dist folder before each build
  },
  module: {
    rules: [
      { test: /\.css$/, use: ['style-loader', 'css-loader', 'postcss-loader'] },
    ],
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    port: 3000,
    hot: true,
    open: true,
    historyApiFallback: true,
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: 'public/images', to: 'images' },
      ],
    }),
  ],
  optimization: { // Add this section
    minimize: true,
    minimizer: [
      new TerserPlugin({ // Explicitly use Terser for JS minification
        extractComments: false, // Don’t extract comments to a separate file
        terserOptions: {
          compress: { drop_console: true }, // Remove console.logs in production
          mangle: true, // Shorten variable names
        },
      }),
    ],
    splitChunks: { // Split vendor code (e.g., D3) into a separate chunk
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      },
    },
  },
};
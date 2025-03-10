// webpack.config.js
const path = require('path');
const ImageMinimizerPlugin = require('image-minimizer-webpack-plugin');

module.exports = {
  mode: 'production', // Ensure production mode for optimizations
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/',
  },
  module: {
    rules: [
      // Existing CSS rule
      { test: /\.css$/, use: ['style-loader', 'css-loader', 'postcss-loader'] },
      // Add a rule to handle image files
      {
        test: /\.(png|jpe?g|gif|svg|ico)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'images/[name][hash][ext][query]',
        },
      },
    ],
  },
  plugins: [
    // Other plugins can be added here
    new ImageMinimizerPlugin({
      minimizer: {
        implementation: ImageMinimizerPlugin.imageminGenerate,
        options: {
          plugins: [
            ['mozjpeg', { quality: 75 }],
            ['pngquant', { quality: [0.65, 0.90] }],
          ],
        },
      },
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    port: 3000,
    hot: true,
    open: true,
    historyApiFallback: true,
  },
};

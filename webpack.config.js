const path = require('path');
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");

// if BUNDLE_PEERS is set, we'll produce bundle with all dependencies
const BUNDLE_PEERS = Boolean(process.env.BUNDLE_PEERS);
// always include IE support in full bundle
const SUPPORT_IE = BUNDLE_PEERS || Boolean(process.env.SUPPORT_IE);

const aliases = {};
if (!SUPPORT_IE) {
  const emptyModule = path.resolve(
    __dirname,
    'src',
    'graph-explorer',
    'emptyModule.ts'
  );
  aliases['canvg-fixed'] = emptyModule;
  aliases['es6-promise/auto'] = emptyModule;
}

module.exports = {
  mode: BUNDLE_PEERS ? 'production' : 'none',
  entry: './src/graph-explorer/index.ts',
  resolve: {
    alias: aliases,
    extensions: ['.ts', '.tsx', '.js'],
  },
  plugins: [
    new NodePolyfillPlugin(),
  ],
  module: {
    rules: [
      { test: /\.ts$|\.tsx$/, use: ['ts-loader'] },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
      {
        test: /\.scss$/,
        use: ['style-loader', 'css-loader', 'sass-loader'],
      },
      {
        test: /\.(jpe?g|gif|png|svg)$/,
        use: [{ loader: 'url-loader' }],
      },
      { test: /\.ttl$/, use: ['raw-loader'] },
    ],
  },
  output: {
    path: path.join(__dirname, 'dist'),
    filename: BUNDLE_PEERS
      ? 'graph-explorer-full.min.js'
      : SUPPORT_IE
      ? 'graph-explorer-ie.js'
      : 'graph-explorer.js',
    library: 'GraphExplorer',
    libraryTarget: 'umd',
  },
  devtool: 'source-map',
  externals: BUNDLE_PEERS
    ? []
    : [
        'd3-color',
        'file-saverjs',
        'lodash',
        'n3',
        'rdf-ext',
        'react',
        'react-dom',
        'webcola',
        'whatwg-fetch',
      ],
  performance: {
    maxEntrypointSize: 2048000,
    maxAssetSize: 2048000,
  },
};

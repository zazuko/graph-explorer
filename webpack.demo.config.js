const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin")

const SUPPORT_IE = process.env.SUPPORT_IE;
const SPARQL_ENDPOINT = process.env.SPARQL_ENDPOINT;
const WIKIDATA_ENDPOINT = process.env.WIKIDATA_ENDPOINT;
const LOD_PROXY = process.env.LOD_PROXY;
const PROP_SUGGEST = process.env.PROP_SUGGEST;

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

const examplesDir = path.join(__dirname, 'examples');
const htmlTemplatePath = path.join(__dirname, 'examples', 'template.ejs');

module.exports = {
  mode: 'development',
  entry: {
    rdf: path.join(examplesDir, 'rdf.ts'),
    demo: path.join(examplesDir, 'demo.ts'),
    dbpedia: path.join(examplesDir, 'dbpedia.ts'),
    wikidata: path.join(examplesDir, 'wikidata.ts'),
    composite: path.join(examplesDir, 'composite.ts'),
    wikidataGraph: path.join(examplesDir, 'wikidataGraph.ts'),
    toolbarCustomization: path.join(examplesDir, 'toolbarCustomization.tsx'),
  },
  resolve: {
    alias: aliases,
    extensions: ['.ts', '.tsx', '.js'],
  },
  module: {
    rules: [
      { test: /\.ts$|\.tsx$/, use: ['ts-loader'] },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
      { test: /\.scss$/, use: ['style-loader', 'css-loader', 'sass-loader'] },
      {
        test: /\.(jpe?g|gif|png|svg)$/,
        use: [{ loader: 'url-loader' }],
      },
      { test: /\.ttl$/, use: ['raw-loader'] },
    ],
  },
  devtool: 'source-map',
  optimization: {
    splitChunks: {
      cacheGroups: {
        commons: {
          name: 'commons',
          chunks: 'initial',
          minChunks: 2,
        },
      },
    },
  },
  output: {
    path: path.join(__dirname, 'dist', 'examples'),
    filename: '[name].bundle.js',
    chunkFilename: '[id].chunk.js',
    publicPath: '',
  },
  plugins: [
    new NodePolyfillPlugin(),
    new HtmlWebpackPlugin({
      filename: 'rdf.html',
      title: 'Graph Explorer RDF Demo',
      chunks: ['commons', 'rdf'],
      template: htmlTemplatePath,
    }),
    new HtmlWebpackPlugin({
      title: 'Graph Explorer Local Demo',
      chunks: ['commons', 'demo'],
      template: htmlTemplatePath,
    }),
    new HtmlWebpackPlugin({
      filename: 'dbpedia.html',
      title: 'Graph Explorer DBPedia SparQL Demo',
      chunks: ['commons', 'dbpedia'],
      template: htmlTemplatePath,
    }),
    new HtmlWebpackPlugin({
      filename: 'wikidata.html',
      title: 'Graph Explorer Wikidata Demo',
      chunks: ['commons', 'wikidata'],
      template: htmlTemplatePath,
    }),
    new HtmlWebpackPlugin({
      filename: 'wikidataGraph.html',
      title: 'Graph Explorer Wikidata with graph Demo',
      chunks: ['commons', 'wikidataGraph'],
      template: htmlTemplatePath,
    }),
    new HtmlWebpackPlugin({
      filename: 'composite.html',
      title: 'Graph Explorer composite DP Demo',
      chunks: ['commons', 'composite'],
      template: htmlTemplatePath,
    }),
    new HtmlWebpackPlugin({
      filename: 'toolbarCustomization.html',
      title: 'Graph Explorer Toolbar Customization Demo',
      chunks: ['commons', 'toolbarCustomization'],
      template: htmlTemplatePath,
    }),
  ],
  devServer: {
    proxy: {
      '/sparql**': {
        target: SPARQL_ENDPOINT,
        pathRewrite: { '/sparql': '' },
        changeOrigin: true,
        secure: false,
      },
      '/wikidata**': {
        target: WIKIDATA_ENDPOINT || SPARQL_ENDPOINT,
        pathRewrite: { '/wikidata': '' },
        changeOrigin: true,
        secure: false,
      },
      '/lod-proxy/**': {
        target: LOD_PROXY,
        changeOrigin: true,
        secure: false,
      },
      '/wikidata-prop-suggest**': {
        target: PROP_SUGGEST,
        pathRewrite: { '/wikidata-prop-suggest': '' },
        changeOrigin: true,
        secure: false,
      },
    },
  },
};

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin")

const SUPPORT_IE = process.env.SUPPORT_IE;
const SPARQL_ENDPOINT = process.env.SPARQL_ENDPOINT !== undefined ? process.env.SPARQL_ENDPOINT : "http://example.com";
const SPARQL_UPDATEENDPOINT = process.env.SPARQL_UPDATEENDPOINT !== undefined ? process.env.SPARQL_UPDATEENDPOINT :"http://example.com";
const WIKIDATA_ENDPOINT = process.env.WIKIDATA_ENDPOINT !== undefined ? process.env.WIKIDATA_ENDPOINT : "http://example.com";
const LOD_PROXY = process.env.LOD_PROXY !== undefined ? process.env.LOD_PROXY : "http://example.com";
const PROP_SUGGEST = process.env.PROP_SUGGEST !== undefined ? process.env.PROP_SUGGEST : "http://example.com";

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
    edit: path.join(examplesDir, 'edit.ts'),
    demo: path.join(examplesDir, 'demo.ts'),
    dbpedia: path.join(examplesDir, 'dbpedia.ts'),
    wikidata: path.join(examplesDir, 'wikidata.ts'),
    //composite: path.join(examplesDir, 'composite.ts'),
    wikidataGraph: path.join(examplesDir, 'wikidataGraph.ts'),
    toolbarCustomization: path.join(examplesDir, 'toolbarCustomization.tsx'),
    envendpoint: path.join(examplesDir, 'envendpoint.ts'),
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
      filename: 'edit.html',
      title: 'Graph Explorer Edit Demo',
      chunks: ['commons', 'edit'],
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
      filename: 'toolbarCustomization.html',
      title: 'Graph Explorer Toolbar Customization Demo',
      chunks: ['commons', 'toolbarCustomization'],
      template: htmlTemplatePath,
    }),
    new HtmlWebpackPlugin({
      filename: 'envendpoint.html',
      title: 'Graph Explorer on $SPARQL_ENDPOINT from env',
      chunks: ['commons', 'envendpoint'],
      template: htmlTemplatePath,
    }),
  ],
  devServer: {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization"
    },
   proxy: [ 
       {
        context: ['/sparql**'],
        target: SPARQL_ENDPOINT,
        pathRewrite: { '/sparql': '' },
        changeOrigin: true,
        secure: false,
      },
       {
        context: ['/update**'],
        target: SPARQL_UPDATEENDPOINT,
        pathRewrite: { '/update': '' },
        changeOrigin: true,
        secure: false,
      },
      {
        context: ['/wikidata**'],
        target: WIKIDATA_ENDPOINT || SPARQL_ENDPOINT,
        pathRewrite: { '/wikidata': '' },
        changeOrigin: true,
        secure: false,
      },
      {
        context: ['/lod-proxy/**'],
        target: LOD_PROXY,
        changeOrigin: true,
        secure: false,
      },
      {
        context: ['/wikidata-prop-suggest**'],
        target: PROP_SUGGEST,
        pathRewrite: { '/wikidata-prop-suggest': '' },
        changeOrigin: true,
        secure: false,
      }
    ]
  },
};

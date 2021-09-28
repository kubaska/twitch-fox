const path = require('path');
const WebExtPlugin = require('web-ext-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    mode: 'development',
    devtool: 'source-map',

    entry: {
        'background': './src/background.js',
        'popup': './src/popup.js',
        'options': './src/options.js'
    },

    plugins: [
        new WebExtPlugin({
            browserConsole: true,
            startUrl: 'about:debugging#/runtime/this-firefox',
            sourceDir: path.resolve(__dirname, 'dist'),
        }),
        new CopyPlugin({
            patterns: [
                { from: 'manifest.json', to: 'manifest.json' },
                { from: 'src/html', to: 'html' },
                'assets/**',
                '_locales/**/*'
            ]
        })
    ],

    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: ["babel-loader"]
            }
        ]
    }
};

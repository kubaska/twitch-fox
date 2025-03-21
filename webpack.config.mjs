import * as path from 'path';
import { fileURLToPath } from 'url';
import WebExtPlugin from "web-ext-plugin";
import CopyPlugin from "copy-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
    mode: 'development',
    devtool: 'source-map',

    entry: {
        background: './src/background.js',
        popup: './src/popup.js',
        options: './src/options.js',
        tooltips: './src/css/tooltips.sass'
    },

    plugins: [
        new MiniCssExtractPlugin({
            filename: 'html/css/[name].css'
        }),
        new WebExtPlugin({
            browserConsole: true,
            startUrl: 'about:debugging#/runtime/this-firefox',
            sourceDir: path.resolve(__dirname, 'dist'),
            selfHosted: true
        }),
        new CopyPlugin({
            patterns: [
                { from: 'manifest.json', to: 'manifest.json' },
                { from: 'src/html', to: 'html' },
                'assets/*'
            ]
        })
    ],

    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: ["babel-loader"]
            },
            {
                test: /\.s[ac]ss$/,
                exclude: /node_modules/,
                // https://github.com/webpack-contrib/mini-css-extract-plugin/issues/790
                type: 'javascript/auto',
                // type: 'asset/resource',
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader,
                        options: {
                            esModule: false
                        }
                    },
                    'css-loader',
                    'sass-loader'
                ]
            },
            {
                test: /\.svg$/,
                type: "asset/inline",
                generator: {
                    // Do not base64 encode SVGs for smaller bundle size.
                    dataUrl: {
                        encoding: false
                    }
                },
                // Inline assets with the "inline" query parameter.
                resourceQuery: /inline/
            },
            {
                test: /\.png$/,
                type: 'asset/inline'
            }
        ]
    },

    node: {
        global: false
    },

    optimization: {
        splitChunks: {
            // chunks: 'all'
            cacheGroups: {
                vendor: {
                    name: "vendor",
                    test: /[\\/]node_modules[\\/]/,
                    chunks: "all",
                },
            },
        }
    }
};

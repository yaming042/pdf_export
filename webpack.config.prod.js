const webpack = require('webpack');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
    mode: 'production',
    entry: {
        index: [path.resolve(__dirname, './src/app/index.js')]
    },
    resolve: {
        extensions: ['.js', '.jsx', '.sass', '.less', '*'],
        alias: {
            '../../../public': path.resolve(__dirname, 'public'),
            '../images':path.resolve(__dirname, './images'),
            '../js':path.resolve(__dirname, '/')
        }
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                use: [
                    {
                        loader: 'thread-loader'
                    },
                    {
                        loader: 'babel-loader',
                        options: {
                            compact: false // 防止编译时报 it exceeds the max of 500KB 类似的警告
                        }
                    }
                ],
                exclude: /node_modules/
            },
            {
                test: /\.css$/,
                use: [
                    {loader: 'style-loader'},
                    {
                        loader: 'css-loader'
                    }
                ]
            },
            {
                test: /\.scss$/,
                use: [
                    {loader: 'style-loader'},
                    {
                        loader: 'css-loader',
                        options: {
                            modules: {
                                localIdentName: '[local]_[hash:base64:5]'
                            },
                            url: true,
                            importLoaders: 2
                        }
                    },
                    {
                        loader: 'sass-loader'
                    }
                ]
            },
            {
                test: /\.less$/,
                use: [
                    {loader: 'style-loader'},
                    {
                        loader: 'css-loader'
                    },
                    {
                        loader: 'less-loader',
                        options: {
                            lessOptions: {
                                modifyVars: {
                                    /*
                                        修改antd默认样式变量值，所有变量见文档
                                        https://github.com/ant-design/ant-design/blob/master/components/style/themes/default.less
                                    */
                                    'layout-header-background': '#fff',
                                    'layout-body-background': 'transparent',
                                    'layout-header-padding': '0',
                                    'text-color': '#718599',
                                    'font-size-base': '12px',
                                    'menu-bg': 'transparent',
                                    'layout-sider-background': 'transparent',
                                    'primary-color': '#0A7CFF',
                                    'primary-color-hover': '#1264CE',
                                    'primary-color-active': '#875CFF'
                                },
                                javascriptEnabled: true
                            }
                        }
                    }
                ]
            },
            {
                test: /\.(gif|jpg|png|woff|svg|eot|ttf)\??.*$/,
                type: 'asset', // url-loader在webpack5中已经启用，可以用webpack自带的asset-module模块来处理
                parser: {
                    // 转base64的条件
                    dataUrlCondition: {
                        maxSize: 25 * 1024, // 25kb
                    }
                },
                generator: {
                    // 打包到 image 文件下
                    filename: 'public/asset/[contenthash][ext][query]',
                }
            }
        ]
    },
    performance: {
        hints: false
    },
    plugins: [
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({
            template: path.resolve(__dirname, './views/index.html'),
            inject: 'body',
            hash: true,
            cache: false,
            title: '优嘉贝帝建材集采网',
            staticPath: '/admin',
        }),
    ]
};

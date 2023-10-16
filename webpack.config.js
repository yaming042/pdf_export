const webpack = require('webpack');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    mode: 'development',
    entry: {
        index: [path.resolve(__dirname, './src/app/index.js')],
    },
    output: {
        path: path.resolve(__dirname, './public/dist'),
        filename: (pathData) => {
            return pathData.chunk.name === 'index' ? '[name]_[fullhash].js' : '[name].js';
        },
        // filename: '[name]_[fullhash].js',
        publicPath: '/' // 就是在index_bundle.js前面添加个路径
    },
    resolve: {
        extensions: ['.js', '.jsx', '.sass', '.less', '*'],
        // 配置别名
        alias: {
            '@commonUtils': path.join(__dirname, './src/commonUtils')
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
    devServer: {
        historyApiFallback: {
            disableDotRule: false
        },
        static: [
            {
                directory: path.join(__dirname, './public/js'),
                publicPath: '/js'
            },
            {
                directory: path.join(__dirname, './public/images'),
                publicPath: '/images'
            },
            {
                directory: path.join(__dirname, './public/stylesheets'),
                publicPath: '/stylesheets'
            },
            {
                directory: path.join(__dirname, './public/tpl'),
                publicPath: '/tpl'
            },
            {
                directory: path.join(__dirname, './public/font'),
                publicPath: '/font'
            },
            {
                directory: path.join(__dirname, './public/dist'),
                publicPath: '/'
            }
        ],
        compress: false,
        port: 5859,
        proxy: {
            '/api': {
                changeOrigin: true,
                target: 'http://localhost:8080',
                pathRewrite: {'^/api': '/'},
            },
            '/**': {
                target: '/index.html', //default target
                secure: false,
                bypass: function (req, res, opt) {
                    if (
                        req.path.indexOf('/images/') !== -1 ||
                        req.path.indexOf('/css/') !== -1 ||
                        req.path.indexOf('/js/') !== -1 ||
                        req.path.indexOf('/tpl/') !== -1 ||
                        req.path.indexOf('/font/') !== -1
                    ) {
                        return req.path;
                    }

                    if(req.path.indexOf('/loginDialog') !== -1) {
                        return '/loginDialog.html';
                    }

                    return '/index.html';
                }
            }
        },
        client: {
            logging: 'none'
        }
    },
    plugins: [
        new HtmlWebpackPlugin({
            title: '企福管理系统',
            filename: 'index.html',
            template: path.resolve(__dirname, './views/index.html'),
            inject: 'body',
            hash: true,
            cache: false,
            chunks: ['index'],
            apiPrefix: '/api'
        }),
    ]
};

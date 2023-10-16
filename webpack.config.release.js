const webpack = require('webpack');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');
const CopyPlugin = require("copy-webpack-plugin");
const PrerenderSPAPlugin = require('prerender-spa-plugin');

module.exports = {
    mode: 'production',
    entry: {
        index: [path.resolve(__dirname, './src/app/index.js')]
    },
    output: {
        path: path.resolve(__dirname, './../admin/version2.0/website'),
        filename: '[name]_[fullhash].js',
        publicPath: '/' // 就是在index_bundle.js前面添加个路径
    },
    resolve: {
        extensions: ['.js', '.jsx', '.sass', '.less', '*']
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
            filename: 'index.html',
            template: path.resolve(__dirname, './views/index.html'),
            inject: 'body',
            hash: true,
            cache: false,
            chunks: ['index'],
            apiPrefix: '', // 接口转发使用
            basePath: '',
            staticPath: '', // 静态资源前缀，后面没有 / ，因为代码中前面带 / 了
        }),
        new CopyPlugin({
            'patterns': [
                {
                    from: path.resolve(__dirname, './public/js'), to: path.resolve(__dirname, './../admin/version2.0/website/js')
                },
                {
                    from: path.resolve(__dirname, './public/images'), to: path.resolve(__dirname, './../admin/version2.0/website/images')
                },
                {
                    from: path.resolve(__dirname, './public/stylesheets'), to: path.resolve(__dirname, './../admin/version2.0/website/stylesheets')
                }
            ]
        }),
        new PrerenderSPAPlugin({
            // webpack编译后的代码，个人感觉就是插件启了个服务，服务的根目录
            staticDir: path.resolve(__dirname, './../admin/version2.0/website'),
            // 要预渲染的路由
            routes: ['/', '/market'],
            postProcess (renderedRoute) {
                const routePath = renderedRoute.route;
                renderedRoute.html = renderedRoute.html.replace(/(\/images)/g, '/admin/version2.0/website/images').replace(/\<\/script\>/, `</script><script>window.location.href = "/home${routePath}";</script>`);

                return renderedRoute
            },
            renderer: new PrerenderSPAPlugin.PuppeteerRenderer({
                // 调试的时候用 false
                headless: true,
                // 使用此选项可以限制并行渲染的路由数
                maxConcurrentRoutes: 4
            })
        })
    ]
};

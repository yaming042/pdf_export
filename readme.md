>先启动Java项目

> # 注意：发布命令是 npm run release

> npm run release 其实就是先release生成静态页面，有利于seo；再build单页应用

### 本地开发
进入到 src/main/webapp/m-home 目录下：
```javascript
1. npm i
2. npm run dev
```
本地开发使用的是devServer，服务起来后访问 http://locahost:5858 即可访问主页
####注意：
1. 因为主页有XHR请求，所以使用了devServer的proxy，因为后端服务在 localhost:8080 所以需要在前端加个api前缀标识，用来将这个标识后的请求路径转发到后端服务，这里请求前缀在编译时 HtmlWebpackPlugin 插件里配置了，本地是 /api（部署或发布时需要置空）
2. 应用里文件、模板的预览图使用的是XHR请求，所以也需要做对应的代理，逻辑参照 api 的配置即可
3. 在 npm install 过程中，因为需要安装prerender-spa-plugin，所以可能会卡住导致安装失败，遇到这种情况可以先去掉 prerender-spa-plugin包，安装完即可正常本地开发；后续需要再安装 prerender-spa-plugin 插件

### 发布
因为考虑到主页的 SEO 问题，所以首页使用了预渲染技术(prerender-spa-plugin)，处理过程简略就是，调用无头浏览器渲染一次页面，然后抓取渲染后的静态页面，存储起来，这样搜索引擎爬取页面时，页面上已经有部分数据了

####注意：
1. prerender-spa-plugin 插件下载贼慢，失败了就多重试重试，我装它花了 1hour 左右 (建议可以问问谷老师怎么处理，我试了cnpm也是很慢)
2. 下载完成后需要修改文件:
    - 添加错误日志，方便查找问题：/node_modules/prerender-spa-plugin/es6/index.js 查出如下内容'[prerender-spa-plugin] Unable to prerender all routes!'，一般在140行左右，在他附近的catch中添加 console.log(err) 即可
    - mkdir问题(webpack 5.x版本中干掉了mkdirp方法)： /node_modules/prerender-spa-plugin/es6/index.js 58行，重写mkdir，参照：https://github.com/chrisvfritz/prerender-spa-plugin/issues/414


> 1. build时可能会出现失败的问题，因为使用了 copy-webpack-plugin 插件，所以编译时对编译环境有要求(node, npm版本)
> 2. 项目中没有使用antd的图标库，使用的图标为iconfont，如果需要添加可以通知我





计划目录结构：
admin
+ -- version2.0
+ + -- home
+ + + -- js           ------------>copy过来的js
+ + + -- images       ------------>copy过来的images
+ + + -- stylesheets  ------------>copy过来的css
+ + + -- index.html   ------------>编译过来的
+ + + -- index.js     ------------>编译过来的
<!-- 下面是静态网站 -->
+ + + -- website ------------> 静态网站
+ + + + -- index.html ------------> 首页
+ + + + -- market
+ + + + + -- index.html ------------> 模板市场
+ + + + -- js
+ + + + -- images
+ + + + -- stylesheets
+ + + + -- index.js
<!-- 上面是静态网站 -->
<!-- 下面是管理后台 -->
+ + -- dashboard
+ + + -- index.html
+ + + -- index.js
+ + + -- js
+ + + -- images
+ + + -- sheetstyles
<!-- 下面是登录 -->
+ + -- login
+ + + -- index.html
+ + + -- index.js
+ + + -- js
+ + + -- images
+ + + -- sheetstyles


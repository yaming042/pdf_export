import axios from 'axios';
import qs from 'qs';
import {CookieUtil} from './utils';

export default function request(url, options = {}) {
    const CancelToken = axios.CancelToken;
    const source = CancelToken.source();

    const isUrlEncoded = options.contentType ? false : true;
    let ajaxOption = {
        url,
        method: options.method || 'GET', // 默认 get
        baseURL: window.__API || ``, // baseURL 将自动加在 `url` 前面，除非 `url` 是一个绝对 URL。
        headers: {
            'bizId': options.bizId || CookieUtil.getCookie('selectedBizId') || '',
            'Content-Type': options.contentType || 'application/x-www-form-urlencoded'
        },
        data: isUrlEncoded ? qs.stringify(options.data || {}) : JSON.stringify(options.data || {}), // 'PUT', 'POST', 和 'PATCH'时body的参数
        timeout: options.timeout || 10000, // 超时时间 10秒
        responseType: options.responseType || 'json', // 表示服务器响应的数据类型
        cancelToken: source.token
    };

    return new Promise((resolve, reject) => {
        axios(ajaxOption)
            .then(({data = {}, status}) => { // data就是后端接口返回的整体
                const {status: resStatus, message} = data;
                if(resStatus != 0) {
                    source.cancel(`请重新登录`);
                    if(resStatus === -3 && location.pathname != '/login'){ // 登录信息过期或身份未认证，如果已经是login页那就不用跳了
                        window.location.href = `/login?redirect=${encodeURIComponent(location.href)}`;
                        // 取消其他请求，message是可选项
                    }else if(resStatus === -1) { // 接口错误
                        console.log(message);
                    }
                    return resolve(null);
                }

                resolve(data);
            })
            .catch(error => {
                source.cancel(`网络请求错误`);
                console.error(error.message);
                resolve(null);
            });
    });
}

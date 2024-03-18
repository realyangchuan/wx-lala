# wechat request promisify

1. wx.request Promisify
2. interceptors
3. pre-config
4. simple, easy: ONLY 3 new options:

- `env` for `wx.cloud.callFunction` and `wx.cloud.callContainer`
- `baseURL` for `wx.request`
- `timeout` polyfill `wx.cloud.callFunction`

```js
import createRequest from 'wx-lala'

// 初始化请求实例：所有选项均为可选，但为了请求成功，如果使用云函数/云托管，请填入env初始化一下
const wxLaLa = createRequest({
  // 云函数/云托管初始化环境ID
  env: '',
  // wx.request
  request: {
    baseURL: 'https://xxx.com'
    // 其他选项跟wx.request选项保持一致
    // 不传入success时，返回的promise有类型提示；传入success时，promise返回值为success执行后的返回值，如果没返回，则为接口返回值
  },
  // wx.cloud.callFunction
  function: {
    // 传入后，外层的env将被忽略，以这个env来初始化
    env: '',
    // 请求超时
    timeout: 0
    // 其他选项跟wx.cloud.callFunction选项保持一致，除了config.env
  },
  // wx.cloud.callContainer
  container: {
    // 传入后，外层的env将被忽略，以这个env来初始化
    env: ''
    // 其他选项跟wx.cloud.callContainer选项保持一致，除了config.env
  }
})
```

```js
// 请求拦截器
wxLaLa.request.interceptor.request.use(function (options) {
  // 锁定请求，比如token过期了之类的场景
  this.lock()
  // 解除锁定
  this.unlock()
  // 取消请求
  this.cancel()
  // 返回options或者不返回都行
  return options
})
wxLaLa.request.interceptor.response.use(function (response, requestOptions) {
  // 锁定响应返回，比如token过期了之类的场景
  this.lock()
  // 解除锁定
  this.unlock()
  // 取消返回
  this.cancel()
  // 返回response或者不返回都行，自由得很
  return response
})
```

云函数/云托管的拦截器跟request一个路数的，`wxLaLa.callFunction.interceptor` / `wxLaLa.callContainer.interceptor`

```js
wxLaLa.request({ url: '' }).then(res => console.log('接口返回值', res))
wxLaLa
  .request({
    url: '',
    // 这里虽然支持同时传入success/fail和promise化，但很不推荐这种实践
    success(res) {
      return res.data
    }
  })
  .then(data => {
    // 这里的data就是success里面返回的值；
    console.log(data)
    // 如果success没有返回值/null/undefined，则data为接口返回的值
  })

wxLaLa
  .callFunction({
    name: 'demo'
  })
  .then(res => {
    console.log('接口返回值', res)
  })
wxLaLa
  .callFunction({
    name: 'demo',
    // 这里虽然支持同时传入success/fail和promise化，但很不推荐这种实践
    success(res) {
      return res.result
    }
  })
  .then(data => {
    // 这里的data就是success里面返回的值；
    console.log(data)
    // 如果success没有返回值/null/undefined，则data为接口返回的值
  })

wxLaLa
  .callContainer({
    path: '/'
  })
  .then(res => {
    console.log('接口返回值', res)
  })
wxLaLa
  .callContainer({
    path: '/',
    // 这里虽然支持同时传入success/fail和promise化，但很不推荐这种实践
    success(res) {
      return res.data
    }
  })
  .then(data => {
    // 这里的data就是success里面返回的值；
    console.log(data)
    // 如果success没有返回值/null/undefined，则data为接口返回的值
  })
```

function handleTimeout(timeout) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error('timeout')), timeout)
  })
}

function handleInterceptor(interceptor) {
  let _resolve = null
  let _reject = null
  interceptor.p = null

  function _reset() {
    interceptor.p = _resolve = _reject = null
  }

  Object.assign(interceptor, {
    lock() {
      interceptor.p = new Promise((resolve, reject) => {
        _resolve = resolve
        _reject = reject
      })
    },
    unlock() {
      if (_resolve) {
        _resolve()
        _reset()
      }
    },
    cancel() {
      if (_reject) {
        _reject(new Error('canceled'))
        _reset()
      }
    }
  })
}

function createInterceptors() {
  const interceptors = {
    request: {
      use(handler) {
        this.handler = handler
      }
    },
    response: {
      use(handler, errHandler) {
        this.handler = handler
        this.errHandler = errHandler
      }
    }
  }

  handleInterceptor(interceptors.request)
  handleInterceptor(interceptors.response)

  return interceptors
}

function enqueueIfLocked(p, cb) {
  if (p) {
    p.then(async () => await cb?.())
  } else {
    cb?.()
  }
}

function isPlainObject(obj) {
  return Object.prototype.toString.call(obj).slice(8, -1) === 'Object'
}
function mergeOptions(target, source, root = true) {
  const res = { ...target }
  for (const k in source) {
    if (root && k === 'env') {
      continue
    }
    const baseURL = source['baseURL']
    if (root && k === 'baseURL' && baseURL) {
      const reqUrl = res['url']
      if (typeof reqUrl === 'undefined' || /^https?:\/\//.test(reqUrl)) {
        continue
      }

      const i = Array.prototype.findIndex.call(reqUrl, c => /\w/.test(c))
      const path = i === -1 ? '' : reqUrl.slice(i)
      if (baseURL.endsWith('/')) {
        res['url'] = baseURL + path
      } else {
        res['url'] = path ? baseURL + '/' + path : baseURL
      }

      continue
    }

    if (res.hasOwnProperty(k)) {
      if (isPlainObject(res[k]) && isPlainObject(source[k])) {
        res[k] = mergeOptions(res[k], source[k], false)
      }
    } else {
      res[k] = source[k]
    }
  }

  return res
}

function createInstance(defaultOptions, makeRequest) {
  function _request(options) {
    const interceptors = _request.interceptors
    return new Promise((resolve, reject) => {
      enqueueIfLocked(interceptors.request.p, async () => {
        const originConfig = mergeOptions(options, defaultOptions)
        const config =
          (await Promise.resolve(
            interceptors.request.handler?.(originConfig)
          )) ?? originConfig
        makeRequest(config)
          .then(response => {
            enqueueIfLocked(interceptors.response.p, async () => {
              const res =
                (await Promise.resolve(
                  interceptors.response.handler?.(response, config)
                )) ?? response
              resolve(res)
            })
          })
          .catch(error => {
            enqueueIfLocked(interceptors.response.p, async () => {
              const err =
                (await Promise.resolve(
                  interceptors.response.errHandler?.(error, config)
                )) ?? error
              reject(err)
            })
          })
      })
    })
  }
  _request.interceptors = createInterceptors()

  return _request
}

function handleWechatApi(wechatApi, options) {
  return new Promise((resolve, reject) => {
    wechatApi({
      ...options,
      async success(res) {
        resolve((await options.success?.(res)) ?? res)
      },
      async fail(err) {
        reject((await options.fail?.(err)) ?? err)
      },
      async complete() {
        await options.complete?.()
      }
    })
  })
}

function wxRequest(options) {
  return handleWechatApi(wx.request, options)
}

function callFunction(options, wxCloud) {
  const { timeout, ...rest } = options
  let p = null
  if (rest.success || rest.fail || rest.complete) {
    p = handleWechatApi(wxCloud.callFunction, rest)
  } else {
    p = wxCloud.callFunction(rest)
  }

  // 新增timeout字段，超时处理
  if (timeout) {
    return Promise.race([p, handleTimeout(timeout)])
  }

  return p
}

function callContainer(options, wxCloud) {
  const { success, fail, complete } = options
  if (success || fail || complete) {
    return handleWechatApi(wxCloud.callContainer, options)
  }
  return wxCloud.callContainer(options)
}

function cloudInit(options) {
  if (options.env) {
    wx.cloud.init({ env: options.env })
  }

  let cloudFunctionInstance = wx.cloud
  if (options.function?.env) {
    cloudFunctionInstance = new wx.cloud.Cloud({
      resourceEnv: options.function.env
    })
    cloudFunctionInstance.init()
  }

  let cloudContainerInstance = wx.cloud
  if (options.container?.env) {
    cloudContainerInstance = new wx.cloud.Cloud({
      resourceEnv: options.container.env
    })
    cloudContainerInstance.init()
  }

  return { cloudFunctionInstance, cloudContainerInstance }
}

/**
 * env: 'test-xxx',
 * request: { baseURL: 'https://xxx.com', ...wx.request options }
 * function: { env: 'test-xxx', timeout?: 0, ...wx.cloud.callFunction options }
 * container: { env: 'test-xxx', ...wx.cloud.callContainer options }
 */
export default function (defaultOptions = {}) {
  const wxCloud = cloudInit(defaultOptions)

  return {
    request: createInstance(defaultOptions?.request ?? {}, wxRequest),
    callFunction: createInstance(defaultOptions?.function ?? {}, options =>
      callFunction(options, wxCloud.cloudFunctionInstance)
    ),
    callContainer: createInstance(defaultOptions?.container ?? {}, options =>
      callContainer(options, wxCloud.cloudContainerInstance)
    )
  }
}

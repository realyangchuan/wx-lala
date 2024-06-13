interface HandleInterceptor {
  lock: () => void
  unlock: () => void
  cancel: () => void
}

interface Interceptor<Req, Res, ResErr> {
  request: {
    use: (handler: (options: Req) => Req | void | Promise<Req | void>) => void
  } & HandleInterceptor
  response: {
    use: (
      handler: (response: Res, requestOptions: Req) => any,
      errHandler?: (error: ResErr, requestOptions: Req) => any
    ) => void
  } & HandleInterceptor
}

interface DefaultOptions<T extends string | WechatMiniprogram.IAnyObject | ArrayBuffer = string | WechatMiniprogram.IAnyObject | ArrayBuffer> {
  /** 云开发/云托管调用之前默认初始化环境ID, 也可以在function/container内部再各自独立初始化定义 */
  env?: string
  /**
   * 新增baseURL选项，一般填接口域名前缀。后续实际调用时的url以/^https?/开头时，则不用这个默认值
   * 其他选项跟wx.request选项一样，可参考官网文档https://developers.weixin.qq.com/miniprogram/dev/api/network/request/wx.request.html
   */
  request?: { baseURL?: string } & Omit<WechatMiniprogram.RequestOption<T>, 'url'>
  /**
   * 可传入wx.cloud.callFunction参数中任何值作为默认参数，其中config.env用env代替
   */
  function?: {
    env?: string
    timeout?: number
  } & Omit<OQ<ICloud.CallFunctionParam>, 'config'>
  /**
   * 可传入wx.cloud.callContainer参数中任何值作为默认参数，其中config.env用env代替
   */
  container?: { env?: string } & Omit<OQ<ICloud.CallContainerParam>, 'config'>
}

interface CreateRequest {
  <T extends string | WechatMiniprogram.IAnyObject | ArrayBuffer = string | WechatMiniprogram.IAnyObject | ArrayBuffer>(defaultOptions: DefaultOptions<T>): {
    request: {
      /**
       * 参数中带有success/fail，会先调用success/fail，返回值的promise;
       * 这里的返回值应该是响应拦截器的返回值，如果没有响应拦截器或者拦截器返回null | undefined，则返回接口返回的原始响应
       */
      <R extends T = T, Res = WechatMiniprogram.RequestSuccessCallbackResult<R>>(option: WechatMiniprogram.RequestOption<R>): Promise<Res>
      interceptors: {
        request: {
          use: (handler: (options: WechatMiniprogram.RequestOption<T>) => WechatMiniprogram.RequestOption<T> | void | Promise<WechatMiniprogram.RequestOption<T> | void>) => void
        } & HandleInterceptor
        response: {
          /**
           * 响应拦截器：其返回值会作为请求成功回调的返回值。如果未返回或返回null | undefined, 则返回接口的原始响应
           */
          use: <R extends T = T, Res = WechatMiniprogram.RequestSuccessCallbackResult<R>>(
            handler: (response: WechatMiniprogram.RequestSuccessCallbackResult<R>, requestOptions: WechatMiniprogram.RequestOption<R>) => Res | Promise<Res>,
            errHandler?: (error: WechatMiniprogram.RequestFailCallbackErr, requestOptions: WechatMiniprogram.RequestOption<R>) => any
          ) => void
        } & HandleInterceptor
      }
    }
    callFunction: {
      /**
       * 参数中带有success/fail，会先调用success/fail，返回值的promise
       */
      <T = any>(param: OQ<ICloud.CallFunctionParam>): Promise<T>
      (param: RQ<ICloud.CallFunctionParam>): Promise<ICloud.CallFunctionResult>
      interceptors: Interceptor<
        RQ<ICloud.CallFunctionParam>,
        ICloud.CallFunctionResult,
        ICloud.CallFunctionResult
      >
    }
    callContainer: {
      /**
       * 参数中带有success/fail，会先调用success/fail，返回值的promise
       */
      <T = any>(param: OQ<ICloud.CallContainerParam>): Promise<T>
      (
        param: RQ<ICloud.CallContainerParam>
      ): Promise<ICloud.CallContainerResult>
      interceptors: Interceptor<
        RQ<ICloud.CallContainerParam>,
        ICloud.CallContainerResult,
        ICloud.CallContainerResult
      >
    }
  }
}

declare const createRequest: CreateRequest
export default createRequest

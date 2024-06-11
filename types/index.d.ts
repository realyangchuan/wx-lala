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

type WxResType = string | WechatMiniprogram.IAnyObject | ArrayBuffer

interface DefaultOptions<T extends WxResType = WxResType> {
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

type CreateRequest = {
  <T extends WxResType = WxResType>(defaultOptions: DefaultOptions<T>): {
    request: {
      /**
       * 参数中带有success/fail，会先调用success/fail，返回值的promise;
       * TODO: 这里的返回值应该是响应拦截器的返回值，如果没有响应拦截器或者拦截器返回null | undefined，则返回接口返回的原始响应
       */
      <R extends T = T>(option: WechatMiniprogram.RequestOption<R>): Promise<any>
      interceptors: {
        request: {
          use: (handler: <R extends T = T>(options: WechatMiniprogram.RequestOption<R>) => WechatMiniprogram.RequestOption<R> | void | Promise<WechatMiniprogram.RequestOption<R> | void>) => void
        } & HandleInterceptor
        response: {
          use: (
            handler: <R extends T = T>(response: WechatMiniprogram.RequestSuccessCallbackResult<R>, requestOptions: WechatMiniprogram.RequestOption<R>) => any | void,
            errHandler?: <R extends T = T>(error: WechatMiniprogram.RequestFailCallbackErr, requestOptions: WechatMiniprogram.RequestOption<R>) => any | void
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

import { buildAuthHeaders, toQueryString } from "./auth.js";
import { productRegistry } from "./product-info.js";
import type {
  ActiveOrdersResponse,
  CancelOrderParams,
  Candle,
  KlineResponse,
  OrderInfo,
  PlaceOrderParams,
  PhemexApiResponse,
  ProductInfo,
  ProductsResponse,
  ServerTime,
  SymbolPrecision,
  Ticker24hr,
  TickerV3Response,
} from "./types.js";
import { withRetry } from "../../utils/retry.js";
import { generateClientOrderId } from "../../utils/uuid.js";

export interface PhemexClientConfig {
  apiKey: string;
  apiSecret: string;
  baseUrl?: string;
}

export class PhemexApiError extends Error {
  constructor(
    message: string,
    public readonly code?: number,
  ) {
    super(message);
    this.name = "PhemexApiError";
  }
}

const DEFAULT_BASE_URL = "https://api.phemex.com";

export class PhemexClient {
  private readonly baseUrl: string;

  constructor(private readonly config: PhemexClientConfig) {
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  }

  private async request<T>(
    method: "GET" | "PUT" | "DELETE" | "POST",
    path: string,
    params: Record<string, string | number | boolean | undefined> = {},
    signed = false,
  ): Promise<T> {
    const queryString = toQueryString(params);
    const url = queryString
      ? `${this.baseUrl}${path}?${queryString}`
      : `${this.baseUrl}${path}`;

    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    if (signed) {
      const authHeaders = buildAuthHeaders(
        this.config.apiKey,
        this.config.apiSecret,
        path,
        queryString,
      );
      Object.assign(headers, authHeaders);
    }

    const response = await fetch(url, { method, headers });
    const text = await response.text();

    let body: unknown;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      throw new PhemexApiError(
        `Invalid JSON response (${response.status}): ${text.slice(0, 200)}`,
      );
    }

    if (!response.ok) {
      const err = body as PhemexApiResponse<unknown>;
      throw new PhemexApiError(
        err.msg ?? `HTTP ${response.status}`,
        err.code,
      );
    }

    const apiBody = body as PhemexApiResponse<T> & TickerV3Response;

    if ("result" in apiBody && apiBody.result !== undefined) {
      return apiBody.result as T;
    }

    if ("code" in apiBody && apiBody.code !== 0) {
      throw new PhemexApiError(apiBody.msg ?? "Unknown API error", apiBody.code);
    }

    if ("data" in apiBody && apiBody.data !== undefined) {
      return apiBody.data as T;
    }

    return body as T;
  }

  async ping(): Promise<boolean> {
    await this.getServerTime();
    return true;
  }

  async getServerTime(): Promise<number> {
    const data = await withRetry(() =>
      this.request<ServerTime>("GET", "/public/time"),
    );
    return data.serverTime;
  }

  async getProducts(): Promise<ProductInfo[]> {
    const data = await withRetry(() =>
      this.request<ProductsResponse>("GET", "/public/products"),
    );

    const perpetuals = (data.perpProductsV2 ?? [])
      .filter((p) => p.status !== "Delisted" && p.type === "PerpetualV2")
      .map(
        (p): ProductInfo => ({
          symbol: p.symbol,
          type: p.type,
          status: p.status,
          priceScale: p.priceScale,
          ratioScale: p.ratioScale,
          tickSize: p.tickSize,
          qtyStepSize: p.qtyStepSize,
          minOrderValueRv: p.minOrderValueRv ?? "1",
          maxOrderQtyRq: p.maxOrderQtyRq ?? "1000",
          minOrderQtyRq: p.qtyStepSize,
        }),
      );

    productRegistry.setProducts(perpetuals);
    return perpetuals;
  }

  async getTicker(symbol: string): Promise<Ticker24hr> {
    return withRetry(() =>
      this.request<Ticker24hr>(
        "GET",
        "/md/v3/ticker/24hr",
        { symbol },
        false,
      ),
    );
  }

  async getKlines(
    symbol: string,
    resolution = 3600,
    limit = 100,
  ): Promise<Candle[]> {
    const data = await withRetry(() =>
      this.request<KlineResponse>(
        "GET",
        "/exchange/public/md/v2/kline/last",
        {
          symbol,
          resolution,
          limit,
        },
      ),
    );

    return data.rows.map((row) => ({
      timestamp: Number(row[0]),
      interval: Number(row[1]),
      lastClose: Number(row[2]),
      open: Number(row[3]),
      high: Number(row[4]),
      low: Number(row[5]),
      close: Number(row[6]),
      volume: Number(row[7]),
      turnover: Number(row[8]),
    }));
  }

  async placeOrder(params: PlaceOrderParams): Promise<OrderInfo> {
    const queryParams: Record<string, string | boolean | undefined> = {
      symbol: params.symbol,
      side: params.side,
      orderQtyRq: params.orderQtyRq,
      ordType: params.ordType ?? "Limit",
      posSide: params.posSide ?? "Merged",
      clOrdID: params.clOrdID ?? generateClientOrderId(),
      timeInForce: params.timeInForce ?? "GoodTillCancel",
      reduceOnly: params.reduceOnly,
    };

    if (params.priceRp !== undefined) {
      queryParams.priceRp = params.priceRp;
    }

    return withRetry(() =>
      this.request<OrderInfo>("PUT", "/g-orders/create", queryParams, true),
    );
  }

  async getActiveOrders(symbol: string): Promise<OrderInfo[]> {
    const data = await withRetry(() =>
      this.request<ActiveOrdersResponse>(
        "GET",
        "/g-orders/activeList",
        { symbol },
        true,
      ),
    );
    return data.rows ?? [];
  }

  async cancelOrder(params: CancelOrderParams): Promise<void> {
    const queryParams: Record<string, string | undefined> = {
      symbol: params.symbol,
      orderID: params.orderID,
      clOrdID: params.clOrdID,
    };
    await withRetry(() =>
      this.request<unknown>("DELETE", "/g-orders/cancel", queryParams, true),
    );
  }

  async cancelAllOrders(symbol: string): Promise<void> {
    const orders = await this.getActiveOrders(symbol);
    await Promise.all(
      orders.map((order) =>
        this.cancelOrder({ symbol, orderID: order.orderID }),
      ),
    );
  }

  getSymbolPrecision(symbol: string): SymbolPrecision {
    return productRegistry.extractPrecision(symbol);
  }

  formatPrice(symbol: string, price: number): string {
    return productRegistry.formatPrice(symbol, price);
  }

  formatQuantity(symbol: string, quantity: number): string {
    return productRegistry.formatQuantity(symbol, quantity);
  }
}

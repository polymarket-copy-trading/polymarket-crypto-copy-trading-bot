export interface PhemexApiResponse<T> {
  code: number;
  msg: string;
  data?: T;
}

export interface ServerTime {
  serverTime: number;
}

export interface ProductInfo {
  symbol: string;
  type: string;
  status: string;
  priceScale: number;
  ratioScale: number;
  tickSize: string;
  qtyStepSize: string;
  minOrderValueRv: string;
  maxOrderQtyRq: string;
  minOrderQtyRq: string;
}

export interface ProductsResponse {
  products: ProductInfo[];
  perpProductsV2?: RawPerpProduct[];
}

export interface RawPerpProduct {
  symbol: string;
  type: string;
  status: string;
  priceScale: number;
  ratioScale: number;
  tickSize: string;
  qtyStepSize: string;
  minOrderValueRv?: string;
  maxOrderQtyRq?: string;
  minPriceRp?: string;
}

export interface Ticker24hr {
  symbol: string;
  lastRp: string;
  bidRp: string;
  askRp: string;
  highRp: string;
  lowRp: string;
  openRp: string;
  markRp: string;
  volumeRq: string;
  turnoverRv: string;
  timestamp: number;
}

export interface TickerV3Response {
  error: unknown;
  id: number;
  result: Ticker24hr;
}

export interface KlineRow {
  timestamp: number;
  interval: number;
  lastClose: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  turnover: number;
}

export interface KlineResponse {
  total: number;
  rows: number[][];
}

export type OrderSide = "Buy" | "Sell";
export type OrderType = "Limit" | "Market";
export type OrderStatus =
  | "New"
  | "PartiallyFilled"
  | "Filled"
  | "Canceled"
  | "Rejected"
  | "Init";

export interface PlaceOrderParams {
  symbol: string;
  side: OrderSide;
  orderQtyRq: string;
  priceRp?: string;
  ordType?: OrderType;
  posSide?: string;
  clOrdID?: string;
  timeInForce?: string;
  reduceOnly?: boolean;
}

export interface OrderInfo {
  orderID: string;
  clOrdID: string;
  symbol: string;
  side: OrderSide;
  orderQtyRq: string;
  priceRp: string;
  ordStatus: OrderStatus;
  cumQtyRq: string;
  leavesQtyRq: string;
  orderType: string;
  timeInForce: string;
}

export interface ActiveOrdersResponse {
  rows: OrderInfo[];
}

export interface CancelOrderParams {
  symbol: string;
  orderID?: string;
  clOrdID?: string;
}

export interface SymbolPrecision {
  tickSize: string;
  stepSize: string;
  minQty: string;
  priceScale: number;
}

export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
}

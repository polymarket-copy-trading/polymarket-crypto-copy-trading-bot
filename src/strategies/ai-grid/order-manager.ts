import type { PhemexClient } from "../../api/phemex/client.js";
import type { OrderSide } from "../../api/phemex/types.js";
import type { Logger } from "../../services/logger.js";
import { generateClientOrderId } from "../../utils/uuid.js";

export interface GridOrder {
  levelIndex: number;
  side: OrderSide;
  price: number;
  size: number;
  clientOrderId: string;
  orderId?: string;
  state: "pending" | "live" | "filled" | "canceled";
}

export interface OrderManagerConfig {
  symbol: string;
  posSide: string;
  dryRun: boolean;
}

export class OrderManager {
  private readonly activeOrders = new Map<string, GridOrder>();

  constructor(
    private readonly client: PhemexClient,
    private readonly config: OrderManagerConfig,
    private readonly logger: Logger,
  ) {}

  getActiveOrders(): GridOrder[] {
    return Array.from(this.activeOrders.values());
  }

  findOrderByLevel(
    levelIndex: number,
    side: OrderSide,
  ): GridOrder | undefined {
    return Array.from(this.activeOrders.values()).find(
      (o) => o.levelIndex === levelIndex && o.side === side,
    );
  }

  async placeLimitOrder(
    levelIndex: number,
    side: OrderSide,
    price: number,
    size: number,
  ): Promise<GridOrder> {
    const clientOrderId = generateClientOrderId();
    const px = this.client.formatPrice(this.config.symbol, price);
    const qty = this.client.formatQuantity(this.config.symbol, size);

    const gridOrder: GridOrder = {
      levelIndex,
      side,
      price,
      size,
      clientOrderId,
      state: "pending",
    };

    if (this.config.dryRun) {
      this.logger.info(
        { levelIndex, side, price: px, size: qty, clientOrderId },
        "[DRY RUN] Would place limit order",
      );
      gridOrder.state = "live";
      gridOrder.orderId = `dry-${Date.now()}`;
      this.activeOrders.set(clientOrderId, gridOrder);
      return gridOrder;
    }

    const result = await this.client.placeOrder({
      symbol: this.config.symbol,
      side,
      orderQtyRq: qty,
      priceRp: px,
      ordType: "Limit",
      posSide: this.config.posSide,
      clOrdID: clientOrderId,
    });

    gridOrder.orderId = result.orderID;
    gridOrder.state = "live";
    this.activeOrders.set(clientOrderId, gridOrder);

    this.logger.info(
      { orderId: result.orderID, levelIndex, side, price: px, size: qty },
      "Limit order placed",
    );

    return gridOrder;
  }

  async cancelOrder(clientOrderId: string): Promise<void> {
    const order = this.activeOrders.get(clientOrderId);
    if (!order?.orderId) return;

    if (this.config.dryRun) {
      order.state = "canceled";
      this.activeOrders.delete(clientOrderId);
      return;
    }

    await this.client.cancelOrder({
      symbol: this.config.symbol,
      orderID: order.orderId,
      clOrdID: clientOrderId,
    });

    order.state = "canceled";
    this.activeOrders.delete(clientOrderId);
  }

  async cancelAllLocal(): Promise<void> {
    const orders = this.getActiveOrders();
    await Promise.all(orders.map((o) => this.cancelOrder(o.clientOrderId)));
  }

  async syncWithExchange(): Promise<void> {
    if (this.config.dryRun) {
      return;
    }

    const exchangeOrders = await this.client.getActiveOrders(this.config.symbol);

    for (const exOrder of exchangeOrders) {
      const local = this.activeOrders.get(exOrder.clOrdID);
      if (local) {
        local.orderId = exOrder.orderID;
        local.state =
          exOrder.ordStatus === "Filled" || exOrder.ordStatus === "PartiallyFilled"
            ? "filled"
            : "live";
      }
    }

    const filledLocally = Array.from(this.activeOrders.values()).filter(
      (o) => !exchangeOrders.some((e) => e.clOrdID === o.clientOrderId),
    );

    for (const order of filledLocally) {
      if (order.state === "live") {
        order.state = "filled";
        this.activeOrders.delete(order.clientOrderId);
      }
    }
  }

  clear(): void {
    this.activeOrders.clear();
  }
}

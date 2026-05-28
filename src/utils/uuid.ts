import { randomUUID } from "node:crypto";

export function generateClientOrderId(): string {
  return randomUUID().slice(0, 36);
}

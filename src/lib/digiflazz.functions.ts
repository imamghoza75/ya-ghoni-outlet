import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const creds = z.object({
  username: z.string().trim().min(1).max(64),
  apiKey: z.string().trim().min(4).max(128),
});

const transactSchema = creds.extend({
  testing: z.boolean(),
  action: z.enum(["prepaid", "inq-pasca", "pay-pasca", "status-pasca"]),
  buyerSkuCode: z.string().trim().min(1).max(80),
  customerNo: z.string().trim().min(1).max(64),
  refId: z.string().trim().min(4).max(64).regex(/^[A-Za-z0-9]+$/),
  maxPrice: z.number().int().nonnegative().max(100_000_000).optional(),
});

export const dfBalance = createServerFn({ method: "POST" })
  .validator((input: unknown) => creds.parse(input))
  .handler(async ({ data }) => {
    const { fetchBalance } = await import("./digiflazz.server");
    return fetchBalance(data.username, data.apiKey);
  });

export const dfPriceList = createServerFn({ method: "POST" })
  .validator((input: unknown) => creds.parse(input))
  .handler(async ({ data }) => {
    const { fetchPriceList } = await import("./digiflazz.server");
    return fetchPriceList(data.username, data.apiKey);
  });

export const dfTransact = createServerFn({ method: "POST" })
  .validator((input: unknown) => transactSchema.parse(input))
  .handler(async ({ data }) => {
    const { sendTransact } = await import("./digiflazz.server");
    return sendTransact(data);
  });

export const dfServerIp = createServerFn({ method: "GET" }).handler(async () => {
  const { lookupIp } = await import("./digiflazz.server");
  return lookupIp();
});

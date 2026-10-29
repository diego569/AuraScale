import type { AuthorizationUser } from "@/domain/identity/authorization-user";
import type { OrderDetailDto, OrderSummaryDto } from "@/domain/orders/order-dto";
import type {
  LedgerHistoryPageDto,
  WalletSummaryDto,
} from "@/domain/wallet/wallet-dto";

export const CLIENT_CAPABILITIES = [
  "WALLET_BALANCE_READ",
  "LEDGER_HISTORY_READ",
  "PAYMENT_DEPOSIT_SUBMIT",
  "AUTHENTICATED_CATALOG_PRICING",
  "CHECKOUT_CREATE",
  "ORDER_CREATE",
  "PURCHASE_EXECUTE",
  "REFUND_REQUEST",
  "BALANCE_COMMAND",
  "FULFILLMENT_DATA_READ",
] as const;

export type ClientCapability = (typeof CLIENT_CAPABILITIES)[number];

export interface ClientCapabilityGrant {
  capability: ClientCapability;
  userId: string;
}

export type RequireActiveClient = () => Promise<AuthorizationUser>;
export type GetWalletSummary = (userId: string) => Promise<WalletSummaryDto | null>;
export type GetLedgerHistoryPage = (
  userId: string,
  cursor?: string | null,
) => Promise<LedgerHistoryPageDto>;

export interface PlaceOrderInput {
  sku: string;
  quantity: number;
}
export type PlaceOrderCommand = (
  userId: string,
  input: PlaceOrderInput,
) => Promise<{ orderNumber: string }>;

export interface SubmitPaymentProofInput {
  orderNumber: string;
  file: { buffer: Buffer; originalFileName: string; mimeType: string };
  reportedAmountMinor: bigint;
  reportedCurrencyCode: string;
  externalReference?: string | null;
  clientNote?: string | null;
}
export type SubmitPaymentProofCommand = (
  userId: string,
  input: SubmitPaymentProofInput,
) => Promise<{ submissionId: string; proofId: string }>;

export type ListOrders = (userId: string) => Promise<OrderSummaryDto[]>;
export type FindOrderDetail = (
  userId: string,
  orderNumber: string,
) => Promise<OrderDetailDto | null>;

function notConfigured(name: string): never {
  throw new Error(`ClientCapabilityService.${name} was not wired to a real implementation.`);
}

export class ClientCapabilityService {
  constructor(
    private readonly requireActiveClient: RequireActiveClient,
    private readonly getWalletSummary: GetWalletSummary = async () => null,
    private readonly getLedgerHistoryPage: GetLedgerHistoryPage = async () => ({
      entries: [],
      nextCursor: null,
    }),
    private readonly placeOrderCommand: PlaceOrderCommand = async () =>
      notConfigured("placeOrder"),
    private readonly submitPaymentProofCommand: SubmitPaymentProofCommand = async () =>
      notConfigured("submitPaymentProof"),
    private readonly listOrdersQuery: ListOrders = async () => [],
    private readonly findOrderDetailQuery: FindOrderDetail = async () => null,
  ) {}

  private async authorize(capability: ClientCapability): Promise<ClientCapabilityGrant> {
    const user = await this.requireActiveClient();
    return { capability, userId: user.id };
  }

  async getWalletBalance() {
    const user = await this.requireActiveClient();
    const wallet = await this.getWalletSummary(user.id);
    return { userId: user.id, wallet };
  }

  async getLedgerHistory(cursor?: string | null) {
    const user = await this.requireActiveClient();
    const page = await this.getLedgerHistoryPage(user.id, cursor);
    return { userId: user.id, ...page };
  }

  submitPaymentDeposit() {
    return this.authorize("PAYMENT_DEPOSIT_SUBMIT");
  }

  getAuthenticatedCatalogPricing() {
    return this.authorize("AUTHENTICATED_CATALOG_PRICING");
  }

  createCheckout() {
    return this.authorize("CHECKOUT_CREATE");
  }

  createOrder() {
    return this.authorize("ORDER_CREATE");
  }

  async placeOrder(input: PlaceOrderInput) {
    const user = await this.requireActiveClient();
    return this.placeOrderCommand(user.id, input);
  }

  async submitPaymentProof(input: SubmitPaymentProofInput) {
    const user = await this.requireActiveClient();
    return this.submitPaymentProofCommand(user.id, input);
  }

  async listOrders() {
    const user = await this.requireActiveClient();
    return this.listOrdersQuery(user.id);
  }

  async getOrderDetail(orderNumber: string) {
    const user = await this.requireActiveClient();
    return this.findOrderDetailQuery(user.id, orderNumber);
  }

  executePurchase() {
    return this.authorize("PURCHASE_EXECUTE");
  }

  requestRefund() {
    return this.authorize("REFUND_REQUEST");
  }

  executeBalanceCommand() {
    return this.authorize("BALANCE_COMMAND");
  }

  getFulfillmentData() {
    return this.authorize("FULFILLMENT_DATA_READ");
  }
}

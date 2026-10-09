import { invoke } from "@tauri-apps/api/core";

export interface HealthResponse {
  status: string;
  service: string;
}

export interface AuthUserPayload {
  user_id: number;
  full_name: string;
  username: string;
  role_code: string;
  role_name: string;
}

export interface LoginRequestPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  session_token: string;
  login_at: string;
  user: AuthUserPayload;
}

export interface CurrentSessionResponse {
  session_token: string;
  login_at: string;
  user: AuthUserPayload;
}

export interface ActionResponse {
  success: boolean;
  message: string;
}

export interface UserListItem {
  id: number;
  full_name: string;
  username: string;
  role_code: string;
  role_name: string;
  is_active: number;
}
//inventory
export interface InventoryCategory {
  id: number;
  name: string;
  description: string | null;
}

export interface CreateCategoryPayload {
  name: string;
  description?: string | null;
}

export interface UpdateCategoryPayload {
  id: number;
  name: string;
  description?: string | null;
}

export interface DeleteCategoryPayload {
  id: number;
}

export interface InventoryItem {
  id: number;
  category_id: number | null;
  category_name: string | null;
  sku: string;
  barcode: string | null;
  name: string;
  unit: string;
  cost_price: number;
  selling_price: number;
  tax_type: string;
  tax_rate: number;
  stock_qty: number;
  min_stock_qty: number;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface CreateItemPayload {
  category_id?: number | null;
  sku: string;
  barcode?: string | null;
  name: string;
  unit?: string | null;
  cost_price: number;
  selling_price: number;
  stock_qty: number;
  min_stock_qty: number;
}

export interface UpdateItemPayload {
  id: number;
  category_id?: number | null;
  sku: string;
  barcode?: string | null;
  name: string;
  unit?: string | null;
  cost_price: number;
  selling_price: number;
  min_stock_qty: number;
}

export interface AdjustStockPayload {
  item_id: number;
  movement_type: "IN" | "OUT" | "ADJUSTMENT";
  qty: number;
  notes?: string | null;
}

export interface BulkUpdateTaxPayload {
  item_ids: number[];
  tax_type: string;
  tax_rate: number;
}

export interface StockMovement {
  id: number;
  item_id: number;
  item_name: string;
  item_sku: string;
  movement_type: string;
  qty: number;
  notes: string | null;
  created_at: string;
}

export interface StockMovementDto {
  id: number;
  item_id: number;
  item_name: string;
  item_sku: string;
  movement_type: "IN" | "OUT" | "ADJUSTMENT";
  qty: number;
  notes: string | null;
  created_at: string;
}

export interface ImportCsvItemPayload {
  sku: string;
  barcode: string | null;
  name: string;
  category_name: string | null;
  unit: string;
  cost_price: number;
  selling_price: number;
  stock_qty: number;
  min_stock_qty: number;
}

export interface BulkStockInPayload {
  sku: string;
  qty: number;
  notes: string | null;
}

//pos
export interface PosItem {
  id: number;
  sku: string;
  barcode: string | null;
  name: string;
  unit: string;
  selling_price: number;
  stock_qty: number;
  category_id: number;
}

export interface CreateTransactionItemPayload {
  item_id: number;
  qty: number;
}

export interface CreateTransactionPayload {
  cashier_id: number;
  session_id: number;
  shift_id: number;
  station_id: number;
  payment_method: string;
  paid_amount: number;
  notes?: string | null;
  items: CreateTransactionItemPayload[];
}

export interface PosReceiptItem {
  item_id: number;
  item_name: string;
  item_sku: string;
  qty: number;
  unit_price: number;
  line_total: number;
}

export interface PosReceipt {
  transaction_id: number;
  transaction_no: string;
  receipt_no: string;
  cashier_id: number;
  cashier_name: string;
  payment_method: string;
  subtotal: number;
  tax_total: number;
  grand_total: number;
  paid_amount: number;
  change_amount: number;
  created_at: string;
  items: PosReceiptItem[];
}

export interface HoldCartItemRequest {
  item_id: number;
  qty: number;
}

export interface SaveHoldCartRequest {
  session_id: number;
  notes: string | null;
  items: HoldCartItemRequest[];
}

export interface HoldCartItemDto {
  item_id: number;
  qty: number;
}

//initial
export interface Shift {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
}

export interface Station {
  id: number;
  name: string;
  status: string;
}

export interface PosSession {
  id: number;
  cashier_id: number;
  shift_id: number;
  station_id: number;
  status: string;
  opened_at: string;
  closed_at: string | null;
}

export interface OpenPosSessionPayload {
  username: string;
  password?: string;
  schedule_id: number;
  station_id: number;
  opening_cash: number;
}

export interface CloseShiftRequest {
  shift_id: number;
  session_id: number;
  actual_closing_cash: number;
  notes?: string | null;
}

export interface CloseShiftResponse {
  shift_id: number;
  session_id: number;
  expected_cash: number;
  actual_closing_cash: number;
  cash_difference: number;
  total_receipts: number;
  total_tax: number;
}

//laporan
export interface DateRangeRequest {
  start_date: string;
  end_date: string;
}

export interface RevenueSummaryDto {
  total_transactions: number;
  total_revenue: number;
  total_tax: number;
}

export interface CashierSalesReportDto {
  cashier_id: number;
  cashier_name: string;
  total_transactions: number;
  total_revenue: number;
  total_tax: number;
}

export interface StationSalesReportDto {
  station_id: number;
  station_name: string;
  total_transactions: number;
  total_revenue: number;
  total_tax: number;
}

export interface ShiftSalesReportDto {
  schedule_name: string;
  total_transactions: number;
  total_revenue: number;
  total_tax: number;
}

export interface ClosedShiftHistoryDto {
  shift_id: number;
  session_id: number;
  cashier_name: string;
  schedule_name: string;
  opened_at: string;
  closed_at: string | null;
  expected_cash: number;
  actual_closing_cash: number;
  cash_difference: number;
  total_receipts: number;
  total_tax: number;
}

//promotion
export interface CartItemRequest {
  item_id: number;
  qty: number;
  original_price: number;
}

export interface AppliedPromo {
  promo_id: number;
  promo_name: string;
  amount: number;
}

export interface CartItemResponse {
  item_id: number;
  qty: number;
  original_price: number;
  applied_promos: AppliedPromo[];
  item_total_discount: number;
  final_price: number;
}

export interface CartResponse {
  items: CartItemResponse[];
  subtotal: number;
  transaction_discounts: AppliedPromo[];
  total_discount: number;
  tax_base_amount: number;
  tax_amount: number;
  grand_total: number;
}
export interface PosStore {
  rawItems: CartItemRequest[];
  calculatedCart: CartResponse | null;
  isCalculating: boolean;
  error: string | null;

  addItem: (item: CartItemRequest) => Promise<void>;
  updateQty: (itemId: number, qty: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  clearCart: () => void;
  
  _syncWithBackend: () => Promise<void>;
}
//CRUD Promotion
export interface PromoPayload {
  name: string;
  promo_type: string;
  priority: number;
  discount_value: number;
  min_qty: number;
  reward_qty: number;
  min_purchase: number;
  start_date: string | null;
  end_date: string | null;
  is_active: number;
  item_ids: number[];
}

export interface PromoDetailResponse extends PromoPayload {
  id: number;
}

//==========================FUNGSI INVOKE TAURI==========================
export async function getBackendHealth() {
  return invoke<HealthResponse>("health_check");
}

export async function login(payload: LoginRequestPayload) {
  return invoke<LoginResponse>("login", { payload });
}

export async function logout(sessionToken: string) {
  return invoke<ActionResponse>("logout", { sessionToken });
}

export const getAllUsers = async (sessionToken: string): Promise<UserListItem[]> => {
  return await invoke("get_all_users", { sessionToken });
};

export const registerUser = async (payload: any): Promise<{ success: boolean; message: string }> => {
  return await invoke("register_user", { payload });
};

export const updateUser = async (payload: any): Promise<{ success: boolean; message: string }> => {
  return await invoke("update_user", { payload });
};

export const updateUserPassword = async (payload: any): Promise<{ success: boolean; message: string }> => {
  return await invoke("update_user_password", { payload });
};

export const deleteUser = async (payload: { session_token: string; id: number }): Promise<{ success: boolean; message: string }> => {
  return await invoke("delete_user", { payload });
};

export async function getCurrentSession(sessionToken: string) {
  return invoke<CurrentSessionResponse>("get_current_session", { sessionToken });
}

export async function getShifts() {
  return invoke<Shift[]>("get_shifts");
}

export async function getStations() {
  return invoke<Station[]>("get_stations");
}

export async function openPosSession(payload: OpenPosSessionPayload): Promise<PosSession> {
    return invoke("open_pos_session", { payload });
}

export async function closePosShift(payload: CloseShiftRequest): Promise<CloseShiftResponse> {
  return await invoke<CloseShiftResponse>("close_shift_command", { payload });
}

export async function saveHoldCart(payload: SaveHoldCartRequest): Promise<void> {
  return invoke("save_hold_cart", { payload });
}

export async function getHoldCart(sessionId: number): Promise<HoldCartItemDto[]> {
  return invoke("get_hold_cart", { sessionId });
}

export async function deleteHoldCart(sessionId: number): Promise<void> {
  return invoke("delete_hold_cart", { sessionId });
}

//inventory
export async function listCategories() {
  return invoke<InventoryCategory[]>("list_categories");
}

export async function createCategory(payload: CreateCategoryPayload) {
  return invoke<InventoryCategory>("create_category", { payload });
}

export async function updateCategory(payload: UpdateCategoryPayload) {
  return invoke<InventoryCategory>("update_category", { payload });
}

export async function deleteCategory(payload: DeleteCategoryPayload) {
  return invoke<ActionResponse>("delete_category", { id: payload.id });
}

export async function listItems() {
  return invoke<InventoryItem[]>("list_items");
}

export async function createItem(payload: CreateItemPayload) {
  return invoke<InventoryItem>("create_item", { payload });
}

export async function updateItem(payload: UpdateItemPayload) {
  return invoke<InventoryItem>("update_item", { payload });
}

export async function deactivateItem(itemId: number) {
  return invoke<InventoryItem>("deactivate_item", { itemId });
}

export async function bulkUpdateTax(payload: BulkUpdateTaxPayload) {
  return invoke<number>("bulk_update_tax", { payload });
}

export async function adjustStock(payload: AdjustStockPayload) {
  return invoke<InventoryItem>("adjust_stock", { payload });
}

export async function listStockMovements(itemId?: number | null): Promise<StockMovementDto[]> {
  return invoke<StockMovementDto[]>("list_stock_movements", { itemId: itemId ?? null });
}

export async function listPosItems() {
  return invoke<PosItem[]>("list_pos_items");
}

export async function createTransaction(payload: CreateTransactionPayload) {
  return invoke<PosReceipt>("create_transaction", { payload });
}

export async function importItems(payload: ImportCsvItemPayload[]): Promise<number> {
  return invoke<number>("import_items", { payload });
}

export async function bulkStockIn(payload: BulkStockInPayload[]): Promise<number> {
  return invoke<number>("bulk_stock_in", { payload });
}

//laporan
export async function getRevenueSummary(payload: DateRangeRequest): Promise<RevenueSummaryDto> {
  return await invoke("get_revenue_summary_command", { payload });
}

export async function getCashierSalesReport(payload: DateRangeRequest): Promise<CashierSalesReportDto[]> {
  return await invoke("get_cashier_sales_command", { payload });
}

export async function getStationSalesReport(payload: DateRangeRequest): Promise<StationSalesReportDto[]> {
  return await invoke("get_station_sales_command", { payload });
}

export async function getShiftSalesReport(payload: DateRangeRequest): Promise<ShiftSalesReportDto[]> {
  return await invoke("get_shift_sales_command", { payload });
}

export async function getClosedShiftsHistory(payload: DateRangeRequest): Promise<ClosedShiftHistoryDto[]> {
  return await invoke("get_closed_shifts_history_command", { payload });
}

//promotion
export async function calculateCart(payload: { items: CartItemRequest[] }) {
  return invoke<CartResponse>("calculate_cart", { payload });
}

// CRUD Promotion
export async function listPromotions(): Promise<PromoDetailResponse[]> {
  return invoke("list_promotions");
}

export async function createPromotion(payload: PromoPayload): Promise<number> {
  return invoke("create_promotion", { payload });
}

export async function updatePromotion(id: number, payload: PromoPayload): Promise<void> {
  return invoke("update_promotion", { id, payload });
}

export async function deletePromotion(id: number): Promise<void> {
  return invoke("delete_promotion", { id });
}
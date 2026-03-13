import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface MenuItem {
    id: bigint;
    categoryId: bigint;
    stockQuantity: bigint;
    name: string;
    isAvailable: boolean;
    description: string;
    price: number;
}
export interface TopSellingItem {
    name: string;
    totalQuantitySold: bigint;
}
export interface OrderItem {
    itemName: string;
    quantity: bigint;
    unitPrice: number;
    menuItemId: bigint;
}
export interface OrderEntry {
    id: bigint;
    status: OrderStatus;
    paymentMethod: PaymentMethod;
    createdAt: bigint;
    totalAmount: number;
    notes: string;
    items: Array<OrderItem>;
    orderNumber: bigint;
    createdBy: string;
}
export interface UserProfile {
    name: string;
}
export interface UserAccount {
    email: string;
    name: string;
    phone: string;
    passwordHash: string;
    principalId: string;
}
export interface AccountInfo {
    email: string;
    name: string;
    phone: string;
    principalId: string;
    role: StaffRole;
}
export interface Category {
    id: bigint;
    name: string;
}
export interface CafeSettings {
    name: string;
    address: string;
    phone: string;
}
export enum OrderStatus {
    inprogress = "inprogress",
    pending = "pending",
    done = "done",
    paid = "paid"
}
export enum PaymentMethod {
    card = "card",
    cash = "cash"
}
export enum StaffRole {
    admin = "admin",
    cashier = "cashier",
    kitchenStaff = "kitchenStaff"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    // Authorization
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    getCallerUserRole(): Promise<UserRole>;
    isCallerAdmin(): Promise<boolean>;

    // Account management
    hasAdminAccount(): Promise<boolean>;
    registerAccount(email: string, name: string, phone: string, passwordHash: string, principalId: string): Promise<string>;
    adminCreateStaffAccount(email: string, name: string, phone: string, passwordHash: string, role: StaffRole): Promise<string>;
    adminDeleteAccount(email: string): Promise<void>;
    verifyCredentials(email: string, passwordHash: string): Promise<boolean>;
    getAccountRole(email: string): Promise<StaffRole | null>;
    adminResetPassword(email: string, newPasswordHash: string): Promise<void>;
    getAllAccounts(): Promise<Array<AccountInfo>>;

    // Profile
    getCallerUserProfile(): Promise<UserProfile | null>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;

    // Categories
    createCategory(name: string): Promise<bigint>;
    updateCategory(categoryId: bigint, name: string): Promise<void>;
    deleteCategory(categoryId: bigint): Promise<void>;
    getAllCategories(): Promise<Array<Category>>;

    // Menu items
    createMenuItem(name: string, categoryId: bigint, price: number, description: string): Promise<bigint>;
    updateMenuItem(menuItem: MenuItem): Promise<void>;
    deleteMenuItem(menuItemId: bigint): Promise<void>;
    toggleMenuItemAvailability(menuItemId: bigint): Promise<void>;
    getAllMenuItems(): Promise<Array<MenuItem>>;
    getMenuItemsByCategory(categoryId: bigint): Promise<Array<MenuItem>>;

    // Orders
    createOrder(items: Array<OrderItem>, paymentMethod: PaymentMethod, notes: string, createdByEmail: string): Promise<bigint>;
    updateOrderStatus(orderId: bigint, status: OrderStatus): Promise<void>;
    updateOrderPaymentMethod(orderId: bigint, paymentMethod: PaymentMethod): Promise<void>;
    updateOrderNotes(orderId: bigint, notes: string): Promise<void>;
    getOrder(orderId: bigint): Promise<OrderEntry | null>;
    getOrdersByStatus(status: OrderStatus): Promise<Array<OrderEntry>>;
    getOrdersInTimeRange(startTime: bigint, endTime: bigint): Promise<Array<OrderEntry>>;
    getAllOrders(): Promise<Array<OrderEntry>>;
    getOrdersByCreator(createdByEmail: string): Promise<Array<OrderEntry>>;

    // Reports
    getTotalRevenueInTimeRange(startTime: bigint, endTime: bigint): Promise<number>;
    getTopSellingItems(startTime: bigint, endTime: bigint, limit: bigint): Promise<Array<TopSellingItem>>;

    // Cafe Settings
    getCafeSettings(): Promise<CafeSettings>;
    setCafeSettings(settings: CafeSettings): Promise<void>;
}

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
}
export interface Category {
    id: bigint;
    name: string;
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
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createCategory(name: string): Promise<bigint>;
    createMenuItem(name: string, categoryId: bigint, price: number, description: string): Promise<bigint>;
    createOrder(items: Array<OrderItem>, paymentMethod: PaymentMethod, notes: string): Promise<bigint>;
    deleteCategory(categoryId: bigint): Promise<void>;
    deleteMenuItem(menuItemId: bigint): Promise<void>;
    getAllCategories(): Promise<Array<Category>>;
    getAllMenuItems(): Promise<Array<MenuItem>>;
    getAllOrders(): Promise<Array<OrderEntry>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getMenuItemsByCategory(categoryId: bigint): Promise<Array<MenuItem>>;
    getOrdersByStatus(status: OrderStatus): Promise<Array<OrderEntry>>;
    getOrdersInTimeRange(startTime: bigint, endTime: bigint): Promise<Array<OrderEntry>>;
    getTopSellingItems(startTime: bigint, endTime: bigint, limit: bigint): Promise<Array<TopSellingItem>>;
    getTotalRevenueInTimeRange(startTime: bigint, endTime: bigint): Promise<number>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    toggleMenuItemAvailability(menuItemId: bigint): Promise<void>;
    updateCategory(categoryId: bigint, name: string): Promise<void>;
    updateMenuItem(menuItem: MenuItem): Promise<void>;
    updateOrderNotes(orderId: bigint, notes: string): Promise<void>;
    updateOrderStatus(orderId: bigint, status: OrderStatus): Promise<void>;
    // Email/Password Auth
    registerAccount(email: string, name: string, phone: string, passwordHash: string, principalId: string): Promise<string>;
    verifyCredentials(email: string, passwordHash: string): Promise<boolean>;
    adminResetPassword(email: string, newPasswordHash: string): Promise<void>;
    getAllAccounts(): Promise<Array<AccountInfo>>;
}

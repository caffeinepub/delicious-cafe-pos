import Map "mo:core/Map";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Time "mo:core/Time";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Runtime "mo:core/Runtime";
import Order "mo:core/Order";
import Int "mo:core/Int";
import Float "mo:core/Float";
import Principal "mo:core/Principal";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  module Category {
    public func compareById(cat1 : Category, cat2 : Category) : Order.Order {
      Nat.compare(cat1.id, cat2.id);
    };
  };

  module MenuItem {
    public func compareByPrice(item1 : MenuItem, item2 : MenuItem) : Order.Order {
      Float.compare(item1.price, item2.price);
    };
  };

  module OrderEntry {
    public func compareByCreatedAt(o1 : OrderEntry, o2 : OrderEntry) : Order.Order {
      Int.compare(o1.createdAt, o2.createdAt);
    };
  };

  public type UserProfile = {
    name : Text;
  };

  public type UserAccount = {
    email : Text;
    name : Text;
    phone : Text;
    passwordHash : Text;
    principalId : Text;
  };

  public type AccountInfo = {
    email : Text;
    name : Text;
    phone : Text;
    principalId : Text;
  };

  public type Category = {
    id : Nat;
    name : Text;
  };

  public type MenuItem = {
    id : Nat;
    name : Text;
    categoryId : Nat;
    price : Float;
    description : Text;
    isAvailable : Bool;
    stockQuantity : Nat;
  };

  public type OrderItem = {
    menuItemId : Nat;
    itemName : Text;
    quantity : Nat;
    unitPrice : Float;
  };

  public type OrderStatus = {
    #pending;
    #inprogress;
    #done;
    #paid;
  };

  public type PaymentMethod = {
    #cash;
    #card;
  };

  public type OrderEntry = {
    id : Nat;
    orderNumber : Nat;
    items : [OrderItem];
    totalAmount : Float;
    status : OrderStatus;
    paymentMethod : PaymentMethod;
    notes : Text;
    createdAt : Int;
  };

  public type TopSellingItem = {
    name : Text;
    totalQuantitySold : Nat;
  };

  public type CafeSettings = {
    name : Text;
    address : Text;
    phone : Text;
  };

  var nextMenuItemId = 1;
  var nextOrderId = 1;
  var nextCategoryId = 1;

  let categories = Map.empty<Nat, Category>();
  let menuItems = Map.empty<Nat, MenuItem>();
  let orders = Map.empty<Nat, OrderEntry>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  let userAccounts = Map.empty<Text, UserAccount>();

  var cafeSettings : CafeSettings = {
    name = "Delicious Cafe";
    address = "";
    phone = "";
  };

  // ---- Cafe Settings ----

  public query (_) func getCafeSettings() : async CafeSettings {
    cafeSettings;
  };

  public shared ({ caller }) func setCafeSettings(settings : CafeSettings) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update cafe settings");
    };
    cafeSettings := settings;
  };

  // ---- Email/Password Account Management ----

  public shared (_) func registerAccount(email : Text, name : Text, phone : Text, passwordHash : Text, principalId : Text) : async Text {
    switch (userAccounts.get(email)) {
      case (?_) { return "Email already registered" };
      case (null) {
        let account : UserAccount = {
          email;
          name;
          phone;
          passwordHash;
          principalId;
        };
        userAccounts.add(email, account);
        return "";
      };
    };
  };

  public query (_) func verifyCredentials(email : Text, passwordHash : Text) : async Bool {
    switch (userAccounts.get(email)) {
      case (null) { false };
      case (?account) { account.passwordHash == passwordHash };
    };
  };

  public shared ({ caller }) func adminResetPassword(email : Text, newPasswordHash : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can reset passwords");
    };
    switch (userAccounts.get(email)) {
      case (null) { Runtime.trap("Account not found") };
      case (?account) {
        let updated : UserAccount = {
          account with
          passwordHash = newPasswordHash;
        };
        userAccounts.add(email, updated);
      };
    };
  };

  public query ({ caller }) func getAllAccounts() : async [AccountInfo] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view accounts");
    };
    userAccounts.values().toArray().map(
      func(a : UserAccount) : AccountInfo {
        { email = a.email; name = a.name; phone = a.phone; principalId = a.principalId }
      }
    );
  };

  // ---- User Profile Management ----

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // ---- Category Management (Admin Only) ----

  public shared ({ caller }) func createCategory(name : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can create categories");
    };
    let category : Category = { id = nextCategoryId; name };
    categories.add(nextCategoryId, category);
    nextCategoryId += 1;
    category.id;
  };

  public shared ({ caller }) func updateCategory(categoryId : Nat, name : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update categories");
    };
    switch (categories.get(categoryId)) {
      case (null) { Runtime.trap("Category not found") };
      case (?_) {
        categories.add(categoryId, { id = categoryId; name });
      };
    };
  };

  public shared ({ caller }) func deleteCategory(categoryId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete categories");
    };
    switch (categories.get(categoryId)) {
      case (null) { Runtime.trap("Category not found") };
      case (_) { categories.remove(categoryId) };
    };
  };

  public query (_) func getAllCategories() : async [Category] {
    categories.values().toArray().sort(Category.compareById);
  };

  // ---- Menu Item Management (Admin Only) ----

  public shared ({ caller }) func createMenuItem(name : Text, categoryId : Nat, price : Float, description : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can create menu items");
    };
    let menuItem : MenuItem = {
      id = nextMenuItemId;
      name;
      categoryId;
      price;
      description;
      isAvailable = true;
      stockQuantity = 0;
    };
    menuItems.add(nextMenuItemId, menuItem);
    nextMenuItemId += 1;
    menuItem.id;
  };

  public shared ({ caller }) func updateMenuItem(menuItem : MenuItem) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update menu items");
    };
    switch (menuItems.get(menuItem.id)) {
      case (null) { Runtime.trap("Menu item not found") };
      case (_) { menuItems.add(menuItem.id, menuItem) };
    };
  };

  public shared ({ caller }) func deleteMenuItem(menuItemId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete menu items");
    };
    switch (menuItems.get(menuItemId)) {
      case (null) { Runtime.trap("Menu item not found") };
      case (_) { menuItems.remove(menuItemId) };
    };
  };

  public shared ({ caller }) func toggleMenuItemAvailability(menuItemId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update menu item availability");
    };
    switch (menuItems.get(menuItemId)) {
      case (null) { Runtime.trap("Menu item not found") };
      case (?menuItem) {
        menuItems.add(menuItemId, { menuItem with isAvailable = not menuItem.isAvailable });
      };
    };
  };

  public query (_) func getAllMenuItems() : async [MenuItem] {
    menuItems.values().toArray().sort(MenuItem.compareByPrice);
  };

  public query (_) func getMenuItemsByCategory(categoryId : Nat) : async [MenuItem] {
    menuItems.values().toArray().filter(func(item) { item.categoryId == categoryId });
  };

  // ---- Order Management ----

  public shared ({ caller }) func createOrder(items : [OrderItem], paymentMethod : PaymentMethod, notes : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create orders");
    };
    let totalAmount : Float = items.foldLeft(
      0.0,
      func(total, item) { total + (item.unitPrice * item.quantity.toFloat()) },
    );
    let order : OrderEntry = {
      id = nextOrderId;
      orderNumber = nextOrderId;
      items;
      totalAmount;
      status = #pending;
      paymentMethod;
      notes;
      createdAt = Time.now();
    };
    orders.add(nextOrderId, order);
    updateStockForOrderItems(items);
    nextOrderId += 1;
    order.id;
  };

  func updateStockForOrderItems(items : [OrderItem]) {
    for (item in items.values()) {
      switch (menuItems.get(item.menuItemId)) {
        case (null) { Runtime.trap("Menu item not found") };
        case (?menuItem) {
          if (menuItem.stockQuantity < item.quantity) {
            Runtime.trap("Insufficient stock for item: " # menuItem.name);
          };
          menuItems.add(item.menuItemId, { menuItem with stockQuantity = menuItem.stockQuantity - item.quantity });
        };
      };
    };
  };

  public shared ({ caller }) func updateOrderStatus(orderId : Nat, status : OrderStatus) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update order status");
    };
    switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order not found") };
      case (?order) { orders.add(orderId, { order with status }) };
    };
  };

  public shared ({ caller }) func updateOrderPaymentMethod(orderId : Nat, paymentMethod : PaymentMethod) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update orders");
    };
    switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order not found") };
      case (?order) { orders.add(orderId, { order with paymentMethod }) };
    };
  };

  public shared ({ caller }) func updateOrderNotes(orderId : Nat, notes : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update order notes");
    };
    switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order not found") };
      case (?order) { orders.add(orderId, { order with notes }) };
    };
  };

  public query ({ caller }) func getOrder(orderId : Nat) : async ?OrderEntry {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view orders");
    };
    orders.get(orderId);
  };

  public query ({ caller }) func getOrdersByStatus(status : OrderStatus) : async [OrderEntry] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view orders");
    };
    orders.values().toArray().filter(func(order) { order.status == status });
  };

  public query ({ caller }) func getOrdersInTimeRange(startTime : Int, endTime : Int) : async [OrderEntry] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view orders in time range");
    };
    orders.values().toArray().filter(
      func(order) { order.createdAt >= startTime and order.createdAt <= endTime }
    );
  };

  public query ({ caller }) func getAllOrders() : async [OrderEntry] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view orders");
    };
    orders.values().toArray().sort(OrderEntry.compareByCreatedAt);
  };

  // ---- Reports (Admin Only) ----

  public query ({ caller }) func getTotalRevenueInTimeRange(startTime : Int, endTime : Int) : async Float {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view revenue reports");
    };
    let ordersInRange = orders.values().toArray().filter(
      func(order) { order.createdAt >= startTime and order.createdAt <= endTime and order.status == #paid }
    );
    ordersInRange.foldLeft(0.0, func(total, order) { total + order.totalAmount });
  };

  public query ({ caller }) func getTopSellingItems(startTime : Int, endTime : Int, limit : Nat) : async [TopSellingItem] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view top selling items");
    };
    let ordersInRange = orders.values().toArray().filter(
      func(order) { order.createdAt >= startTime and order.createdAt <= endTime }
    );
    let itemSales = Map.empty<Text, Nat>();
    for (order in ordersInRange.values()) {
      for (item in order.items.values()) {
        let currentQty = switch (itemSales.get(item.itemName)) {
          case (null) { 0 };
          case (?qty) { qty };
        };
        itemSales.add(item.itemName, currentQty + item.quantity);
      };
    };
    let salesArray = itemSales.entries().toArray().map(
      func((name, qty) : (Text, Nat)) : TopSellingItem { { name; totalQuantitySold = qty } }
    );
    let sorted = salesArray.sort(
      func(a : TopSellingItem, b : TopSellingItem) : Order.Order {
        Nat.compare(b.totalQuantitySold, a.totalQuantitySold)
      }
    );
    let resultSize = if (sorted.size() < limit) { sorted.size() } else { limit };
    Array.tabulate<TopSellingItem>(resultSize, func(i) { sorted[i] });
  };
};

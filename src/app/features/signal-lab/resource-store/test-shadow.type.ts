// Declare branding symbols
declare const USER_ID: unique symbol; // declare avoid to instantiate the symbol
declare const ORDER_ID: unique symbol;

// Create shadow types
type UserId = string & { [USER_ID]: void };
type OrderId = string & { [ORDER_ID]: void };

// Helper functions to construct values
function createUserId(id: string): UserId {
  return id as UserId;
}

function createOrderId(id: string): OrderId {
  return id as OrderId;
}

// Usage
const uid: UserId = createUserId('abc');
const oid: OrderId = createOrderId('abc');

// Branded-only type that refuses raw strings
type EnforceUserId<T> = T extends UserId
  ? T
  : ['❌ Invalid type. Use createUserId(...) to construct a valid UserId.', T];

// Function that enforces it
function getUserById<T>(id: EnforceUserId<T>) {
  // ...
}

// Type error if you pass OrderId into a UserId function
getUserById(uid); // ✅ OK
getUserById(oid); // ❌ Error: Argument of type 'OrderId' is not assignable to parameter of type 'UserId'

/**
 * Empirical Unit & Integration Test for History & Discord Services
 */

const assert = require("assert");

// Mock browser globals
global.window = {};
global.localStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; }
};

// Load Store
const Store = require("../js/core/Store.js");
const store = new Store();

// Load Services
const HistoryService = require("../js/services/HistoryService.js");
const CheckoutService = require("../js/services/CheckoutService.js");
const DiscordServiceModalComponent = require("../js/components/DiscordServiceModal.js");

console.log("🧪 1. Testing Discord Boost Calculator & Quests Engine...");
const discordComp = new DiscordServiceModalComponent(store);

// Boost Level 1 (2 boosts)
discordComp.activeTab = "boost";
discordComp.boostCount = 2;
discordComp.boostDuration = 1;
assert.strictEqual(discordComp.calculatePrice(), 49, "Level 1 (1M) should be 49 THB");

discordComp.boostDuration = 3;
assert.strictEqual(discordComp.calculatePrice(), 129, "Level 1 (3M) should be 129 THB");

// Boost Level 3 (14 boosts)
discordComp.boostCount = 14;
discordComp.boostDuration = 1;
assert.strictEqual(discordComp.calculatePrice(), 299, "Level 3 (1M) should be 299 THB");

discordComp.boostDuration = 3;
assert.strictEqual(discordComp.calculatePrice(), 799, "Level 3 (3M) should be 799 THB");

// Add Boost to cart
discordComp.inviteLink = "https://discord.gg/test-community";
const cartItem = discordComp.addToCart();
assert.strictEqual(cartItem.price, 799);
assert.strictEqual(store.get("cart").length, 1);
console.log("   ✅ Discord Boost calculation & Cart addition verified!");

// Quest tests
console.log("🧪 2. Testing Nitro Quests Engine...");
discordComp.activeTab = "quest";
discordComp.questType = "bundle";
discordComp.discordTag = "tester#1234";
assert.strictEqual(discordComp.calculatePrice(), 69, "Quest Bundle should be 69 THB");

const questItem = discordComp.addToCart();
assert.strictEqual(questItem.price, 69);
assert.strictEqual(store.get("cart").length, 2);
console.log("   ✅ Nitro Quests calculation & Cart addition verified!");

// Test History Service
console.log("🧪 3. Testing History Service & LocalStorage Order Vault...");
const historyService = new HistoryService(store);

// Seed local orders
const sampleOrders = [
  {
    orderId: "WX-998811",
    totalAmount: 350.00,
    timestamp: new Date().toISOString(),
    paymentMethod: "promptpay",
    status: "PAID",
    items: [
      {
        id: "nitro-1m",
        title: "Discord Nitro 1 Month",
        quantity: 1,
        credentials: ["NITRO-TEST-KEY-XXXXX-YYYYY"]
      }
    ]
  }
];
global.localStorage.setItem("wichx_orders", JSON.stringify(sampleOrders));

(async () => {
  const loadedOrders = await historyService.getOrderHistory();
  assert.strictEqual(loadedOrders.length, 1);
  assert.strictEqual(loadedOrders[0].orderId, "WX-998811");
  assert.strictEqual(loadedOrders[0].items[0].credentials[0], "NITRO-TEST-KEY-XXXXX-YYYYY");
  console.log("   ✅ HistoryService successfully retrieved and parsed past keys!");

  console.log("\n🎯 ALL EMPIRICAL VERIFICATIONS PASSED 100%!");
})();

// Test the unit display logic (drinks vs food)
const { isDrinkProduct } = require('./src/utils/portionCalculator');

console.log('🧪 TESTING UNIT DISPLAY LOGIC\n');

// Test cases
const testProducts = [
  {
    product_name: "Coca-Cola",
    categories: "sodas,soft-drinks,beverages",
    expected: true,
    expectedUnit: "ml"
  },
  {
    product_name: "Orange Juice",
    categories: "fruit-juices,beverages,drinks",
    expected: true,
    expectedUnit: "ml"
  },
  {
    product_name: "Milk",
    categories: "dairy-drinks,milk,beverages",
    expected: true,
    expectedUnit: "ml"
  },
  {
    product_name: "Bread",
    categories: "bread,bakery-products,food",
    expected: false,
    expectedUnit: "g"
  },
  {
    product_name: "Chocolate Bar",
    categories: "chocolate,confectionery,snacks",
    expected: false,
    expectedUnit: "g"
  },
  {
    product_name: "Yogurt",
    categories: "yogurt,dairy,fermented-foods",
    expected: false,
    expectedUnit: "g"
  },
  {
    product_name: "Energy Drink",
    categories: "energy-drinks,beverages,drinks",
    expected: true,
    expectedUnit: "ml"
  },
  {
    product_name: "Cereal",
    categories: "breakfast-cereals,cereals,food",
    expected: false,
    expectedUnit: "g"
  }
];

let passed = 0;
let failed = 0;

testProducts.forEach((test, index) => {
  console.log(`\n--- Test ${index + 1}: ${test.product_name} ---`);
  const result = isDrinkProduct(test);
  const unit = result ? "ml" : "g";
  
  if (result === test.expected) {
    console.log(`✅ PASS: Detected as ${result ? 'DRINK' : 'FOOD'} - Unit: ${unit}`);
    passed++;
  } else {
    console.log(`❌ FAIL: Expected ${test.expected ? 'DRINK' : 'FOOD'}, got ${result ? 'DRINK' : 'FOOD'} - Unit: ${unit}`);
    failed++;
  }
});

console.log(`\n📊 RESULTS: ${passed} passed, ${failed} failed out of ${testProducts.length} tests`);

if (failed === 0) {
  console.log('🎉 All tests passed! Unit display logic is working correctly.');
} else {
  console.log('⚠️  Some tests failed. Check the logic above.');
}

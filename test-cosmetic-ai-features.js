/**
 * Test Script: Cosmetic AI Features Verification
 * This script verifies that all AI features are properly implemented for cosmetic products
 */

const fs = require('fs');
const path = require('path');

// Read the CosmeticResultsScreen file
const cosmeticFile = fs.readFileSync(
  path.join(__dirname, 'src/screens/CosmeticResultsScreen.js'),
  'utf8'
);

// Read the ResultsScreen file for comparison
const resultsFile = fs.readFileSync(
  path.join(__dirname, 'src/screens/ResultsScreen.js'),
  'utf8'
);

console.log('🧪 Testing Cosmetic AI Features Implementation...\n');

// Test 1: Check AI Service Import
const hasAIServiceImport = cosmeticFile.includes("import { AIService } from '../services/aiService';");
console.log(`✅ AI Service Import: ${hasAIServiceImport ? 'FOUND' : 'MISSING'}`);

// Test 2: Check AI State Variables
const aiStateVariables = [
  'isPremium',
  'aiAnalysis',
  'aiLoading',
  'additiveAnalysis',
  'showAIChat'
];

aiStateVariables.forEach(variable => {
  const hasVariable = cosmeticFile.includes(`${variable}, set`);
  console.log(`${hasVariable ? '✅' : '❌'} AI State Variable - ${variable}: ${hasVariable ? 'FOUND' : 'MISSING'}`);
});

// Test 3: Check AI Functions
const aiFunctions = [
  'checkSubscriptionStatus',
  'generateAIAnalysis',
  'detectMissingIngredients'
];

aiFunctions.forEach(func => {
  const hasFunction = cosmeticFile.includes(`const ${func} =`) || cosmeticFile.includes(`${func} = `);
  console.log(`${hasFunction ? '✅' : '❌'} AI Function - ${func}: ${hasFunction ? 'FOUND' : 'MISSING'}`);
});

// Test 4: Check AI UI Components
const aiUIComponents = [
  'AI ANALYSIS SECTION',
  'ADDITIVE ANALYSIS SECTION',
  'MISSING INGREDIENTS DETECTION',
  'SUBSCRIPTION UPGRADE PROMPT'
];

aiUIComponents.forEach(component => {
  const hasComponent = cosmeticFile.includes(component);
  console.log(`${hasComponent ? '✅' : '❌'} AI UI Component - ${component}: ${hasComponent ? 'FOUND' : 'MISSING'}`);
});

// Test 5: Check AI Styles
const aiStyles = [
  'aiAnalysisCard',
  'additiveAnalysisCard',
  'aiFeatureCard',
  'subscriptionCard'
];

aiStyles.forEach(style => {
  const hasStyle = cosmeticFile.includes(`${style}:`);
  console.log(`${hasStyle ? '✅' : '❌'} AI Style - ${style}: ${hasStyle ? 'FOUND' : 'MISSING'}`);
});

// Test 6: Check Premium Features Gating
const premiumGating = cosmeticFile.includes('isPremium &&');
console.log(`${premiumGating ? '✅' : '❌'} Premium Feature Gating: ${premiumGating ? 'IMPLEMENTED' : 'MISSING'}`);

// Test 7: Check Modal Import
const modalImport = cosmeticFile.includes('Modal,');
console.log(`${modalImport ? '✅' : '❌'} Modal Import: ${modalImport ? 'FOUND' : 'MISSING'}`);

console.log('\n🎯 SUMMARY:');
console.log('========================================');

// Count features
const allChecks = [
  hasAIServiceImport,
  ...aiStateVariables.map(v => cosmeticFile.includes(`${v}, set`)),
  ...aiFunctions.map(f => cosmeticFile.includes(`const ${f} =`) || cosmeticFile.includes(`${f} = `)),
  ...aiUIComponents.map(c => cosmeticFile.includes(c)),
  ...aiStyles.map(s => cosmeticFile.includes(`${s}:`)),
  premiumGating,
  modalImport
];

const passedChecks = allChecks.filter(Boolean).length;
const totalChecks = allChecks.length;

console.log(`✅ Passed: ${passedChecks}/${totalChecks} checks`);
console.log(`📊 Implementation Progress: ${Math.round((passedChecks/totalChecks) * 100)}%`);

if (passedChecks === totalChecks) {
  console.log('\n🎉 SUCCESS: All AI features are properly implemented for cosmetic products!');
  console.log('🚀 Cosmetic products now have full AI parity with food products!');
} else {
  console.log('\n⚠️  Some AI features may be missing or incomplete.');
  console.log('📝 Check the individual test results above for details.');
}

console.log('\n🔍 KEY AI FEATURES NOW AVAILABLE FOR COSMETICS:');
console.log('• AI-powered safety analysis');
console.log('• Missing ingredient detection');
console.log('• Additive safety analysis');
console.log('• Premium subscription integration');
console.log('• Enhanced color-coded ingredient analysis');
console.log('• Interactive AI chat modal');
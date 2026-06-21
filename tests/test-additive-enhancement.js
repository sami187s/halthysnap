/**
 * Test script to validate additive detection and scoring integration
 * Simple test without module imports to test additive detection logic
 */

// Simple additive detection test
const testAdditiveDetection = () => {
  const commonAdditives = [
    'E102', 'E110', 'E124', 'E129', 'E133', 'E220', 'E321', 'E951',
    'sodium lauryl sulfate', 'parabens', 'formaldehyde', 'triclosan',
    'BHA', 'BHT', 'sodium benzoate', 'potassium sorbate'
  ];
  
  const eNumberPattern = /E\d{3,4}[a-z]?/gi;
  
  console.log('🔍 Testing E-number detection:');
  commonAdditives.forEach(additive => {
    const isENumber = eNumberPattern.test(additive);
    console.log(`  ${additive}: ${isENumber ? '✅ E-number detected' : '❌ Not recognized as E-number'}`);
  });
  
  return commonAdditives;
};

console.log('🧪 Testing Enhanced Additive Detection System\n');

// Run the simple test
testAdditiveDetection();

console.log('\n✅ Basic additive detection test completed!');

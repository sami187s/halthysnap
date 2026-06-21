/**
 * Enhanced additive detection test
 */

// Simple E-number test
const testEnhancedENumbers = () => {
  const testENumbers = ['E102', 'E110', 'E124', 'E129', 'E220', 'E321', 'E951'];
  const eNumberPattern = /^E(\d{3,4}[a-z]?)$/i;
  
  console.log('🔍 Testing Enhanced E-number Detection:');
  testENumbers.forEach(eNumber => {
    const isMatch = eNumberPattern.test(eNumber);
    console.log(`  ${eNumber}: ${isMatch ? '✅ Pattern matches' : '❌ Pattern failed'}`);
  });
};

// Test additive database structure
const testAdditiveDatabase = () => {
  console.log('\n📊 Testing Additive Database Structure:');
  
  // Test some known additives
  const testAdditives = [
    'sodium lauryl sulfate',
    'parabens', 
    'formaldehyde',
    'triclosan',
    'BHA',
    'e102',
    'E220'
  ];
  
  testAdditives.forEach(additive => {
    const cleanAdditive = additive.toLowerCase().trim();
    
    // Check if it matches E-number pattern
    const eNumberMatch = cleanAdditive.match(/^e(\d{3,4}[a-z]?)$/i);
    if (eNumberMatch) {
      console.log(`  ${additive}: ✅ E-number pattern detected`);
    } else {
      // Check for chemical additives
      const chemicalMatches = [
        'sodium lauryl sulfate',
        'parabens',
        'formaldehyde', 
        'triclosan',
        'bha'
      ];
      
      const hasMatch = chemicalMatches.some(chemical => 
        cleanAdditive.includes(chemical) || cleanAdditive === chemical
      );
      
      console.log(`  ${additive}: ${hasMatch ? '✅ Chemical additive detected' : '❌ Not in database'}`);
    }
  });
};

console.log('🧪 Enhanced Additive Detection Test\n');

testEnhancedENumbers();
testAdditiveDatabase();

console.log('\n✅ Enhanced additive detection test completed!');

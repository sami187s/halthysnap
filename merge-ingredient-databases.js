const fs = require('fs');

// Load current professional database
const currentDB = JSON.parse(fs.readFileSync('src/data/professional_database.json', 'utf8'));

// Function to merge ChatGPT ingredients with current database
function mergeIngredientDatabases() {
    console.log('🔄 Starting ingredient database merger...\n');
    
    // Check if ChatGPT file exists
    const chatgptFiles = [
        'chatgpt_ingredients_batch1.json',
        'chatgpt_ingredients_batch2.json',
        'chatgpt_ingredients_batch3.json',
        'chatgpt_ingredients_batch4.json',
        'chatgpt_ingredients_batch5.json'
    ];
    
    let totalAdded = 0;
    let duplicatesSkipped = 0;
    
    // Start with current professional database
    const mergedDB = { ...currentDB };
    
    // Count current ingredients from both cosmetic and food sections
    const currentCosmeticCount = Object.keys(currentDB.cosmetic.ingredients || {}).length;
    const currentFoodCount = Object.keys(currentDB.food.ingredients || {}).length;
    const totalCurrentIngredients = currentCosmeticCount + currentFoodCount;
    
    console.log(`📊 Starting with ${totalCurrentIngredients} professional ingredients`);
    
    chatgptFiles.forEach((filename, index) => {
        if (fs.existsSync(filename)) {
            console.log(`📁 Processing ${filename}...`);
            
            try {
                const chatgptData = JSON.parse(fs.readFileSync(filename, 'utf8'));
                let batchAdded = 0;
                let batchSkipped = 0;
                
                // Process each ingredient from ChatGPT
                chatgptData.ingredients.forEach(ingredient => {
                    const key = ingredient.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
                    
                    // Determine category
                    const category = ingredient.category === 'food' ? 'food' : 'cosmetic';
                    
                    // Initialize category if it doesn't exist
                    if (!mergedDB[category]) {
                        mergedDB[category] = { ingredients: {} };
                    }
                    if (!mergedDB[category].ingredients) {
                        mergedDB[category].ingredients = {};
                    }
                    
                    // Check for duplicates in both cosmetic and food sections
                    const existsInCosmetic = mergedDB.cosmetic?.ingredients?.[key];
                    const existsInFood = mergedDB.food?.ingredients?.[key];
                    
                    if (existsInCosmetic || existsInFood) {
                        batchSkipped++;
                        duplicatesSkipped++;
                        console.log(`   ⚠️  Skipped duplicate: ${ingredient.name}`);
                        return;
                    }
                    
                    // Add new ingredient to the appropriate category
                    mergedDB[category].ingredients[key] = {
                        name: ingredient.name,
                        inci_name: ingredient.inci_name || ingredient.name,
                        cas_number: ingredient.cas_number || 'N/A',
                        safety_score: ingredient.safety_score || 50,
                        function: ingredient.function || 'No description available',
                        pregnancy_safe: ingredient.pregnancy_safe !== false,
                        common_names: ingredient.common_names || [ingredient.name],
                        concentration_limit: ingredient.concentration_limit || 'Not specified',
                        ph_stability: ingredient.ph_stability || 'Not specified',
                        evidence_quality: ingredient.evidence_quality || 'medium',
                        source: 'chatgpt_expansion'
                    };
                    
                    batchAdded++;
                    totalAdded++;
                });
                
                console.log(`   ✅ Added ${batchAdded} new ingredients`);
                console.log(`   ⚠️  Skipped ${batchSkipped} duplicates\n`);
                
            } catch (error) {
                console.log(`   ❌ Error processing ${filename}: ${error.message}\n`);
            }
        } else {
            console.log(`   📂 ${filename} not found - skipping\n`);
        }
    });
    
    // Save merged database
    fs.writeFileSync('src/data/professional_database.json', JSON.stringify(mergedDB, null, 2));
    
    // Generate summary
    const finalCosmeticCount = Object.keys(mergedDB.cosmetic?.ingredients || {}).length;
    const finalFoodCount = Object.keys(mergedDB.food?.ingredients || {}).length;
    const finalCount = finalCosmeticCount + finalFoodCount;
    
    // Update metadata
    mergedDB.metadata = {
        ...mergedDB.metadata,
        integrated: new Date().toISOString(),
        cosmetic_count: finalCosmeticCount,
        food_count: finalFoodCount,
        total_coverage: finalCount
    };
    
    // Save updated database with metadata
    fs.writeFileSync('src/data/professional_database.json', JSON.stringify(mergedDB, null, 2));
    
    console.log('🎉 MERGE COMPLETE!\n');
    console.log('📊 FINAL STATISTICS:');
    console.log(`   📈 Original ingredients: ${totalCurrentIngredients}`);
    console.log(`   ➕ New ingredients added: ${totalAdded}`);
    console.log(`   ⚠️  Duplicates skipped: ${duplicatesSkipped}`);
    console.log(`   🏆 Total ingredients: ${finalCount}`);
    console.log(`   📊 Growth: ${Math.round(((finalCount - totalCurrentIngredients) / totalCurrentIngredients) * 100)}%\n`);
    
    console.log('📋 BREAKDOWN BY CATEGORY:');
    console.log(`   🧴 Cosmetic ingredients: ${finalCosmeticCount}`);
    console.log(`   🍎 Food ingredients: ${finalFoodCount}`);
    
    console.log('\n✅ Updated database saved to: src/data/professional_database.json');
    console.log('🚀 Your app now recognizes WAY more ingredients!');
}

// Run the merger
mergeIngredientDatabases();

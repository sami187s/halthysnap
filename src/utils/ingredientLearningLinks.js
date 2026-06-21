// Ingredient Learning Link Generator
// Provides educational resources for unknown ingredients

export const generateIngredientLearningLink = (ingredientName, productType = 'cosmetic') => {
  if (!ingredientName || typeof ingredientName !== 'string') {
    return null;
  }
  
  const cleanName = ingredientName.trim();
  const encodedName = encodeURIComponent(cleanName);
  
  // Generate multiple learning resources
  const learningResources = {
    // Primary resource - Paula's Choice (cosmetics) or FDA (food)
    primary: productType === 'food' ? 
      `https://www.fda.gov/food/food-additives-petitions/search?search=${encodedName}` :
      `https://www.paulaschoice.com/ingredient-dictionary/search?q=${encodedName}`,
    
    // Secondary resources
    cosmetics_info: `https://cosmeticsinfo.org/search?q=${encodedName}`,
    ewg_skin_deep: `https://www.ewg.org/skindeep/search/?q=${encodedName}`,
    inci_decoder: `https://incidecoder.com/search?q=${encodedName}`,
    
    // Scientific resources
    pubchem: `https://pubchem.ncbi.nlm.nih.gov/#query=${encodedName}`,
    chemspider: `https://www.chemspider.com/Search.aspx?q=${encodedName}`,
    
    // General search
    google_scholar: `https://scholar.google.com/scholar?q="${encodedName}"+safety+cosmetic`,
    wikipedia: `https://en.wikipedia.org/wiki/Special:Search?search=${encodedName}`,
    
    // Mobile-friendly formatted links for display
    display_links: [
      {
        title: productType === 'food' ? 'FDA Food Database' : 'Paula\'s Choice Dictionary',
        url: productType === 'food' ? 
          `https://www.fda.gov/food/food-additives-petitions/search?search=${encodedName}` :
          `https://www.paulaschoice.com/ingredient-dictionary/search?q=${encodedName}`,
        description: 'Official ingredient information and safety data',
        reliability: 'high'
      },
      {
        title: 'EWG Skin Deep Database',
        url: `https://www.ewg.org/skindeep/search/?q=${encodedName}`,
        description: 'Environmental health and safety ratings',
        reliability: 'medium'
      },
      {
        title: 'INCIDecoder',
        url: `https://incidecoder.com/search?q=${encodedName}`,
        description: 'User-friendly ingredient explanations',
        reliability: 'medium'
      },
      {
        title: 'PubChem Scientific Database',
        url: `https://pubchem.ncbi.nlm.nih.gov/#query=${encodedName}`,
        description: 'Detailed chemical and safety information',
        reliability: 'high'
      }
    ]
  };
  
  return learningResources;
};

// Generate ingredient research suggestions
export const generateIngredientResearchTips = (ingredientName) => {
  const tips = [
    `Search for "${ingredientName} INCI name" to find the official cosmetic name`,
    `Look up "${ingredientName} CAS number" for scientific identification`,
    `Check "${ingredientName} safety study" for research data`,
    `Search "${ingredientName} pregnancy safe" if you're expecting`,
    `Look for "${ingredientName} comedogenic rating" if you have acne-prone skin`,
    `Research "${ingredientName} pH stability" for formulation info`
  ];
  
  return tips;
};

// Quick link generator for unknown ingredients (used in the app)
export const getQuickLearningLink = (ingredientName, productType = 'cosmetic') => {
  const encodedName = encodeURIComponent(ingredientName.trim());
  
  // Return the most reliable source based on product type
  if (productType === 'food') {
    return {
      url: `https://www.fda.gov/food/food-additives-petitions/search?search=${encodedName}`,
      title: 'Learn more about this ingredient',
      source: 'FDA Food Database'
    };
  } else {
    return {
      url: `https://incidecoder.com/search?q=${encodedName}`,
      title: 'Learn more about this ingredient',
      source: 'INCIDecoder'
    };
  }
};

// Generate user-friendly explanation for why ingredient is unknown
export const generateUnknownIngredientExplanation = (ingredientName, totalIngredients, knownIngredients) => {
  const coveragePercentage = Math.round((knownIngredients / totalIngredients) * 100);
  
  return {
    message: `We don't have data on "${ingredientName}" in our database yet.`,
    suggestion: `Our database currently covers ${coveragePercentage}% of ingredients in this product. You can learn more about unknown ingredients using the links below.`,
    action: 'Tap the link to research this ingredient on trusted websites.',
    reassurance: 'Unknown doesn\'t mean unsafe - it just means we need more data.'
  };
};

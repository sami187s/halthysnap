import ingredientsDatabase from '../data/ingredientsDatabase.json';

export const analyzeIngredients = (productIngredients) => {
  if (!productIngredients || typeof productIngredients !== 'string') {
    return {
      score: 50,
      analyzedIngredients: [],
      goodIngredients: [],
      badIngredients: [],
      moderateIngredients: [],
      unknownIngredients: []
    };
  }

  // Clean and split ingredients
  const ingredientsList = productIngredients
    .toLowerCase()
    .split(/[,;.]/)
    .map(ingredient => ingredient.trim())
    .filter(ingredient => ingredient.length > 2);

  const analyzedIngredients = [];
  const goodIngredients = [];
  const badIngredients = [];
  const moderateIngredients = [];
  const unknownIngredients = [];

  let totalScore = 0;
  let matchedIngredients = 0;

  ingredientsList.forEach(ingredient => {
    const foundIngredient = findIngredientInDatabase(ingredient);
    
    if (foundIngredient) {
      matchedIngredients++;
      totalScore += foundIngredient.score;
      
      const analyzedIngredient = {
        name: ingredient,
        ...foundIngredient
      };

      analyzedIngredients.push(analyzedIngredient);

      if (foundIngredient.riskLevel === 'low') {
        goodIngredients.push(analyzedIngredient);
      } else if (foundIngredient.riskLevel === 'medium') {
        moderateIngredients.push(analyzedIngredient);
      } else {
        badIngredients.push(analyzedIngredient);
      }
    } else {
      // Ingredient not found in database - add to unknown ingredients
      unknownIngredients.push({
        name: ingredient,
        riskLevel: 'unknown',
        score: 50
      });
    }
  });

  // Calculate final score
  let finalScore = 50; // Default score if no ingredients matched
  
  if (matchedIngredients > 0) {
    const averageScore = totalScore / matchedIngredients;
    
    // Adjust score based on percentage of bad ingredients
    const badPercentage = badIngredients.length / matchedIngredients;
    const moderatePercentage = moderateIngredients.length / matchedIngredients;
    
    finalScore = averageScore;
    
    // Penalty for high percentage of bad ingredients
    if (badPercentage > 0.3) {
      finalScore -= 15;
    } else if (badPercentage > 0.1) {
      finalScore -= 5;
    }
    
    // Penalty for high percentage of moderate ingredients
    if (moderatePercentage > 0.5) {
      finalScore -= 10;
    } else if (moderatePercentage > 0.3) {
      finalScore -= 5;
    }
    
    // Ensure score is between 0 and 100
    finalScore = Math.max(0, Math.min(100, finalScore));
  }

  return {
    score: Math.round(finalScore),
    analyzedIngredients,
    goodIngredients,
    badIngredients,
    moderateIngredients,
    unknownIngredients,
    totalIngredients: ingredientsList.length,
    matchedIngredients
  };
};

const findIngredientInDatabase = (ingredient) => {
  return ingredientsDatabase.find(dbIngredient => {
    // Check main name
    if (dbIngredient.name.includes(ingredient) || ingredient.includes(dbIngredient.name)) {
      return true;
    }
    
    // Check aliases
    return dbIngredient.aliases.some(alias => 
      alias.includes(ingredient) || ingredient.includes(alias)
    );
  });
};

export const getScoreColor = (score) => {
  if (score >= 75) return '#4CAF50';      // Green - Excellent
  if (score >= 50) return '#8BC34A';      // Light Green - Good  
  if (score >= 25) return '#FF9800';      // Orange - Mediocre
  return '#F44336';                       // Red - Poor
};

export const getScoreGrade = (score) => {
  if (score >= 75) return 'A';            // Excellent
  if (score >= 50) return 'B';            // Good
  if (score >= 25) return 'C';            // Mediocre
  return 'D';                             // Poor
};

export const getRecommendation = (score) => {
  if (score >= 75) {
    return "Excellent choice! This product contains mostly beneficial ingredients.";
  } else if (score >= 50) {
    return "Good product with mostly safe ingredients. Suitable for regular use.";
  } else if (score >= 25) {
    return "Mediocre quality. Consider alternatives if you have sensitive skin.";
  } else {
    return "Poor quality. Avoid this product - contains many concerning ingredients.";
  }
};

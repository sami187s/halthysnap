/**
 * Smart Food Questions Database
 * Dynamic questions based on AI-recognized food category
 * Only asks questions when needed for accuracy
 */

export const FOOD_QUESTIONS = {
  // ========== RICE ==========
  rice: {
    questions: [
      {
        id: 'rice_type',
        question: 'What type of rice?',
        options: ['White Rice', 'Brown Rice', 'Jasmine Rice', 'Basmati Rice'],
        usdaModifier: (answer) => answer.toLowerCase().replace(' rice', '').trim() + ' rice cooked'
      },
      {
        id: 'cooking_method',
        question: 'How was it cooked?',
        options: ['Boiled (no oil)', 'Cooked with oil', 'Fried'],
        calorieModifier: {
          'Boiled (no oil)': 0,
          'Cooked with oil': 50,
          'Fried': 120
        },
        fatModifier: {
          'Boiled (no oil)': 0,
          'Cooked with oil': 5,
          'Fried': 12
        }
      },
      {
        id: 'portion',
        question: 'Portion size?',
        options: ['1/2 cup (75g)', '1 cup (150g)', '2 cups (300g)', '3+ cups (450g)'],
        portionMultiplier: {
          '1/2 cup (75g)': 0.75,
          '1 cup (150g)': 1.5,
          '2 cups (300g)': 3.0,
          '3+ cups (450g)': 4.5
        }
      }
    ]
  },

  // ========== CHICKEN ==========
  chicken: {
    questions: [
      {
        id: 'cooking_method',
        question: 'How is it prepared?',
        options: ['Grilled (no skin)', 'Fried', 'Roasted with skin', 'Baked'],
        usdaModifier: (answer) => {
          if (answer.includes('Grilled')) return 'chicken breast grilled';
          if (answer.includes('Fried')) return 'chicken fried';
          if (answer.includes('Roasted')) return 'chicken roasted';
          return 'chicken baked';
        },
        calorieModifier: {
          'Grilled (no skin)': 0,
          'Fried': 150,
          'Roasted with skin': 80,
          'Baked': 20
        }
      },
      {
        id: 'portion',
        question: 'Portion size?',
        options: ['Small (100g)', 'Medium (150g)', 'Large (200g)', 'Extra Large (300g)'],
        portionMultiplier: {
          'Small (100g)': 1.0,
          'Medium (150g)': 1.5,
          'Large (200g)': 2.0,
          'Extra Large (300g)': 3.0
        }
      }
    ]
  },

  // ========== SALAD ==========
  salad: {
    questions: [
      {
        id: 'dressing',
        question: 'What dressing?',
        options: ['No dressing', 'Light vinaigrette', 'Ranch/Caesar', 'Oil & vinegar'],
        calorieModifier: {
          'No dressing': 0,
          'Light vinaigrette': 30,
          'Ranch/Caesar': 120,
          'Oil & vinegar': 80
        },
        fatModifier: {
          'No dressing': 0,
          'Light vinaigrette': 3,
          'Ranch/Caesar': 12,
          'Oil & vinegar': 9
        }
      },
      {
        id: 'protein',
        question: 'Any protein added?',
        options: ['None', 'Grilled chicken', 'Fried chicken', 'Cheese', 'Tuna'],
        calorieModifier: {
          'None': 0,
          'Grilled chicken': 120,
          'Fried chicken': 250,
          'Cheese': 100,
          'Tuna': 90
        },
        proteinModifier: {
          'None': 0,
          'Grilled chicken': 25,
          'Fried chicken': 20,
          'Cheese': 7,
          'Tuna': 20
        }
      },
      {
        id: 'portion',
        question: 'Bowl size?',
        options: ['Side salad', 'Regular bowl', 'Large bowl'],
        portionMultiplier: {
          'Side salad': 0.5,
          'Regular bowl': 1.0,
          'Large bowl': 2.0
        }
      }
    ]
  },

  // ========== PASTA ==========
  pasta: {
    questions: [
      {
        id: 'sauce_type',
        question: 'What sauce?',
        options: ['Tomato sauce', 'Cream sauce', 'Oil-based', 'Pesto', 'No sauce'],
        calorieModifier: {
          'Tomato sauce': 50,
          'Cream sauce': 200,
          'Oil-based': 120,
          'Pesto': 150,
          'No sauce': 0
        },
        fatModifier: {
          'Tomato sauce': 2,
          'Cream sauce': 18,
          'Oil-based': 14,
          'Pesto': 15,
          'No sauce': 0
        }
      },
      {
        id: 'protein',
        question: 'Any protein?',
        options: ['None', 'Chicken', 'Beef', 'Shrimp', 'Meatballs'],
        calorieModifier: {
          'None': 0,
          'Chicken': 100,
          'Beef': 150,
          'Shrimp': 80,
          'Meatballs': 180
        }
      },
      {
        id: 'portion',
        question: 'Portion size?',
        options: ['1 cup', '2 cups', '3+ cups'],
        portionMultiplier: {
          '1 cup': 1.0,
          '2 cups': 2.0,
          '3+ cups': 3.0
        }
      }
    ]
  },

  // ========== STEAK / BEEF ==========
  steak: {
    questions: [
      {
        id: 'cut',
        question: 'What cut?',
        options: ['Lean (sirloin)', 'Medium (ribeye)', 'Fatty (T-bone)'],
        usdaModifier: (answer) => {
          if (answer.includes('Lean')) return 'beef sirloin grilled';
          if (answer.includes('Medium')) return 'beef ribeye';
          return 'beef t-bone';
        }
      },
      {
        id: 'cooking',
        question: 'How cooked?',
        options: ['Grilled', 'Pan-fried', 'Roasted'],
        calorieModifier: {
          'Grilled': 0,
          'Pan-fried': 80,
          'Roasted': 40
        }
      },
      {
        id: 'portion',
        question: 'Size?',
        options: ['Small (100g)', 'Medium (200g)', 'Large (300g)'],
        portionMultiplier: {
          'Small (100g)': 1.0,
          'Medium (200g)': 2.0,
          'Large (300g)': 3.0
        }
      }
    ]
  },

  beef: {
    questions: [
      {
        id: 'cut',
        question: 'What cut?',
        options: ['Lean (sirloin)', 'Medium (ribeye)', 'Fatty (T-bone)'],
        usdaModifier: (answer) => {
          if (answer.includes('Lean')) return 'beef sirloin grilled';
          if (answer.includes('Medium')) return 'beef ribeye';
          return 'beef t-bone';
        }
      },
      {
        id: 'portion',
        question: 'Size?',
        options: ['Small (100g)', 'Medium (200g)', 'Large (300g)'],
        portionMultiplier: {
          'Small (100g)': 1.0,
          'Medium (200g)': 2.0,
          'Large (300g)': 3.0
        }
      }
    ]
  },

  // ========== FRIES / FRENCH FRIES ==========
  fries: {
    questions: [
      {
        id: 'cooking',
        question: 'How cooked?',
        options: ['Baked (less oil)', 'Deep fried', 'Air fried'],
        calorieModifier: {
          'Baked (less oil)': -50,
          'Deep fried': 0,
          'Air fried': -80
        },
        fatModifier: {
          'Baked (less oil)': -5,
          'Deep fried': 0,
          'Air fried': -8
        }
      },
      {
        id: 'portion',
        question: 'Portion?',
        options: ['Small', 'Medium', 'Large', 'Extra Large'],
        portionMultiplier: {
          'Small': 0.7,
          'Medium': 1.0,
          'Large': 1.5,
          'Extra Large': 2.0
        }
      }
    ]
  },

  'french fries': {
    questions: [
      {
        id: 'cooking',
        question: 'How cooked?',
        options: ['Baked (less oil)', 'Deep fried', 'Air fried'],
        calorieModifier: {
          'Baked (less oil)': -50,
          'Deep fried': 0,
          'Air fried': -80
        }
      },
      {
        id: 'portion',
        question: 'Portion?',
        options: ['Small', 'Medium', 'Large'],
        portionMultiplier: {
          'Small': 0.7,
          'Medium': 1.0,
          'Large': 1.5
        }
      }
    ]
  },

  // ========== SOUP ==========
  soup: {
    questions: [
      {
        id: 'type',
        question: 'What type?',
        options: ['Broth-based', 'Creamy', 'Thick (stew)'],
        usdaModifier: (answer) => {
          if (answer.includes('Broth')) return 'soup broth';
          if (answer.includes('Creamy')) return 'soup cream';
          return 'soup thick';
        }
      },
      {
        id: 'bowl_size',
        question: 'Bowl size?',
        options: ['Cup (250ml)', 'Bowl (400ml)', 'Large bowl (600ml)'],
        portionMultiplier: {
          'Cup (250ml)': 1.0,
          'Bowl (400ml)': 1.6,
          'Large bowl (600ml)': 2.4
        }
      }
    ]
  },

  // ========== BURGER / HAMBURGER ==========
  burger: {
    questions: [
      {
        id: 'type',
        question: 'What type?',
        options: ['Regular beef', 'Cheeseburger', 'Chicken burger', 'Veggie burger'],
        usdaModifier: (answer) => {
          if (answer.includes('Cheeseburger')) return 'cheeseburger';
          if (answer.includes('Chicken')) return 'chicken burger';
          if (answer.includes('Veggie')) return 'veggie burger';
          return 'hamburger';
        }
      },
      {
        id: 'size',
        question: 'Size?',
        options: ['Single patty', 'Double patty', 'Triple patty'],
        portionMultiplier: {
          'Single patty': 1.0,
          'Double patty': 1.8,
          'Triple patty': 2.5
        }
      }
    ]
  },

  hamburger: {
    questions: [
      {
        id: 'type',
        question: 'What type?',
        options: ['Regular beef', 'Cheeseburger', 'Bacon burger'],
        calorieModifier: {
          'Regular beef': 0,
          'Cheeseburger': 100,
          'Bacon burger': 150
        }
      },
      {
        id: 'size',
        question: 'Size?',
        options: ['Single patty', 'Double patty'],
        portionMultiplier: {
          'Single patty': 1.0,
          'Double patty': 1.8
        }
      }
    ]
  },

  // ========== PIZZA ==========
  pizza: {
    questions: [
      {
        id: 'type',
        question: 'What type?',
        options: ['Cheese only', 'Pepperoni', 'Veggie', 'Meat lovers'],
        calorieModifier: {
          'Cheese only': 0,
          'Pepperoni': 50,
          'Veggie': -20,
          'Meat lovers': 120
        }
      },
      {
        id: 'slices',
        question: 'How many slices?',
        options: ['1 slice', '2 slices', '3 slices', '4+ slices'],
        portionMultiplier: {
          '1 slice': 1.0,
          '2 slices': 2.0,
          '3 slices': 3.0,
          '4+ slices': 4.0
        }
      }
    ]
  },

  // ========== SANDWICH ==========
  sandwich: {
    questions: [
      {
        id: 'type',
        question: 'What type?',
        options: ['Turkey/Chicken', 'Ham & Cheese', 'Tuna', 'Veggie', 'Club sandwich'],
        usdaModifier: (answer) => {
          if (answer.includes('Turkey')) return 'turkey sandwich';
          if (answer.includes('Ham')) return 'ham sandwich';
          if (answer.includes('Tuna')) return 'tuna sandwich';
          if (answer.includes('Veggie')) return 'vegetable sandwich';
          return 'club sandwich';
        }
      },
      {
        id: 'bread',
        question: 'What bread?',
        options: ['White bread', 'Wheat bread', 'Multigrain'],
        calorieModifier: {
          'White bread': 0,
          'Wheat bread': -10,
          'Multigrain': -15
        }
      }
    ]
  },

  // ========== FISH ==========
  fish: {
    questions: [
      {
        id: 'type',
        question: 'What type?',
        options: ['Salmon', 'Tuna', 'White fish (cod/tilapia)', 'Fried fish'],
        usdaModifier: (answer) => {
          if (answer.includes('Salmon')) return 'salmon grilled';
          if (answer.includes('Tuna')) return 'tuna grilled';
          if (answer.includes('Fried')) return 'fish fried';
          return 'cod baked';
        }
      },
      {
        id: 'cooking',
        question: 'How cooked?',
        options: ['Grilled', 'Baked', 'Fried', 'Steamed'],
        calorieModifier: {
          'Grilled': 0,
          'Baked': 10,
          'Fried': 150,
          'Steamed': -10
        }
      }
    ]
  },

  // ========== EGGS ==========
  eggs: {
    questions: [
      {
        id: 'cooking',
        question: 'How cooked?',
        options: ['Boiled', 'Scrambled', 'Fried', 'Omelet'],
        calorieModifier: {
          'Boiled': 0,
          'Scrambled': 30,
          'Fried': 50,
          'Omelet': 60
        }
      },
      {
        id: 'count',
        question: 'How many eggs?',
        options: ['1 egg', '2 eggs', '3 eggs', '4+ eggs'],
        portionMultiplier: {
          '1 egg': 1.0,
          '2 eggs': 2.0,
          '3 eggs': 3.0,
          '4+ eggs': 4.0
        }
      }
    ]
  },

  // ========== Foods that DON'T need questions (analyze immediately) ==========
  banana: { questions: [] },
  apple: { questions: [] },
  orange: { questions: [] },
  water: { questions: [] },
  bread: { questions: [] },
  milk: { questions: [] },
  yogurt: { questions: [] },
  cheese: { questions: [] },
  avocado: { questions: [] },
  tomato: { questions: [] },
  cucumber: { questions: [] },
  carrot: { questions: [] }
};

/**
 * Get questions for a specific food type
 * @param {string} foodName - AI-recognized food name
 * @returns {Array} - Array of question objects
 */
export const getQuestionsForFood = (foodName) => {
  if (!foodName) return [];
  
  const normalized = foodName.toLowerCase().trim();
  
  // Check for exact matches
  if (FOOD_QUESTIONS[normalized]) {
    return FOOD_QUESTIONS[normalized].questions;
  }
  
  // Check for partial matches
  for (const [key, value] of Object.entries(FOOD_QUESTIONS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value.questions;
    }
  }
  
  // Default: Ask basic portion question for unknown foods
  return [
    {
      id: 'portion',
      question: 'Portion size?',
      options: ['Small', 'Medium', 'Large'],
      portionMultiplier: {
        'Small': 0.7,
        'Medium': 1.0,
        'Large': 1.5
      }
    }
  ];
};

/**
 * Check if food needs questions
 * @param {string} foodName - Food name
 * @returns {boolean} - True if questions needed
 */
export const needsQuestions = (foodName) => {
  const questions = getQuestionsForFood(foodName);
  return questions.length > 0;
};

/**
 * Get USDA search query modifier from answers
 * @param {string} foodName - Base food name
 * @param {Object} answers - User answers
 * @returns {string} - Enhanced USDA query
 */
export const getEnhancedUSDAQuery = (foodName, answers) => {
  const normalized = foodName.toLowerCase().trim();
  const foodConfig = FOOD_QUESTIONS[normalized];
  
  if (!foodConfig || !answers) return foodName;
  
  // Find questions with usdaModifier
  for (const question of foodConfig.questions) {
    const answer = answers[question.id];
    if (answer && question.usdaModifier) {
      if (typeof question.usdaModifier === 'function') {
        return question.usdaModifier(answer);
      }
    }
  }
  
  return foodName;
};

export default FOOD_QUESTIONS;

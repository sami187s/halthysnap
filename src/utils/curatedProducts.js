import AsyncStorage from '@react-native-async-storage/async-storage';

const BEST_PRODUCTS_KEY = '@vee_curated_products';

// Whether a product (by barcode) is already in the user's saved/bookmarked list.
export const isProductSaved = async (barcode) => {
  if (!barcode) return false;
  try {
    const raw = await AsyncStorage.getItem(BEST_PRODUCTS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return list.some(p => p.barcode === barcode);
  } catch {
    return false;
  }
};

// Adds the product if it isn't saved yet, removes it if it already is.
// Returns the new saved state (true/false), or null if the read/write failed.
export const toggleSavedProduct = async (item) => {
  try {
    const raw = await AsyncStorage.getItem(BEST_PRODUCTS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const already = list.some(p => p.barcode === item.barcode);

    if (already) {
      const updated = list.filter(p => p.barcode !== item.barcode);
      await AsyncStorage.setItem(BEST_PRODUCTS_KEY, JSON.stringify(updated));
      return false;
    }

    const entry = {
      id: item.barcode,
      barcode: item.barcode,
      name: item.name,
      brand: item.brand || 'Unknown Brand',
      category: item.productType === 'food' ? 'FOOD' : 'COSMETIC',
      filterCat: item.productType === 'food' ? 'Food' : 'Cosmetic',
      tag: 'TOP PICK',
      score: Math.round(item.score || 0),
      defaultScore: Math.round(item.score || 0),
      image: item.image || null,
      productType: item.productType || 'food',
      ingredients: item.ingredients || '',
      nutriments: item.nutriments || {},
      savedAt: Date.now(),
    };
    const updated = [entry, ...list];
    await AsyncStorage.setItem(BEST_PRODUCTS_KEY, JSON.stringify(updated));
    return true;
  } catch {
    return null;
  }
};

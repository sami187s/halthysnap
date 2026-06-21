# HealthyScan

A React Native mobile app that helps users scan personal care product barcodes and get instant health scores and ingredient analysis. Inspired by Yuka's clean design with a traffic light color system for easy understanding.

## Features

- **Barcode Scanner**: Use your phone's camera to scan product barcodes
- **Health Scoring**: Get instant health scores (0-100) based on ingredient analysis
- **Ingredient Analysis**: Detailed breakdown of good, moderate, and risky ingredients
- **Product Search**: Search for products by name as an alternative to scanning
- **Clean UI**: Yuka-inspired design with intuitive traffic light colors
- **Detailed Results**: Comprehensive product information and recommendations

## Tech Stack

- **Framework**: React Native with Expo SDK 52
- **Barcode Scanner**: expo-barcode-scanner
- **API**: Open Beauty Facts API for product information
- **Navigation**: React Navigation
- **HTTP Client**: Axios
- **Icons**: Expo Vector Icons

## Color Scheme

- 🟢 **Green (#4CAF50)**: Healthy products (score 70-100)
- 🟡 **Yellow (#FF9800)**: Moderate risk (score 40-69)
- 🔴 **Red (#F44336)**: Risky products (score 0-39)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd healthyscan
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Run on device/simulator**
   - For Android: `npm run android`
   - For iOS: `npm run ios` (requires macOS)
   - For Web: `npm run web`

## Usage

1. **Launch the app** and grant camera permissions
2. **Tap "Scan Barcode"** to open the camera scanner
3. **Point your camera** at a product barcode
4. **View results** including health score and ingredient breakdown
5. **Alternative**: Use "Search by name" if barcode scanning isn't available

## Project Structure

```
src/
├── components/          # Reusable UI components
├── data/               # Static data (ingredient database)
├── screens/            # App screens
│   ├── HomeScreen.js   # Main screen with scanner
│   ├── ResultsScreen.js # Product analysis results
│   └── SearchScreen.js # Product search functionality
├── services/           # API services
│   └── openBeautyFactsAPI.js
└── utils/              # Utility functions
    └── ingredientAnalyzer.js
```

## Ingredient Database

The app includes a comprehensive database of cosmetic ingredients with risk assessments:

- **Low Risk**: Natural ingredients, proven safe compounds
- **Medium Risk**: Ingredients with potential concerns for sensitive individuals
- **High Risk**: Ingredients with known health concerns or allergens

## API Integration

- **Open Beauty Facts API**: Fetches product information by barcode
- **Fallback Search**: Manual product search capability
- **Error Handling**: Graceful handling of API failures and missing products

## Development

### Adding New Ingredients

To add new ingredients to the database, edit `src/data/ingredientsDatabase.json`:

```json
{
  "name": "ingredient_name",
  "aliases": ["alternative_names"],
  "riskLevel": "low|medium|high",
  "score": 0-100,
  "description": "Why this ingredient is good/bad",
  "category": "ingredient_category"
}
```

### Customizing Scoring

The scoring algorithm in `src/utils/ingredientAnalyzer.js` can be customized:

- Base score calculation
- Risk level penalties
- Ingredient matching logic
- Recommendation thresholds

## Camera Permissions

The app requires camera permissions to function:

- **iOS**: Automatically prompts for permission
- **Android**: Configured in app.json with appropriate permissions
- **Web**: Uses browser camera API

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on multiple devices
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Acknowledgments

- **Open Beauty Facts**: For providing the product database API
- **Yuka**: For design inspiration
- **Expo Team**: For the excellent development framework

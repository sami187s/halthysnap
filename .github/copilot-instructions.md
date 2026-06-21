# HealthyScan - Copilot Instructions

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
HealthyScan is a React Native mobile app built with Expo that allows users to scan barcodes of personal care products and get health scores and ingredient analysis. The app is inspired by Yuka's design with clean UI and traffic light color scheme.

## Tech Stack
- React Native with Expo SDK 52
- expo-barcode-scanner for barcode scanning
- Open Beauty Facts API for product information
- React Navigation for screen navigation
- Axios for API calls

## Design Guidelines
- Use Yuka-inspired clean UI design
- Implement traffic light color scheme:
  - 🟢 Green (#4CAF50) = Healthy (score 70-100)
  - 🟡 Yellow (#FF9800) = Moderate (score 40-69)
  - 🔴 Red (#F44336) = Risky (score 0-39)
- Focus on readability and user-friendly interfaces
- Big, prominent barcode scanner button on home screen

## Key Features
1. Barcode scanner with camera integration
2. Product information fetching from Open Beauty Facts API
3. Ingredient analysis with health scoring (0-100)
4. Results display with good/bad ingredients
5. Search functionality as backup
6. Clean, intuitive navigation

## Code Standards
- Use functional components with React hooks
- Implement proper error handling for API calls
- Follow React Native best practices
- Use consistent styling with StyleSheet
- Implement proper loading states and user feedback

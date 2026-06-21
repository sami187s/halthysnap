#!/bin/bash
set -e

echo "📱 EAS Build Hook: Post-install"
echo "🔧 Running expo prebuild..."

# Run expo prebuild
npx expo prebuild --clean --platform android

echo "✅ Prebuild completed!"
echo "🔧 Fixing settings.gradle for React Native path issue..."

# Run the fix script
node scripts/fix-gradle-settings.js

echo "✅ All done! Ready for build."


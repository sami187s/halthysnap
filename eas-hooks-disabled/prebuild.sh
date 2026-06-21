#!/bin/bash
set -e

echo "🔧 EAS Build: Post-Prebuild Hook"
echo "📱 Fixing settings.gradle React Native path issue..."

# Run the fix script
node scripts/fix-gradle-settings.js

echo "✅ Post-prebuild hook complete"



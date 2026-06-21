const {
  getSentryExpoConfig
} = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

// Merge with default sourceExts instead of replacing
config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  'json'
];

module.exports = config;
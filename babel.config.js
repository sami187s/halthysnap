module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Production builds only: strip console.log/info/debug (hundreds of them, some
      // print purchase/customer details). console.error and console.warn are kept.
      ...(process.env.NODE_ENV === 'production'
        ? [['transform-remove-console', { exclude: ['error', 'warn'] }]]
        : []),
      // Must stay last
      'react-native-reanimated/plugin',
    ],
  };
};
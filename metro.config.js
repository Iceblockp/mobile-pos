const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add buffer polyfill for Bluetooth functionality
config.resolver.alias = {
  ...config.resolver.alias,
  buffer: require.resolve('buffer'),
};

module.exports = config;

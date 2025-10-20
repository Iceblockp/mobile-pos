module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-screens/babel',
      'react-native-reanimated/plugin', // This should be last
    ],
  };
};

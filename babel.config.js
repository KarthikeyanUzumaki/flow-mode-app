module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            'react-native-worklets-core': 'react-native-worklets',
          },
        },
      ],
      'react-native-reanimated/plugin', // Reanimated handles worklet transpilation now
    ],
  };
};
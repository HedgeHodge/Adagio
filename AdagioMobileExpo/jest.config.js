
module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)"
  ],
  moduleNameMapper: {
    '@react-native-firebase/app': '<rootDir>/__mocks__/@react-native-firebase/app.js',
    '@react-native-firebase/auth': '<rootDir>/__mocks__/@react-native-firebase/auth.js',
    '@react-native-firebase/firestore': '<rootDir>/__mocks__/@react-native-firebase/firestore.js',
    '../lib/firebase': '<rootDir>/__mocks__/firebase.js'
  }
};

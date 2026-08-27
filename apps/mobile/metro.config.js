const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const { withNativewind } = require('nativewind/metro');

const config = getSentryExpoConfig(__dirname, {
  annotateReactComponents: false,
  includeWebReplay: false,
});

module.exports = withNativewind(config);

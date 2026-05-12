const { withNxMetro } = require('@nx/expo');
const { getDefaultConfig } = require('@expo/metro-config');
const { mergeConfig } = require('metro-config');

const defaultConfig = getDefaultConfig(__dirname);
const { assetExts, sourceExts } = defaultConfig.resolver;

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const customConfig = {
  cacheVersion: 'platform',
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  },
  resolver: {
    assetExts: assetExts.filter((ext) => ext !== 'svg'),
    sourceExts: [...sourceExts, 'cjs', 'mjs', 'svg'],
  },
};

const nxMetroConfig = withNxMetro(mergeConfig(defaultConfig, customConfig), {
  // Change this to true to see debugging info.
  // Useful if you have issues resolving modules
  debug: false,
  // all the file extensions used for imports other than 'ts', 'tsx', 'js', 'jsx', 'json'
  extensions: [],
  // Specify folders to watch, in addition to Nx defaults (workspace libraries and node_modules)
  watchFolders: [],
});

// Without npm workspaces, dependencies live under the repo root while Metro runs with
// project cwd under apps/platform. Expo then asks Metro for paths like
// `./node_modules/expo-router/entry`, which resolve relative to apps/platform and fail
// (no local node_modules). That surfaces as HTTP 500 JSON → browser MIME mismatch on web.
const nxResolveRequest = nxMetroConfig.resolver.resolveRequest;
const hoistPrefixUnix = './node_modules/';
const hoistPrefixWin = '.\\node_modules\\';
nxMetroConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  if (typeof moduleName === 'string') {
    if (moduleName.startsWith(hoistPrefixUnix)) {
      return nxResolveRequest(
        context,
        moduleName.slice(hoistPrefixUnix.length),
        platform
      );
    }
    if (moduleName.startsWith(hoistPrefixWin)) {
      return nxResolveRequest(
        context,
        moduleName.slice(hoistPrefixWin.length),
        platform
      );
    }
  }
  return nxResolveRequest(context, moduleName, platform);
};

module.exports = nxMetroConfig;

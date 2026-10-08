// Same registry Metro writes assets into (transformer.assetRegistryPath),
// so react-native-svg and <Image> resolve the same asset IDs.
module.exports = require('react-native/asset-registry');

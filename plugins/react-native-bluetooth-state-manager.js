const { withAndroidManifest, withInfoPlist } = require('@expo/config-plugins');

const withBluetoothStateManager = (config, options = {}) => {
  // Add Android permissions and features
  config = withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;

    // Add Bluetooth permissions
    const permissions = [
      'android.permission.BLUETOOTH',
      'android.permission.BLUETOOTH_ADMIN',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.BLUETOOTH_CONNECT',
      'android.permission.BLUETOOTH_SCAN',
      'android.permission.BLUETOOTH_ADVERTISE',
    ];

    permissions.forEach((permission) => {
      if (
        !androidManifest.manifest['uses-permission']?.find(
          (p) => p.$['android:name'] === permission
        )
      ) {
        androidManifest.manifest['uses-permission'] =
          androidManifest.manifest['uses-permission'] || [];
        androidManifest.manifest['uses-permission'].push({
          $: { 'android:name': permission },
        });
      }
    });

    // Add Bluetooth features
    const features = [
      'android.hardware.bluetooth',
      'android.hardware.bluetooth_le',
    ];

    features.forEach((feature) => {
      if (
        !androidManifest.manifest['uses-feature']?.find(
          (f) => f.$['android:name'] === feature
        )
      ) {
        androidManifest.manifest['uses-feature'] =
          androidManifest.manifest['uses-feature'] || [];
        androidManifest.manifest['uses-feature'].push({
          $: {
            'android:name': feature,
            'android:required': 'false',
          },
        });
      }
    });

    return config;
  });

  // Add iOS Info.plist entries
  config = withInfoPlist(config, (config) => {
    const infoPlist = config.modResults;

    // Add Bluetooth usage descriptions
    infoPlist.NSBluetoothPeripheralUsageDescription =
      options.peripheralUsageDescription ||
      'This app uses Bluetooth to connect to thermal printers for receipt printing.';

    infoPlist.NSBluetoothAlwaysUsageDescription =
      options.alwaysUsageDescription ||
      'This app uses Bluetooth to connect to thermal printers for receipt printing.';

    // Add required background modes for Bluetooth
    if (!infoPlist.UIBackgroundModes) {
      infoPlist.UIBackgroundModes = [];
    }

    if (!infoPlist.UIBackgroundModes.includes('bluetooth-central')) {
      infoPlist.UIBackgroundModes.push('bluetooth-central');
    }

    return config;
  });

  return config;
};

module.exports = withBluetoothStateManager;

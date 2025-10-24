#!/usr/bin/env node

console.log('🧪 Verifying UI fixes...');

const fs = require('fs');
const path = require('path');

// Check status bar fix
const layoutPath = path.join(__dirname, '../app/_layout.tsx');
const layoutContent = fs.readFileSync(layoutPath, 'utf8');

const statusBarFixed = layoutContent.includes('<StatusBar style="dark" />');

// Check tab bar safe area fix
const tabLayoutPath = path.join(__dirname, '../app/(tabs)/_layout.tsx');
const tabLayoutContent = fs.readFileSync(tabLayoutPath, 'utf8');

const safeAreaImported = tabLayoutContent.includes(
  "import { useSafeAreaInsets } from 'react-native-safe-area-context'"
);
const safeAreaUsed = tabLayoutContent.includes(
  'const insets = useSafeAreaInsets()'
);
const tabBarHeightFixed = tabLayoutContent.includes(
  'height: 60 + insets.bottom'
);
const tabBarPaddingFixed = tabLayoutContent.includes(
  'paddingBottom: insets.bottom + 5'
);

console.log('📊 UI Fix Status:');
console.log(`   ✅ Status bar set to dark: ${statusBarFixed ? 'YES' : 'NO'}`);
console.log(
  `   ✅ Safe area insets imported: ${safeAreaImported ? 'YES' : 'NO'}`
);
console.log(`   ✅ Safe area insets used: ${safeAreaUsed ? 'YES' : 'NO'}`);
console.log(
  `   ✅ Tab bar height includes safe area: ${tabBarHeightFixed ? 'YES' : 'NO'}`
);
console.log(
  `   ✅ Tab bar padding includes safe area: ${
    tabBarPaddingFixed ? 'YES' : 'NO'
  }`
);

const allFixesApplied =
  statusBarFixed &&
  safeAreaImported &&
  safeAreaUsed &&
  tabBarHeightFixed &&
  tabBarPaddingFixed;

if (allFixesApplied) {
  console.log('🎉 All UI fixes applied successfully!');
  console.log('');
  console.log('📝 Summary of changes:');
  console.log(
    '   • Status bar set to "dark" for dark content on light background'
  );
  console.log('   • Tab bar height now includes safe area bottom inset');
  console.log('   • Tab bar padding bottom includes safe area inset + 5px');
  console.log('   • Uses useSafeAreaInsets hook for proper safe area handling');
  console.log('');
  console.log(
    '✨ Bottom tabs should no longer overlap with system navigation!'
  );
  console.log('✨ Status bar should show dark content properly!');
} else {
  console.log('❌ Some UI fixes are missing:');
  if (!statusBarFixed) console.log('   - Status bar not set to dark');
  if (!safeAreaImported) console.log('   - Safe area insets not imported');
  if (!safeAreaUsed) console.log('   - Safe area insets not used');
  if (!tabBarHeightFixed)
    console.log('   - Tab bar height not adjusted for safe area');
  if (!tabBarPaddingFixed)
    console.log('   - Tab bar padding not adjusted for safe area');
}

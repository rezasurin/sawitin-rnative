// Run with: node --test scripts/check-navigation.cjs
// Exercise tab configuration against Expo's actual route tree without a device.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const React = require('react');
const { getRoutes } = require('expo-router/build/getRoutes');
const requireContext = require('expo-router/build/testing-library/require-context-ponyfill').default;

const root = path.resolve(__dirname, '..');
const routes = getRoutes(requireContext(path.join(root, 'app')), {
  platform: 'ios', importMode: 'async', ignoreEntryPoints: true, ignoreRequireErrors: true,
});
let segments = [];
let authorized = true;
const Tabs = Object.assign(() => null, { Screen: () => null });
const mocks = {
  'react-native': { StyleSheet: { create: (value) => value }, Text: 'Text', View: 'View' },
  'expo-router': { Tabs, useSegments: () => segments },
  'expo-router/react-navigation': { CommonActions: { navigate: (payload) => ({ type: 'NAVIGATE', payload }) } },
  '@/constants/Colors': { BrandColors: {} },
  '@/constants/navigation': { FLOATING_TAB_BAR_STYLE: {}, TAB_BAR_LABEL_STYLE: {}, TAB_BAR_ITEM_STYLE: {} },
  '@/stores/useAuthStore': { useAuthStore: (selector) => selector({ hasPermission: () => authorized }) },
  './TabBarIcon': { TabBarIcon: () => null },
};
const source = fs.readFileSync(path.join(root, 'components/core/RoleTabs.tsx'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
}).outputText;
const moduleExports = {};
vm.runInNewContext(compiled, {
  exports: moduleExports,
  require: (name) => Object.hasOwn(mocks, name) ? mocks[name] : require(name),
});

const expected = {
  '(pemanen)': ['Beranda', 'Akun'],
  '(mandor)': ['Beranda', 'BKM Panen', 'Checker', 'Akun'],
  '(krani)': ['Beranda', 'Timbangan', 'Akun'],
  '(asisten)': ['Beranda', 'BKM Panen', 'Akun'],
  '(admin)': ['Beranda', 'BKM Panen', 'Menu', 'Akun'],
};

for (const [group, labels] of Object.entries(expected)) {
  test(`${group}: visible tabs exist and every route is explicitly registered`, () => {
    segments = [group];
    const element = moduleExports.RoleTabs({ group });
    const screens = React.Children.toArray(element.props.children);
    const visible = screens.filter((screen) => screen.props.options.href !== null);
    assert.deepEqual(visible.map((screen) => screen.props.options.title), labels);
    const groupNode = routes.children.find((node) => node.route === group);
    assert.ok(groupNode, `Missing group ${group}`);
    assert.deepEqual(
      screens.map((screen) => screen.props.name).sort(),
      groupNode.children.map((node) => node.route).sort(),
    );
    for (const screen of visible) {
      const node = groupNode.children.find((node) => node.route === screen.props.name);
      segments = [group, node.route];
      assert.ok(!moduleExports.RoleTabs({ group }).props.screenOptions.tabBarStyle.some((style) => style?.display === 'none'));
      if (node.type === 'layout') {
        for (const child of node.children.filter((entry) => entry.route !== 'index')) {
          segments = [group, node.route, child.route];
          assert.ok(moduleExports.RoleTabs({ group }).props.screenOptions.tabBarStyle.some((style) => style?.display === 'none'));
        }
      }
    }
  });
}

test('Krani scan, input and detail share the Timbangan stack', () => {
  const krani = routes.children.find((node) => node.route === '(krani)');
  const weighing = krani.children.find((node) => node.route === 'timbangan');
  assert.equal(weighing.type, 'layout');
  assert.deepEqual(weighing.children.map((node) => node.route).sort(), ['[detailId]', 'add', 'index', 'scan']);
});

test('Permission guard remains active', () => {
  authorized = false;
  for (const group of Object.keys(expected)) {
    segments = [group];
    assert.notEqual(moduleExports.RoleTabs({ group }).type, Tabs);
  }
  authorized = true;
});

test('Retained hidden root routes keep a visible way back to the main tabs', () => {
  for (const [group, route] of [
    ['(mandor)', 'rawat'],
    ['(asisten)', 'laporan'], ['(admin)', 'master-data'], ['(admin)', 'users'],
  ]) {
    segments = [group, route];
    assert.ok(!moduleExports.RoleTabs({ group }).props.screenOptions.tabBarStyle.some((style) => style?.display === 'none'));
  }
});


test('Administrator exposes every implemented module in its own route group', () => {
  segments = ['(admin)'];
  assert.equal(moduleExports.RoleTabs({ group: '(admin)' }).props.backBehavior, 'history');
  const admin = routes.children.find((node) => node.route === '(admin)');
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root, 'constants/adminMenu.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { exports });
  assert.deepEqual(Array.from(exports.ADMIN_MODULES, (item) => item.route).sort(),
    ['bkm', 'checker', 'material', 'rawat', 'timbangan']);
  for (const item of exports.ADMIN_MODULES) {
    assert.ok(admin.children.some((node) => node.route === item.route), item.route);
  }
  for (const [module, group] of [['bkm', '(mandor)'], ['checker', '(mandor)'], ['timbangan', '(krani)']]) {
    const original = routes.children.find((node) => node.route === group).children.find((node) => node.route === module);
    const shared = admin.children.find((node) => node.route === module);
    assert.deepEqual(shared.children.map((node) => node.route).sort(), original.children.map((node) => node.route).sort());
  }
});

test('Shared module links stay in Administrator and preserve original role routes', () => {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root, 'hooks/useModuleGroup.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { exports, require: () => ({ useSegments: () => segments }) });
  for (const fallback of ['(mandor)', '(krani)']) {
    segments = ['(admin)', 'timbangan', 'scan'];
    assert.equal(exports.useModuleGroup(fallback), '(admin)');
    segments = [fallback];
    assert.equal(exports.useModuleGroup(fallback), fallback);
  }
});

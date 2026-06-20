const devConfig = require('./dev');
const prodConfig = require('./prod');
const path = require('path');

function isObject(obj) {
  return obj !== null && typeof obj === 'object' && !Array.isArray(obj);
}
function deepMerge(target, ...sources) {
  for (const src of sources) {
    if (!isObject(src)) continue;
    for (const k of Object.keys(src)) {
      const tv = target[k], sv = src[k];
      if (isObject(tv) && isObject(sv)) {
        target[k] = deepMerge({}, tv, sv);
      } else if (sv !== undefined) {
        target[k] = sv;
      }
    }
  }
  return target;
}

const aliasConfig = (chain) => {
  chain.resolve.alias.set('@', path.resolve(__dirname, '..', 'src'));
};

module.exports = (ctx) => {
  const baseConfig = {
    projectName: 'taro_template',
    date: '2025-12-10',
    designWidth: 375,
    deviceRatio: {
      640: 2.34 / 2,
      750: 1,
      375: 2,
      828: 1.81 / 2,
    },
    sourceRoot: 'src',
    outputRoot: process.env.TARO_OUTPUT_DIR || 'dist',
    plugins: ['@tarojs/plugin-html'],
    defineConstants: {},
    copy: {
      patterns: [],
      options: {},
    },
    framework: 'react',
    compiler: {
      type: 'webpack5',
      prebundle: { enable: false },
    },
    cache: { enable: false },
    alias: {
      '@': path.resolve(__dirname, '..', 'src'),
    },
    mini: {
      optimizeMainPackage: { enable: false },
      splitChunks: { chunks: 'async' },
      webpackChain: aliasConfig,
      postcss: {
        pxtransform: {
          enable: true,
          config: { selectorBlackList: ['nut-'] },
        },
        cssModules: {
          enable: true,
          config: {
            namingPattern: 'module',
            generateScopedName: '[name]__[local]___[hash:base64:5]',
          },
        },
      },
    },
    h5: {
      publicPath: '/',
      staticDirectory: 'static',
      webpackChain: aliasConfig,
      output: {
        filename: 'js/[name].[hash:8].js',
        chunkFilename: 'js/[name].[chunkhash:8].js',
      },
      miniCssExtractPluginOption: {
        ignoreOrder: true,
        filename: 'css/[name].[hash].css',
        chunkFilename: 'css/[name].[chunkhash].css',
      },
      postcss: {
        autoprefixer: { enable: true, config: {} },
        cssModules: {
          enable: true,
          config: {
            namingPattern: 'module',
            generateScopedName: '[name]__[local]___[hash:base64:5]',
          },
        },
        pxtransform: {
          enable: true,
          config: {
            selectorBlackList: ['body'],
            baseFontSize: 37.5,
            unitPrecision: 5,
          },
        },
      },
    },
    rn: {
      appName: 'taroDemo',
      postcss: { cssModules: { enable: true } },
    },
  };

  if (process.env.NODE_ENV === 'development') {
    return deepMerge({}, baseConfig, devConfig);
  }
  return deepMerge({}, baseConfig, prodConfig);
};

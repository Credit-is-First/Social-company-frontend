const path = require('path');

/**
 * Keeps src/tailwind-jit.css in step with the source while the dev server
 * runs. `prestart` has already generated it once; this regenerates it when a
 * file changes. Only webpack's watch mode fires `watchRun`, so builds are
 * unaffected (`prebuild` covers them).
 */
class TailwindJitWatchPlugin {
  apply(compiler) {
    let started = false;
    compiler.hooks.watchRun.tap('TailwindJitWatchPlugin', () => {
      if (started) return;
      started = true;
      require('./scripts/tailwind-jit').watch();
    });
  }
}

module.exports = {
  devServer: {
    port: 5000,
  },
  webpack: {
    configure: (webpackConfig) => {
      // Override postcss-loader to use version 4.x which supports PostCSS 8
      const oneOfRule = webpackConfig.module.rules.find((rule) => rule.oneOf);
      
      if (oneOfRule) {
        oneOfRule.oneOf.forEach((rule) => {
          if (rule.test && rule.test.toString().includes('css') && rule.use) {
            const postcssLoaderIndex = rule.use.findIndex(
              (loader) =>
                typeof loader === 'object' &&
                loader.loader &&
                loader.loader.includes('postcss-loader')
            );
            
            if (postcssLoaderIndex !== -1) {
              // Replace with postcss-loader 4.x that supports PostCSS 8
              rule.use[postcssLoaderIndex] = {
                loader: require.resolve('postcss-loader'),
                options: {
                  postcssOptions: {
                    plugins: [
                      require('tailwindcss'),
                      require('autoprefixer'),
                    ],
                  },
                },
              };
            }
          }
        });
      }

      webpackConfig.plugins.push(new TailwindJitWatchPlugin());

      return webpackConfig;
    },
  },
  style: {
    postcss: {
      plugins: [
        require('tailwindcss'),
        require('autoprefixer'),
      ],
    },
  },
}


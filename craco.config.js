const path = require('path');

module.exports = {
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


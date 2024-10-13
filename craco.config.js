module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.module.rules.push({
        test: /\.cjs$/,
        type: 'javascript/auto',
      });
      return webpackConfig;
    },
  },
};

process.env.NODE_ENV = 'production'
process.env.FESG_ENV = 'build'

const fs = require('fs-extra')
const webpack = require('webpack')

module.exports = cwd => {
  const config = require('./webpack.build.config')(cwd)

  // Empty output path to get rid of leftovers
  fs.emptyDir(config.output.path, error => {
    if (error) throw error

    webpack(config, (error, stats) => {
      if (error) throw error

      if (stats.hasErrors()) {
        console.log(stats.toString({
          assets: false,
          children: false,
          chunks: false,
          chunkModules: false,
          colors: true,
          errors: false,
          modules: false
        }) + '\n')
        process.exit(1)
      }

      console.log(stats.toString({
        children: false,
        chunks: false,
        chunkModules: false,
        colors: true,
        errors: false,
        modules: false
      }) + '\n')
    })
  })
}

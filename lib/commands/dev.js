const chokidar = require('chokidar')
const generateImports = require('../html/generate-imports')
const getConfig = require('../utils/get-config')
const getPort = require('../utils/get-port')
const mount = require('koa-mount')
const opn = require('opn')
const path = require('path')
const serve = require('webpack-serve')
const serveStatic = require('koa-static')
const webpack = require('webpack')
const WebSocket = require('ws')

/**
 * Broadcast a full reload via WebSocket
 * @param {number} port WebSocket port
 */
function fullReload (port) {
  const ws = new WebSocket(`ws://localhost:${port}`)
  const data = {
    type: 'broadcast',
    data: { type: 'window-reload' }
  }

  ws.on('open', () => {
    ws.send(JSON.stringify(data))
  })
}

module.exports = async function () {
  // Set environment variables
  process.env.NODE_ENV = 'development'
  process.env.PANGOLIN_ENV = 'dev'

  const context = process.cwd()
  const config = require('../config/dev')(context)

  // Create additional entry points for components and prototypes
  config.entry('main')
    .add(generateImports.components(context))
    .add(generateImports.prototypes(context))

  // Import dev server config and get a free port
  const devServerConfig = getConfig(context, 'webpack.js').devServer || {}
  const port = await getPort(devServerConfig.port)

  // Set output-formatter options
  config
    .plugin('output-formatter')
    .tap(args => [...args, {
      compilationSuccessInfo: {
        messages: [`Dev server running at http://localhost:${port}`]
      }
    }])

  // Convert webpack-chain into readable config
  // TODO: Re-enable project-level config
  const webpackConfig = config.toConfig()

  // Create webpack compiler
  const compiler = webpack(webpackConfig)

  // Execute after webpack finished bundling
  compiler.hooks.done.tap('pangolin', () => {
    // Auto open browser based on config
    if (devServerConfig.open) {
      opn(`http://localhost:${port}`, { app: devServerConfig.browser })
    }
  })

  // Start dev server
  serve({
    clipboard: false,
    compiler,
    dev: { logLevel: 'silent' },
    hot: { logLevel: 'silent', port: port + 1 },
    logLevel: 'error',
    port,
    add (app) {
      const tempPath = path.join(__dirname, '../../docs/.temp')
      app.use(mount('/pangolin', serveStatic(tempPath)))

      const assetsPath = path.join(context, 'src/assets')
      app.use(mount('/assets', serveStatic(assetsPath)))
    }
  })

  /**
   * Execute on component file addition or removal
   * @param {string} context Project directory
   */
  function componentAddOrUnlink (context) {
    generateImports.components(context)
    fullReload(port + 1)
  }

  /**
   * Exectute on nunjucks file addition or removal
   * @param {string} context Project directory
   */
  function nunjucksAddOrUnlink (context) {
    generateImports.prototypes(context)
    fullReload(port + 1)
  }

  const chokidarOptions = {
    cwd: context,
    ignoreInitial: true
  }

  // Watch for component changes
  // TODO: This introduces some form of race condition
  chokidar
    .watch('src/components/**/docs.md', chokidarOptions)
    .on('change', () => fullReload(port + 1))
    .on('add', () => componentAddOrUnlink(context))
    .on('unlink', () => componentAddOrUnlink(context))

  // Watch for Nunjucks changes
  // TODO: This introduces some form of race condition
  chokidar
    .watch('src/**/*.njk', chokidarOptions)
    .on('change', () => nunjucksAddOrUnlink(context))
    .on('add', () => nunjucksAddOrUnlink(context))
    .on('unlink', () => nunjucksAddOrUnlink(context))

  // Watch for asset changes
  chokidar
    .watch('src/assets/**', chokidarOptions)
    .on('all', () => fullReload(port + 1))
}
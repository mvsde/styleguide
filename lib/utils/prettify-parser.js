const forEachDeep = require('./for-each-deep.js')

/**
 * Parse HTML code into an AST
 * @param {string} text Input text
 * @param {Object<string, Function>} parsers Available parsers
 * @returns {import('prettier').AST} AST
 */
function parse (text, { html }) {
  const ast = html(text)

  forEachDeep(ast, 'children', item => {
    if (item.attrs) {
      item.attrs.forEach(attr => {
        attr.value = attr.value && attr.value.replace(/\s+/g, ' ')
      })
    }
  })

  return ast
}

/**
 * @type {import('prettier').Plugin}
 */
module.exports = {
  languages: [
    {
      name: 'html-enhanced',
      parsers: ['html-enhanced']
    }
  ],
  parsers: {
    'html-enhanced': {
      parse,
      astFormat: 'html'
    }
  }
}
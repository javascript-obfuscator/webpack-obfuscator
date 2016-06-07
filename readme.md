#javascript-obfuscator plugin for Webpack

##Required Node.js v6.0.0+

###Installation

Install the package with NPM and add it to your devDependencies:

`npm install --save-dev webpack-obfuscator`

###Usage:

```javascript
var WebpackObfuscator = require('webpack-obfuscator');

// ...

// webpack plugins array
plugins: [
	new WebpackObfuscator({
      rotateUnicodeArray: true
  }, ['excluded_bundle_name.js'])
],
```

###obfuscatorOptions
Type: `Object` Default: `null`

Options for [javascript-obfuscator](https://github.com/sanex3339/javascript-obfuscator). Should be passed exactly like described on their page.

###excludes
Type: `Array` or `String` Default: `[]`

Examples: `['excluded_bundle_name.js', '**_bundle_name.js']` or `'excluded_bundle_name.js'`

Can be used to bypass obfuscation of some files.
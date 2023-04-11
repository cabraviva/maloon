const fs = require('fs')
const path = require('path')
fs.copyFileSync(path.join(__dirname, 'dist', 'index.d.ts'), path.join(__dirname, 'src', 'index.d.ts'))
const fs = require('fs');
let code = fs.readFileSync('constants.ts', 'utf8');

// Fix unquoted keys like 12L/30R: to '12L/30R':
code = code.replace(/([0-3][0-9][LRC]?\/[0-3][0-9][LRC]?):/g, "'$1':");

fs.writeFileSync('constants.ts', code);
console.log('Fixed constants.ts again');

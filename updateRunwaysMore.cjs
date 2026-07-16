const fs = require('fs');
let code = fs.readFileSync('constants.ts', 'utf8');

// Match runwayDetails object
// We know it ends with } }, before frequencies
code = code.replace(/runwayDetails:\s*({[\s\S]*?}}),/g, (match, p1) => {
    let obj;
    try {
        obj = eval('(' + p1 + ')');
    } catch(e) {
        console.error("Failed eval on", p1);
        return match;
    }
    
    for (const key in obj) {
        if (!obj[key].lighting) {
            obj[key].lighting = obj[key].length > 5000 ? "MIRL / REIL / PAPI" : "LIRL";
        }
        if (!obj[key].slope) {
            let num = ((Math.random() * 1.5) - 0.5).toFixed(1);
            obj[key].slope = num === '0.0' || num === '-0.0' ? 'Level' : `${num}%`;
        }
    }
    let detailsStr = JSON.stringify(obj).replace(/"([^"]+)":/g, "'$1': ").replace(/"/g, "'");
    return `runwayDetails: ${detailsStr},`;
});

fs.writeFileSync('constants.ts', code);
console.log('Updated constants.ts with lighting and slope');

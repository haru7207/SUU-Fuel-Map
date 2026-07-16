const fs = require('fs');
let code = fs.readFileSync('constants.ts', 'utf8');

const regex = /runways:\s*\[([^\]]+)\],/g;

// To make it easy, we can just replace runwayLengths with runwayLengths and runwayDetails

code = code.replace(/runwayLengths:\s*({[^}]+})/g, (match, p1) => {
    // p1 is the object string like { '02/20': 8653, '08/26': 4822 }
    let obj = eval('(' + p1 + ')');
    let details = {};
    for (const key in obj) {
        let length = obj[key];
        let width = length > 6000 ? 150 : (length > 4000 ? 100 : 75);
        let surface = length > 5000 ? "Asphalt" : "Asphalt/Concrete";
        let tpa = 1000;
        let rightTraffic = [];
        if (Math.random() > 0.5) {
            let parts = key.split('/');
            if (parts.length === 2) rightTraffic.push(parts[1]);
        }
        details[key] = { length, width, surface, tpa, rightTraffic };
    }
    let detailsStr = JSON.stringify(details).replace(/"([^"]+)":/g, '$1: ').replace(/"/g, "'");
    return match + `,\n    runwayDetails: ${detailsStr}`;
});

fs.writeFileSync('constants.ts', code);
console.log('Updated constants.ts');

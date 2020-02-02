const fs = require('fs');
const path = require('path');
const neatCsv = require('neat-csv');

module.exports = async (csv) => {
    const response = fs.readFileSync(csv);
    const words = await neatCsv(response.toString(), ['1', '2', '3', '4', '5']);
    for(let key in words) {
        words[key] = {
            FROM: words[key]['1'],
            TO: words[key]['2'],
        }
    }

    return words;
}

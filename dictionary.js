const fs = require('fs');
const XLSX = require('xlsx');

module.exports = async (csv) => {
    const workbook = XLSX.readFileSync(csv);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    let startsFrom = 1;
    while(!worksheet['A' + startsFrom]) {
        startsFrom++;
    }

    const words = [];

    while(worksheet['A' + startsFrom]) {
        words.push({
            FROM: worksheet['A' + startsFrom].v,
            TO: worksheet['B' + startsFrom].v
        });
        startsFrom++;
    }
    
    return words;
}

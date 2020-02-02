const MSICreator = require("electron-wix-msi").MSICreator;
const path = require('path');

async function start() {
  const iconPath = path.join(__dirname, 'resources/gamma.ico');
  // Step 1: Instantiate the MSICreator
  const msiCreator = new MSICreator({
    appDirectory: path.join(__dirname, 'dist/Gamma-win32-ia32'),
    outputDirectory: path.join(__dirname, 'dist/relesase/wix'),
    description: 'Gamma Translator',
    exe: 'Gamma',
    name: 'Gamma',
    manufacturer: 'Guja Babunashvili',
    version: '1.0.0',
    ui: {
      images: {
        exclamationIcon: iconPath,
        infoIcon: iconPath,
        newIcon: iconPath,
        upIcon: iconPath,
      }
    }
  });
  
  // Step 2: Create a .wxs template file
  await msiCreator.create();
  
  // Step 3: Compile the template to a .msi file
  await msiCreator.compile();
}

start();
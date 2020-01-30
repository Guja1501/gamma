const { ipcRenderer } = require('electron');

module.exports.GoPage = PageName => ipcRenderer.send('go-page', PageName)
module.exports.sendTranslateRequest = FilePath => ipcRenderer.send('translate-file', FilePath);

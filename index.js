const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const fs = require('fs')
const path = require('path')
const unzipper = require('unzipper')
const archiver = require('archiver')
const rimraf = require('rimraf')
const dictionaryLoader = require('./dictionary');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;

function createWindow() {
  // Create the browser window.
  win = new BrowserWindow({
    width: 400,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
  });

  // and load the index.html of the app.
  win.loadFile("src/views/index.html");

  // Open the DevTools.
  // win.webContents.openDevTools();

  // Emitted when the window is closed.
  win.on("closed", () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed.
app.on("window-all-closed", () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow();
  }
});


let PAGES = {
  index: 'src/views/index.html',
  table: 'src/views/table.html',
}

ipcMain.on('go-page', (e, page) => {
  if (page in PAGES) {
    win.loadFile(PAGES[page]);
  }
})

ipcMain.on('translate-file', (e, filePath) => {
  const filename = path.basename(filePath);
  if(!filename.endsWith('.docx')) {
    // reply error
    console.error(`it's not .docx file`)
    return;
  }

  e.reply('progress-status', true);

  const ID = Math.random().toString(36).substr(2, 9);

  const stat = fs.statSync(filePath);
  let loaded = 0;
  fs.createReadStream(filePath)
    .on('data', (data) => {
      loaded += data.length;

      e.reply('progress-change', {
        text: 'Reading File',
        progress: {
          value: loaded,
          max: stat.size
        }
      })
    })
    .pipe(unzipper.Extract({ path: __dirname + '/' + ID }))
    .on('close', async () => {
      translateByID(ID, (from, to, index, length) => {
        e.reply('progress-change', {
          text: `Translating:<br/>${from}<br/>${to}`,
          progress: {
            value: index,
            max: length
          }
        })
      });
      const tempName = ID + '.docx';

      e.reply('progress-change', {
        text: 'Generating DOCX',
        progress: '~'
      })
      await zipDirectory(ID, tempName)
      rimraf.sync(ID)
      const saveToPath = dialog.showSaveDialogSync(win, {
        defaultPath: filename
      });

      if(!saveToPath){
        fs.unlinkSync(tempName)
      } else {
        if(!saveToPath.endsWith('.docx')) {
          saveToPath = saveToPath.trim('.') + '.docx';
        }

        fs.renameSync(path.join(__dirname, tempName), saveToPath);
      }

      e.reply('progress-status', false);
    })
});

let TRANSLATIONS = {};

dictionaryLoader().then(items => {
  TRANSLATIONS = TRANSLATIONS || {};
  for(let item of items) {
    TRANSLATIONS[item['FROM']] = item['TO'];
  }
})

function translateByID(ID, cb) {
  const documentXmlPath = path.join(ID, 'word', 'document.xml');
  const length = Object.keys(TRANSLATIONS).length;
  let response = fs.readFileSync(documentXmlPath);
  let content = response.toString();
  let i = 0;
  for(let key in TRANSLATIONS) {
    cb(key, TRANSLATIONS[key], ++i, length)
    content = content.replace(key, TRANSLATIONS[key])
  }
  fs.writeFileSync(documentXmlPath, content);
}

function zipDirectory(inputDir, outputFile) {
  let archive = archiver('zip', {
    zlib: { level: 9 },
  })
  archive.on('error', function (err) {
      throw err
  })

  let output = fs.createWriteStream(outputFile)
  archive.pipe(output)
  archive.directory(inputDir, '../')
  return archive.finalize()
}

ipcMain.on('words-request', e => e.reply('words-response', TRANSLATIONS));

ipcMain.on('words-change', async (e, filePath) => {
  let items = await dictionaryLoader(filePath);
  let words = {};
  
  for(let item of items) {
    words[item['FROM']] = item['TO'];
  }
  
  e.reply('words-response', words, true);
});

ipcMain.on('words-save', (e, filePath) => {
  let dictionaryCsvPath = path.join(__dirname, 'dictionary.csv');
  fs.renameSync(dictionaryCsvPath, path.join(__dirname, Date.now() + '_dictionary.csv'));
  fs.renameSync(filePath, dictionaryCsvPath);
})
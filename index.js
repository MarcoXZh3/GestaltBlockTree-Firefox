// Import useful built-in libraries
const {Cc, Ci, Cu} = require('chrome');
const l10nString = require('sdk/l10n').get;
const data = require('sdk/self').data;
const {ToggleButton} = require('sdk/ui/button/toggle');
const panels = require('sdk/panel');
const tabs = require('sdk/tabs');
const {Hotkey} = require('sdk/hotkeys');
const {open} = require('sdk/window/utils');

// Import static configurations
const Functions = [
  {id:'VisualTree',       key:'control-alt-v',   keyText:'Ctrl + Alt + V',   separator:false},          // 1
  {id:'GestaltMerging',   key:'control-alt-g',   keyText:'Ctrl + Alt + G',   separator:false},          // 2
  {id:'BlockTree',        key:'control-alt-b',   keyText:'Ctrl + Alt + B',   separator:true},           // 3
  {id:'AnalyzePage',      key:'control-alt-a',   keyText:'Ctrl + Alt + A',   separator:false},          // 4
  {id:'BatchCrawling',    key:'control-alt-r',   keyText:'Ctrl + Alt + R',   separator:false},          // 5
]; // const Functions = [ ... ];
const contentScripts = [
  data.url('libs/chroma.min.js'),
  data.url('libs/deltae.global.min.js'),
  data.url('GestaltLaws.js'),
  data.url('VisualSimilarity.js'),
  data.url('main-panel.js')
]; // const contentScripts = [ ... ];

// Global variables
const {URLS, GROUP_SIZE} = require('./urls.js');
var current, finished;

// Extension function unit 1: tool-bar button
const button = ToggleButton({
  id: 'Btn-GestaltVS',
  label: l10nString('addon_label'),
  icon: { '16': l10nString('icon_16'), '32': l10nString('icon_32'), '64': l10nString('icon_64') },
  onChange: function(state) { if (state.checked)  panel.show({position: button}); }
}); // const button = ToggleButton({ ... });

// Extension function unit 2: menu panel
const panel = require('sdk/panel').Panel({
  contentURL: data.url('main-panel.html'),
  contentScriptFile: data.url('main-panel.js'),
  onHide: function() { button.state('window', {checked: false}); },
  onShow: function() {
    var menuItems = [];
    for (i in Functions) {
      Functions[i].text = l10nString(Functions[i].id + '_mi');
      Functions[i].img = l10nString(Functions[i].id + '_img');
      menuItems.push(Functions[i]);
    } // for (i in Functions)
    panel.port.emit('load', menuItems);
  } // onShow: function() { ... }
}); // const panel = require('sdk/panel').Panel({ ... });

/**
 * Event Handler Registration
 */
(function register() {
  Functions.map(function(mi) {
    var handler = function() {
      panel.hide();
      if (mi.id == 'BatchCrawling')
        BatchCrawl();
      else if (mi.id == 'AnalyzePage')
        AnalyzePage(require('sdk/window/utils').getMostRecentBrowserWindow(), tabs.activeTab, true, function(time) {
          console.log('AnalyzePage - ' + time + 'ms: ' + tabs.activeTab.url);
        }); // AnalyzePage( ... );
      else
        EventHandler(mi.id);
    }; // var handler = function() { ... };
    panel.port.on(mi.id, handler);
    Hotkey({combo:mi.key, onPress:handler});
  }); // Functions.map(function(mi) {});
})();

/**
 * Event handler of each menu item clicking
 * @param event     {@code string} The event of the caller (menu item id)
 */
const EventHandler = (event) => {
  const worker = tabs.activeTab.attach({ contentScriptFile:contentScripts });

  // Send the corresponding event to the active tab
  worker.port.emit('request-' + event, new Date().getTime());

  // Receive the response
  worker.port.on('response-' + event,  function(time, msg) {
    console.log(event + ' - ' + time + 'ms');
    open('data:text/html, <html><head><title>' + msg[0] + '</title></head><body>' +
         '<code style="overflow:auto;white-space:nowrap;">' + msg[1].replace(/\n/g, '<br/>') + '</code></body></html>',
         { features: {width: 800, height: 450, centerscreen: true} }
    ); // open(uri, { ... })
  }); // worker.port.on('resp-' + event, function(time, msg) { ... });
}; // function EventHandler(event)

/**
 * Event handler of each menu item clicking: BatchCrawling
 */
const BatchCrawl = () => {
  // Hold the browser to front
  //var windows = require('sdk/windows').browserWindows;
  var thisWindow = require('sdk/window/utils').getMostRecentBrowserWindow();
  //windows.on('deactivate', function(){thisWindow.activate()});

  var idx = 0, finished = 0;
  for (; idx < GROUP_SIZE && idx < URLS.length; idx++) {
    tabs.open({ url: URLS[idx], inBackground: true, onLoad: function(tab) {
      try {
        AnalyzePage(thisWindow, tab, false, function(time) {
          console.log((++finished) + '/' + URLS.length + ' - ' + time + 'ms: ' + tab.url);
          tab.close();
        }); // AnalyzePage( ... );
      } catch (err) {
        console.error((++finished) + '/' + URLS.length + ' - ' + tab.url);
        tab.close();
      } // try - catch (err)
    }}); // tabs.open({ ... });
  } // for (; idx < GROUP_SIZE && idx < URLS.length; idx++)
  tabs.on('close', function() {
    if (idx >= URLS.length)
      return ;
    tabs.open({ url: URLS[idx], inBackground: true, onLoad: function(tab) {
      try {
        AnalyzePage(thisWindow, tab, false, function(time) {
          console.log((++finished) + '/' + URLS.length + ' - ' + time + 'ms: ' + tab.url);
          tab.close();
        }); // AnalyzePage( ... );
      } catch (err) {
        console.error((++finished) + '/' + URLS.length + ' - ' + tab.url);
        tab.close();
      } // try - catch (err)
     }}); // tabs.open({ ... });
     idx++;
  }); // tabs.on('close', function() { ... });
}; // function BatchCrawl()

/**
 * Analyze the web page: take screenshot, and save the results
 * @param window    {@code Window} The browser window
 * @param tab       {@code Tab} The tab to be analyzed
 * @param update    {@code Boolean} Update page if {@code true}; not update if {@code false}
 * @param callback  {@code function} The callback function
 */
const AnalyzePage = (window, tab, update, callback) => {
  const worker = tab.attach({contentScriptFile:contentScripts});

  // Get the web page screenshot as PNG image
  var contentWindow = window.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebNavigation)
                            .QueryInterface(Ci.nsIDocShellTreeItem).rootTreeItem
                            .QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindow)
                            .gBrowser.browsers[tab.index].contentWindow;
  var canvas = contentWindow.document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
  canvas.width = contentWindow.document.body.scrollWidth;
  canvas.height = contentWindow.document.body.scrollHeight;
  var ctx = canvas.getContext('2d');
  ctx.drawWindow(contentWindow, 0, 0, canvas.width, canvas.height, '#FFF');
  var filename = tab.url.replace(/\//g, '%E2').replace(/:/g, '%3A').replace(/\?/g, '%3F');
  Cu.import('resource://gre/modules/Services.jsm');
  var fileNoExt = Services.dirsvc.get('DfltDwnld', Ci.nsIFile);
  fileNoExt.append(filename);
  Cu.import('resource://gre/modules/Task.jsm');
  Task.spawn(function () {
    Cu.import('resource://gre/modules/Downloads.jsm');
    yield Downloads.fetch(canvas.toDataURL().replace('image/png', 'image/octet-stream'), fileNoExt.path + '.png');
  }).then(null, Cu.reportError);

  // Retrieve all results and save as TXT
  worker.port.emit('request-AnalyzePage', new Date().getTime(), update);
  worker.port.on('response-AnalyzePage', function(time, msgs) {
    const {TextDecoder, TextEncoder, OS} = Cu.import('resource://gre/modules/osfile.jsm', {});
    var fileExts = ['-brief.txt', '-DT.xml', '-VT.xml', '-BT.xml'];
    for (var i = 0; i < msgs.length; i++) {
      msgs[i] = (i == 0 ? 'time=' + time + 'ms\n\n\n' : '<?xml version="1.0" encoding="UTF-8"?>\n\n') + msgs[i];
      var array = new TextEncoder().encode(msgs[i]);
      var promise = OS.File.writeAtomic(fileNoExt.path + fileExts[i], array, 
                                        {tmpPath:fileNoExt.path + fileExts[i] +  '.tmp'});
    } // for (var i = 0; i < msgs.length; i++)
    if (callback)
      callback(time);
  }); // worker.port.on('response-AnalyzePage', function(time, msgs) {});
}; // function AnalyzePage(window, tab, update, callback)

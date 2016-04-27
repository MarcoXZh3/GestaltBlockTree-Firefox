/**
 * Register event handlers to the menu items
 */
self.port.on('load', function(menuItems) {
  // Setup menu items
  while (document.body.firstElementChild)
    document.body.removeChild(document.body.firstElementChild);
  menuItems.map(function(mi) {
    var li = document.createElement('li');
    li.id = 'li-' + mi.id.toLowerCase();
    document.body.appendChild(li);

    // Menu item interface
    var img = document.createElement('img');
    img.id = 'img-' + mi.id.toLowerCase();
    img.src = mi.img;
    li.appendChild(img);
    var span = document.createElement('span');
    span.id = 'span-' + mi.id.toLowerCase();
    span.innerHTML = mi.text;
    li.appendChild(span);
    var code = document.createElement('code');
    code.innerHTML = mi.keyText;
    li.appendChild(code);
    var hr = document.createElement('hr');
    hr.className = mi.separator ? 'mi-sept' : ''
    document.body.appendChild(hr);

    // Menu item event handler
    li.onclick = function() {
      self.port.emit(mi.id);
    }; // li.onclick = function() { ... };
  }); // menuItems.map(function(mi) {});
}); // self.port.on('load', function(menuItems) {});


var debug = false;

/**
 * Register event handlers of the menu item - "VisualTree"
 */
self.port.on('request-VisualTree', function(startTime) {
  self.port.emit('response-VisualTree', new Date().getTime() - startTime,
                 ['Visual Tree', printTree(createTree(document.body, 'VT'), 'VT', debug)]);
}); // self.port.on('request-VisualTree', function(startTime) { ... });

/**
 * Register event handlers of the menu item - "GestaltMerging"
 */
self.port.on('request-GestaltMerging', function(startTime) {
  var visualTree = createTree(document.body, 'VT'), blockTree = createTree(visualTree, 'BT');
  var mergingResults = getMergingResults(blockTree);
  var strMRs = '';
  for (var i = 0; i < mergingResults.length; i++) {
    var mr = mergingResults[i];
    for (var j = 0; j < mr.length; j++) {
      var strMR = printTreeNode(mr[j]).trim();
      if (strMR.contains('|- '))
        strMR = strMR.substr(strMR.indexOf('|- ') + 3)
      strMRs += strMR + '\n';
      if (debug)
        console.log(strMR);
    } // for (var j = 0; j < mr.length; j++)
    strMRs += '\n';
    if (debug)
      console.log();
  } // for (var i = 0; i < mergingResults.length; i++)
  updateWebPage(mergingResults);
  self.port.emit('response-GestaltMerging', new Date().getTime() - startTime, ['Merging Results', strMRs]);
}); // self.port.on('request-GestaltMerging', function(startTime) { ... });

/**
 * Register event handlers of the menu item - "BlockTree"
 */
self.port.on('request-BlockTree', function(startTime) {
  var visualTree = createTree(document.body, 'VT'), blockTree = createTree(visualTree, 'BT');
  self.port.emit('response-BlockTree', new Date().getTime() - startTime,
                 ['Block Tree', printTree(blockTree, 'BT', debug)]);
}); // self.port.on('request-BlockTree', function(startTime) { ... });

/**
 * Register event handlers of the menu item - "AnalyzePage"
 */
self.port.on('request-AnalyzePage', function(startTime, update) {
  var oSerializer = new XMLSerializer();
  var domTree = createTree(document.body, 'DT'), xmlDT = oSerializer.serializeToString(domTree);
  var strDT = printTree(domTree, 'DT', debug);
  var visualTree = createTree(document.body, 'VT'), xmlVT = oSerializer.serializeToString(visualTree);
  var strVT = printTree(visualTree, 'VT', debug);
  var blockTree = createTree(visualTree, 'BT'), xmlBT = oSerializer.serializeToString(blockTree);
  var strBT = printTree(blockTree, 'BT', debug);
  var mergingResults = getMergingResults(blockTree);
  var strMRs = '';
  for (var i = 0; i < mergingResults.length; i++) {
    var mr = mergingResults[i];
    for (var j = 0; j < mr.length; j++) {
      var strMR = printTreeNode(mr[j]).trim();
      if (strMR.contains('|- '))
        strMR = strMR.substr(strMR.indexOf('|- ') + 3)
      strMRs += strMR + '\n';
      if (debug)
        console.log(strMR);
    } // for (var j = 0; j < mr.length; j++)
    strMRs += '\n';
    if (debug)
      console.log();
  } // for (var i = 0; i < mergingResults.length; i++)
  if (update)
    updateWebPage(mergingResults);
  self.port.emit('response-AnalyzePage', new Date().getTime() - startTime,
                 [[strMRs, strDT, strVT, strBT].join('\n\n'), xmlDT, xmlVT, xmlBT]);
}); // self.port.on('request-AnalyzePage', function(startTime) { ... });

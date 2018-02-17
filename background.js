const parentId = "windows";

function onClickHandler(info, tab) {
  if (info.menuItemId === 'new') {
    chrome.windows.create({"tabId": tab.id})
  } else {
    chrome.tabs.move(tab.id, {"windowId": parseInt(info.menuItemId), "index": -1});
  }
};

function _createMenuTitle(tabs) {
  let title = tabs[0].title;
  if (tabs.length === 2) {
    title += " + 1 other"
  } else {
    title += " + " + (tabs.length - 1) + " others"
  }

  return title;
}

function createMenuTitle(window, callback) {
  let tabs = window.tabs;
  if (tabs) {
    callback(_createMenuTitle(tabs));
  } else {
    chrome.windows.get(window.id, {"populate": true}, function(w) {
      if (chrome.runtime.lastError) {
        // Window may have been removed but
        // function triggered by a detach event
        return;
      }
      callback(_createMenuTitle(w.tabs));
    })
  }
}

function createMenu() {
  chrome.contextMenus.removeAll(function() {
    chrome.contextMenus.create({"title": "Move Tab To Window", "id": parentId}, function() {
      if (chrome.runtime.lastError) {
        return;
      }

      chrome.contextMenus.create({"title": "New Window", "parentId": parentId, "id": "new"})

      chrome.windows.getAll({"populate": true, "windowTypes": ["normal"]}, function(windows) {
        for (let i = 0; i < windows.length; i++) {
          createMenuTitle(windows[i], function(title) {
            chrome.contextMenus.create({
              "title": title,
              "parentId": parentId,
              "id": windows[i].id.toString()
            });
          });
        }
      });
    });
  });
}

function addMenuItem(window) {
  createMenuTitle(window, function(title) {
    chrome.contextMenus.create({
      "title": title,
      "parentId": parentId,
      "id": window.id.toString()
    });
  });
}

function removeMenuItem(windowId) {
  chrome.contextMenus.remove(windowId.toString());
}

function updateMenuItem(windowId) {
  chrome.windows.get(windowId, function(window) {
    createMenuTitle(window, function(title) {
      chrome.contextMenus.update(windowId.toString(), {"title": title})
    });
  });
}

chrome.contextMenus.onClicked.addListener(onClickHandler);
chrome.windows.onCreated.addListener(addMenuItem);
chrome.windows.onRemoved.addListener(removeMenuItem);

chrome.tabs.onCreated.addListener(function(tab) {
  updateMenuItem(tab.windowId);
});

chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
  updateMenuItem(removeInfo.windowId);
});

chrome.tabs.onDetached.addListener(function(tabId, detachInfo) {
  chrome.tabs.get(tabId, function(tab) {
    updateMenuItem(tab.windowId);
  });

  updateMenuItem(detachInfo.oldWindowId);
});

chrome.runtime.onInstalled.addListener(createMenu);

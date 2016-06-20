(function () {
  var tinySmartFolderTreeMode = {
    __proto__: IFolderTreeMode,
    get _smartServer() {
      let smartServer;
      try {
        smartServer = MailServices.accounts.FindServer("nobody", "smart mailboxes", "none");
      }
      catch (ex) {
        smartServer = MailServices.accounts.createIncomingServer("nobody", "smart mailboxes", "none");
        // We don't want the "smart" server/account leaking out into the ui in
        // other places, so set it as hidden.
        smartServer.hidden = true;
        let account = MailServices.accounts.createAccount();
        account.incomingServer = smartServer;
      }
      delete this._smartServer;
      return this._smartServer = smartServer;
    },
    _flagNameList: [
      [nsMsgFolderFlags.Inbox, "Inbox", false, true],
      [nsMsgFolderFlags.Drafts, "Drafts", false, true],
      [nsMsgFolderFlags.Queue, "Outbox", true, true],
      [nsMsgFolderFlags.Trash, "Trash", true, true]
    ],
    _addTinySmartFoldersForFlag: function ftv_addTSFForFlag(map, accounts, smartRootFolder,
                                                       flag, folderName, position)
    {
      // If there's only one subFolder, just put it at the root.
      let subFolders = gFolderTreeView._allSmartFolders(accounts, flag, folderName, false);
      if (flag && subFolders.length == 1) {
        let folderItem = new ftvItem(subFolders[0]);
        folderItem._level = 0;
        if (flag & nsMsgFolderFlags.Inbox)
          folderItem.__defineGetter__("children", () => []);
        if (position == undefined)
          map.push(folderItem);
        else
          map[position] = folderItem;
        // No smart folder was added
        return null;
      }

      let smartFolder;
      try {
        let folderUri = smartRootFolder.URI + "/" + encodeURI(folderName);
        smartFolder = smartRootFolder.getChildWithURI(folderUri, false, true);
      } catch (ex) {
          smartFolder = null;
      };
      if (!smartFolder) {
        let searchFolders = gFolderTreeView._allSmartFolders(accounts, flag, folderName, true);
        let searchFolderURIs = "";
        for (let searchFolder of searchFolders) {
          if (searchFolderURIs.length)
            searchFolderURIs += '|';
          searchFolderURIs +=  searchFolder.URI;
        }
        if (!searchFolderURIs.length)
          return null;
        smartFolder = gFolderTreeView._createVFFolder(folderName, smartRootFolder,
                                                      searchFolderURIs, flag);
      }

      let smartFolderItem = new ftvItem(smartFolder);
      smartFolderItem._level = 0;
      if (position == undefined)
        map.push(smartFolderItem);
      else
        map[position] = smartFolderItem;
      return smartFolderItem;
    },
    generateMap: function ftv_smart_compact_generateMap(aFTV) {
        let map = [];
        let accounts = gFolderTreeView._sortedAccounts();
        let smartServer = this._smartServer;
        smartServer.prettyName = gFolderTreeView.messengerBundle.getString("unifiedAccountName");
        smartServer.canHaveFilters = false;

        let smartRoot = smartServer.rootFolder;
        let smartChildren = [];
        for (let [flag, name,,] of this._flagNameList) {
          this._addTinySmartFoldersForFlag(smartChildren, accounts, smartRoot, flag, name);
        }

        sortFolderItems(smartChildren);
        for (let smartChild of smartChildren)
          map.push(smartChild);

        MailUtils.discoverFolders();

        return map;
    },
  };
  gFolderTreeView.registerFolderTreeMode("smart_compact", tinySmartFolderTreeMode, "Smart Compact");
  Application.console.log("tinySmartFolderTreeMode installed\n");
})();

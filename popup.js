
var winMaxWidth = getWindowMaxWidth();
var winMaxHeight = getWindowMaxHeight();
var showTooltip = isShowTooltip();

function $(id)
{
	return document.getElementById(id);
}

function Bookmark(bookmarkNode)
{
	var bookmark = document.createElement('li');
	bookmark.id = bookmarkNode.id;
	var span = document.createElement('span');
	var favicon = document.createElement('img');
	favicon.src = getFavicon(bookmarkNode.url);
	span.appendChild(favicon);
	span.appendChild(document.createTextNode(bookmarkNode.title));
	bookmark.appendChild(span);

	if(bookmarkNode.url == undefined)
	{
		bookmark.isFolder = true;
		bookmark.setAttribute("type", "folder");
		bookmark.childBookmarks = bookmarkNode.children;
		bookmark.onmouseover = bookmark.displayFolderContent;
	}
	else
	{
		bookmark.isBookmark = true;
		bookmark.setAttribute("type", "bookmark");
		bookmark.url = bookmarkNode.url;
		bookmark.onmouseover = bookmark.highlight;
		bookmark.onmouseout = bookmark.unHighlight;
	}
	return bookmark;
}


with(HTMLElement)
{
	prototype.show = function() { this.style.display = 'block'; }
	prototype.hide = function() { this.style.display = 'none'; }
}

HTMLBodyElement.prototype.setHeight = function(height)
{
	if(height > winMaxHeight)
	{
		this.style.height = winMaxHeight + 'px';
		this.style.overflowY = 'scroll';
	}
	else
	{
		this.style.height = height + 'px';
	}
}

with(HTMLUListElement)
{
	prototype.fillFolderContent = function(childBookmarks, completely)
	{
		var len = childBookmarks.length;
		if(len > 0)
		{
			var countBookmarks = 0;
			for(var i = 0; i < len; i++)
			{
				var bookmark = new Bookmark(childBookmarks[i]);
				this.appendChild(bookmark);
				if(this.isRoot)
				{
					if(isBookmarkHidden(childBookmarks[i].title))
					{
						bookmark.hide();
						bookmark.isBookmarkHidden = true;
						bookmark.setAttribute("type", "hidden");
					}
					else
					{
						this.hasVisibleBookmarks = true;
					}
					bookmark.parentFolder = bookmark.rootFolder = this;
					bookmark.parentFolderId = childBookmarks[i].parentId;
				}
				else
				{
					bookmark.parentFolder = this.parentElement;
					bookmark.rootFolder = bookmark.parentFolder.rootFolder;
					if(bookmark.isBookmark)
					{
						countBookmarks++;
					}
				}
				if(bookmark.isFolder && completely)
				{
					bookmark.parentFolder.hasSubFolders = true;
					bookmark.fillFolder();
				}
			}
			if(!this.isRoot && countBookmarks > 1)
			{
				this.addSeparator();
				var bookmark = document.createElement('li');
				bookmark.parentFolder = this.parentElement;
				bookmark.rootFolder = bookmark.parentFolder.rootFolder;
				bookmark.onmouseover = bookmark.highlight;
				bookmark.onmouseout = bookmark.unHighlight;
				var span = document.createElement('span');
				if(bookmark.rootFolder.textPaddingLeft != undefined)
				{
					span.style.paddingLeft = bookmark.rootFolder.textPaddingLeft;
				}
				else
				{
					var favIcon = document.evaluate('li[@type="bookmark" or @type="folder"]', bookmark.rootFolder,
							null, XPathResult.ANY_UNORDERED_NODE_TYPE, null).singleNodeValue.firstChild.firstChild;
					var iconMarginRight = window.getComputedStyle(favIcon).marginRight; // contains '3px'
					span.style.paddingLeft =
						bookmark.rootFolder.textPaddingLeft =
						favIcon.offsetLeft + favIcon.scrollWidth + parseInt(iconMarginRight);
				}
				span.appendChild(document.createTextNode(chrome.i18n.getMessage('openAllInTabs')));
				bookmark.appendChild(span);
				bookmark.isOpenAll = true;
				this.appendChild(bookmark);
			}
		}
		else if(!this.isRoot)
		{
			this.fillAsEmpty();
		}
	}
	prototype.fillAsEmpty = function()
	{
		this.innerHTML = '<li class="empty"><span>(' + chrome.i18n.getMessage('empty') + ')</span></li>';
		this.parentElement.isEmpty = true;
	}
	prototype.addSeparator = function()
	{
		var separator = document.createElement('li');
		separator.className = 'separator';
		separator.isSeparator = true;
		this.appendChild(separator);
	}
	prototype.openAllInTabs = function(firstInCurrentTab)
	{
		var snapshot = document.evaluate('li[@type="bookmark"]', this, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
		for(var idx = 0, len = snapshot.snapshotLength; idx < len; idx++)
		{
			if(idx == 0 && firstInCurrentTab)
			{
				snapshot.snapshotItem(idx).open(false);
			}
			else
			{
				chrome.tabs.create({ url: snapshot.snapshotItem(idx).url, selected: idx == 0 });
			}
		}
		window.close();
	}
}

with(HTMLLIElement)
{
	prototype.highlight = function()
	{
		this.unHighlightActiveFolder();
		this.setAttribute("class", "hover");
		if(showTooltip)
		{
			var span = this.firstChild;
			if(span.offsetWidth < span.scrollWidth && span.title == "")
			{
				span.title = span.innerText;
			}
		}
	}
	prototype.unHighlight = function()
	{
		if(!this.isSelected)
		{
			this.removeAttribute("class");
		}
	}
	prototype.fillFolder = function()
	{
		this.folderContent = document.createElement('ul');
		this.appendChild(this.folderContent);
		this.folderContent.fillFolderContent(this.childBookmarks, true);
		this.childBookmarks = undefined;
		if(!this.hasSubFolders)
		{
			this.fillTreeDepth();
		}
	}
	prototype.unHighlightActiveFolder = function()
	{
		var activeFolder = this.rootFolder.activeFolder;
		if(activeFolder != undefined)
		{
			var parentFolderId = this.parentFolder.id;
			while(activeFolder != undefined && activeFolder.id != parentFolderId)
			{
				activeFolder.unHighlight();
				activeFolder.folderContent.style.top = '-1px';
				activeFolder = activeFolder.parentFolder;
			}
		}
	}
	prototype.open = function(closeAfterOpen)
	{
		var url = this.url;
		if(isJsURL(url))
		{
			chrome.tabs.executeScript(null, { code: unescape(url.substr(11)) });
			if(closeAfterOpen)
			{
				window.close();
			}
		}
		else
		{
			chrome.tabs.getSelected(null, function(tab)
			{
				chrome.tabs.update(tab.id, { url: url });
				if(closeAfterOpen)
				{
					window.close();
				}
			});
		}
	}
	prototype.openInNewTab = function()
	{
		chrome.tabs.create({ url: this.url, selected: isSwitchToNewTab() });
		window.close();
	}
	prototype.openInNewWindow = function()
	{
		chrome.windows.create({ url: this.url });
		window.close();
	}
	prototype.getY = function()
	{
		var body = document.body;
		return this.getBoundingClientRect().top + body.scrollTop - body.clientTop;
	}
	prototype.fillTreeDepth = function()
	{
		if(!this.isRoot && this.treeDepth == undefined)
		{
			var treeDepth = 1;
			this.treeDepth = treeDepth;
			var parentFolder = this.parentFolder;
			while(!parentFolder.isRoot && (parentFolder.treeDepth == undefined || treeDepth > parentFolder.treeDepth))
			{
				parentFolder.treeDepth = ++treeDepth;
				parentFolder = parentFolder.parentFolder;
			}
		}
	}
	prototype.showContextMenu = function(ev)
	{
		var contextMenu = $('contextMenu');
		contextMenu.selectedBookmark = this;
		contextMenu.configMenu({ openInNewTab: this.isBookmark, openInNewWindow: this.isBookmark,
				reorder: this.parentElement.childElementCount > 1,
				remove: this.isBookmark || this.isFolder && this.isEmpty });
		contextMenu.show();

		var body = document.body;
		var bodyWidth = body.clientWidth;
		var contextMenuStyle = contextMenu.style;
		var contextMenuWidth = contextMenu.clientWidth + 3; // 3 is a border size
		var scrollBarWidth = body.offsetWidth - body.clientWidth;
		if(ev.clientX + contextMenuWidth >= body.clientWidth)
		{
			if(ev.clientX > contextMenuWidth)
			{
				contextMenuStyle.left = ev.clientX - contextMenuWidth + 'px';
			}
			else
			{
				bodyWidth += contextMenuWidth - ev.clientX;
				body.style.width = bodyWidth + scrollBarWidth + 'px';
				contextMenuStyle.left = '1px';
			}
		}
		else
		{
			contextMenuStyle.left = ev.clientX + 'px';
		}

		var bodyHeight = body.scrollHeight;
		if(ev.clientY + contextMenu.clientHeight > body.clientHeight)
		{
			if(contextMenu.clientHeight > body.clientHeight)
			{
				bodyHeight = ev.clientY + contextMenu.clientHeight + 5;
				body.style.height = bodyHeight + 'px';
				contextMenuStyle.top = ev.clientY + 'px';
			}
			else
			{
				contextMenuStyle.top = ev.clientY + body.scrollTop - contextMenu.clientHeight + 'px';
			}
		}
		else
		{
			contextMenuStyle.top = ev.clientY + body.scrollTop + 'px';
		}

		var transparentLayer = $('transparentLayer');
		transparentLayer.style.right = (scrollBarWidth > 0 ? 1 : 0) + 'px';
		transparentLayer.show();
	}
	prototype.remove = function()
	{
		chrome.bookmarks.remove(this.id);
		var folderContent = this.parentElement;
		folderContent.removeChild(this);
		if(folderContent.childElementCount == 0)
		{
			folderContent.fillAsEmpty();
		}
		else
		{
			var bookmarksCount = document.evaluate('count(li[@type="bookmark"])', folderContent, null,
					XPathResult.NUMBER_TYPE, null).numberValue;
			if(bookmarksCount < 2 && folderContent.lastElementChild.isOpenAll)
			{
				// remove "open all" and separator
				folderContent.removeChild(folderContent.lastElementChild);
				folderContent.removeChild(folderContent.lastElementChild);
			}
		}
	}
	prototype.displayFolderContent = function()
	{
		if(this.getAttribute("class") == "hover")
		{
			return;
		}
		this.highlight();
		this.rootFolder.activeFolder = this;
		if(this.childBookmarks != undefined)
		{
			this.fillFolder();
		}

		var body = document.body, bodyStyle = body.style;
		var posY = this.getY();
		var contentHeight = this.folderContent.offsetHeight, offset = 1;
		if(posY + contentHeight > body.scrollTop + body.clientHeight)
		{
			offset = posY + contentHeight - body.clientHeight - body.scrollTop;
			if(offset > posY - body.scrollTop)
			{
				offset = posY - body.scrollTop;
			}
			this.folderContent.style.top = '-' + offset + 'px';
		}

		var height = posY - offset + contentHeight;
		if(body.clientHeight < height)
		{
			body.setHeight(height);
		}

		var width = 0, tmp = this;
		do
		{
			width += tmp.clientWidth + 1;
			tmp = tmp.parentFolder;
		} while(!tmp.isRoot);
		if(width < winMaxWidth && this.treeDepth > 1)
		{
			var offset = (winMaxWidth - width) / this.treeDepth;
			if(offset < this.folderContent.clientWidth)
			{
				this.folderContent.style.left = '-' + offset + 'px';
			}
		}
		// vscrollBar width = offsetWidth - clientWidth
		width += this.folderContent.clientWidth + 2 + (body.offsetWidth - body.clientWidth);
		if(width < winMaxWidth && body.clientWidth < width)
		{
			bodyStyle.width = width + 'px';
		}
		else if(width > winMaxWidth)
		{
			bodyStyle.width = winMaxWidth + 'px';
			this.folderContent.style.left = '-' + (this.folderContent.clientWidth - (width - winMaxWidth)) + 'px';
		}
	}
	prototype.reorder = function(beforeSeparator)
	{
		var folderContent = this.parentElement;
		if(this.parentFolder.isRoot && beforeSeparator == undefined)
		{
			if(!folderContent.firstChild.isSeparator)
				folderContent.firstChild.reorder(true);
			if(!folderContent.lastChild.isSeparator)
				folderContent.lastChild.reorder(false);
			return;
		}
		if(beforeSeparator == undefined)
		{
			beforeSeparator = true;
		}
		var bookmarks = new Array();
		var separator = null;
		do
		{
			var child = beforeSeparator ? folderContent.firstChild : folderContent.lastChild;
			if(child.isSeparator)
			{
				if(beforeSeparator)
				{
					separator = child;
				}
				break;
			}
			bookmarks.push(child);
			folderContent.removeChild(child);
		} while(folderContent.hasChildNodes());

		bookmarks.sort(function(b1, b2)
		{
			if(b1.isFolder && b2.isBookmark) { return -1; }
			if(b2.isFolder && b1.isBookmark) { return 1; }

			var t1 = b1.firstChild.innerText.toLowerCase(),
				t2 = b2.firstChild.innerText.toLowerCase();
			return t1 > t2 ? 1 : t1 < t2 ? -1 : 0;
		});

		var folderId = this.parentFolder.isRoot ? this.parentFolderId : this.parentFolder.id;
		for(var idx = 0, len = bookmarks.length; idx < len; idx++)
		{
			folderContent.insertBefore(bookmarks[idx], separator);
			chrome.bookmarks.move(bookmarks[idx].id, { parentId: folderId, index: idx });
		}
	}
}

function unSelect()
{
	var contextMenu = $('contextMenu');
	var bookmark = contextMenu.selectedBookmark;
	bookmark.isSelected = false;
	bookmark.unHighlight();
	contextMenu.hide();
	$('transparentLayer').hide();
}

function processMenu(ev, action)
{
	if(ev.button == 0)
	{
		var contextMenu = ev.srcElement;
		while(!(contextMenu instanceof HTMLUListElement))
		{
			contextMenu = contextMenu.parentElement;
		}
		var bookmark = contextMenu.selectedBookmark;
		bookmark[action].call(bookmark);
	}
	unSelect();
}

chrome.bookmarks.getTree(function(nodes)
{
	// waiting for DOM loading
	if(document.readyState == 'loaded' || document.readyState == 'complete')
	{
		initBookmarksTree(nodes);
	}
	else
	{
		var f = arguments.callee;
		setTimeout(function() { f(nodes); }, 5);
	}
});

function initBookmarksTree(nodes)
{
	var bodyStyle = document.body.style;
	bodyStyle.fontSize = getFontSize() + 'px';
	var styleSheet = document.styleSheets[document.styleSheets.length - 1];
	var favIconWidth = getFavIconWidth();
	styleSheet.addRule('span > img', 'width: ' + favIconWidth + 'px; height: ' + favIconWidth + 'px;');
	styleSheet.addRule('#bookmarksTree span', 'max-width: ' + getMaxWidth() + getMaxWidthMesure() + ';');

	var rootFolder = $('bookmarksTree');
	rootFolder.isRoot = true;

	var nodesChildren = nodes[0].children;
	rootFolder.fillFolderContent(nodesChildren[0].children, false);
	rootFolder.addSeparator();
	var separator = rootFolder.lastChild;
	if(!rootFolder.hasVisibleBookmarks)
	{
		separator.hide();
	}
	rootFolder.hasVisibleBookmarks = false;
	rootFolder.fillFolderContent(nodesChildren[1].children, false);
	if(!rootFolder.hasVisibleBookmarks)
	{
		separator.hide();
	}

	var height = rootFolder.clientHeight + 2;
	bodyStyle.width = rootFolder.clientWidth + 2 + (height < winMaxHeight ? 0 : 7) + 'px';
	document.body.setHeight(height);

	delete rootFolder.hasVisibleBookmarks;
	rootFolder.onmouseup = function(ev)
	{
		var bookmark = ev.srcElement;
		while(!(bookmark instanceof HTMLLIElement))
		{
			bookmark = bookmark.parentElement;
		}
		var action = parseInt(getButtonAction(ev.button));
		switch(action)
		{
			case 0: // open in current tab
				if(bookmark.isBookmark)
				{
					ev.ctrlKey ? bookmark.openInNewTab() : bookmark.open(true);
				}
				else if(bookmark.isOpenAll)
				{
					bookmark.parentElement.openAllInTabs(true);
				}
				break;
			case 1: // open in new tab
				if(bookmark.isBookmark)
				{
					bookmark.openInNewTab();
				}
				else if(bookmark.isOpenAll)
				{
					bookmark.parentElement.openAllInTabs(false);
				}
				else if(bookmark.isFolder)
				{
					var folderContent = bookmark.lastChild;
					var count = document.evaluate('count(li[@type="bookmark"])', folderContent, null,
							XPathResult.NUMBER_TYPE, null);
					if(count.numberValue > 0)
					{
						folderContent.openAllInTabs(false);
					}
				}
				break;
			case 2: // open context menu
				if(bookmark.isBookmark || bookmark.isFolder)
				{
					bookmark.isSelected = true;
					bookmark.showContextMenu(ev);
				}
				break;
		}
	};

	var contextMenu = $('contextMenu');
	chrome.i18n.initElements(contextMenu);
	contextMenu.configMenu = function(config)
	{
		for(var action in config)
		{
			var item = document.evaluate('li[@action="' + action + '"]', this, null,
					XPathResult.ANY_UNORDERED_NODE_TYPE, null).singleNodeValue;
			if(config[action])
			{
				item.className = "enabled";
				item.setAttribute('onmouseup', "processMenu(event, '" + action + "')");
				item.setAttribute("onmouseover", "this.className = 'hover'");
				item.setAttribute("onmouseout", "this.className = 'enabled'");
			}
			else
			{
				item.className = "disabled";
				item.removeAttribute("onmouseup");
				item.removeAttribute("onmouseover");
				item.removeAttribute("onmouseout");
			}
		}
	};
}

// vim:noet

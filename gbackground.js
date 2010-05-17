
var GBookmarksTree = null;
var needNotifyOptionsPage;
var signature;

var GBookmarkUrl = 'https://www.google.com/bookmarks/';

NodeList.prototype.forEach = function(func)
{
	for(var idx = 0, len = this.length; idx < len; idx++)
	{
		func(this[idx], idx);
	}
}

function isString(obj) { return typeof obj == 'string'; }

function createFolder(parentFolder, fullName, folderSeparator)
{
	var names = isString(fullName) ? fullName.split(folderSeparator) : fullName;
	var name = names.shift();
	var folder;
	for(var idx = 0, len = parentFolder.children.length; idx < len; idx++)
	{
		if(parentFolder.children[idx].title == name)
		{
			folder = parentFolder.children[idx];
			break;
		}
	}
	if(!folder)
	{
		folder = { title: name, parentFolder: parentFolder, children: new Array() };
		var ids = [ name ];
		while(parentFolder.parentFolder)
		{
			ids.unshift(parentFolder.id);
			parentFolder = parentFolder.parentFolder;
		}
		folder.id = ids.join(folderSeparator);
		folder.parentFolder.children.push(folder);
	}
	if(names.length > 0)
	{
		createFolder(folder, names, folderSeparator);
	}
}

function findFolder(parentFolder, fullName, folderSeparator)
{
	var names = isString(fullName) ? fullName.split(folderSeparator) : fullName;
	var name = names.shift();
	for(var idx = 0, len = parentFolder.children.length; idx < len; idx++)
	{
		var child = parentFolder.children[idx];
		if(child.url == undefined && child.title == name)
		{
			return names.length > 0 ? findFolder(child, names, folderSeparator) : child;
		}
	}
}

function removeGBookmark(folder, id)
{
	var children = folder.children;
	for(var idx = 0, len = children.length; idx < len; idx++)
	{
		var child = children[idx];
		if(child.id == id)
		{
			children.splice(idx, 1);
			return child;
		}
		if(child.children)
		{
			var bookmark = removeGBookmark(child, id);
			if(bookmark)
			{
				return bookmark;
			}
		}
	}
	return null;
}

function handleStateChange()
{
	if(this.readyState == 4)
	{
		var folderSeparator = getFolderSeparator();
		var parser = new DOMParser();
		GBookmarksTree = { children: new Array() };
		var xmlDoc = parser.parseFromString(this.responseText, 'text/xml');
		signature = xmlDoc.querySelector('channel > signature').textContent;

		xmlDoc.querySelectorAll('channel > item > bkmk_label').forEach(function(node)
		{
			createFolder(GBookmarksTree, node.textContent, folderSeparator);
		});
		xmlDoc.querySelectorAll('channel > item').forEach(function(node)
		{
			var bm =
			{
				title: node.querySelector('title').textContent,
				url: node.querySelector('link').textContent,
				id: node.querySelector('bkmk_id').textContent
			};
			var label = node.querySelector('bkmk_label');
			if(label)
			{
				findFolder(GBookmarksTree, label.textContent, folderSeparator).children.push(bm);
			}
			else
			{
				GBookmarksTree.children.push(bm);
			}
		});
		sortFolder(GBookmarksTree);
		if(needNotifyOptionsPage)
		{
			notifyOptionsPage();
		}
	}
}

function sortFolder(folder)
{
	var children = folder.children;
	if(children)
	{
		children.sort(sorting);
		for(var idx = 0, len = children.length; idx < len; idx++)
		{
			var child = children[idx];
			if(child.children)
			{
				sortFolder(child);
			}
		}
	}
}

function sorting(b1, b2)
{
	if(b1.children && b2.url) { return -1; }
	if(b2.children && b1.url) { return 1; }
	var t1 = b1.title, t2 = b2.title;
	return t1 > t2 ? 1 : t1 < t2 ? -1 : 0;
}

function setUseGoogleBookmarks(useGoogleBookmarks, isFromOptionsPage)
{
	if(useGoogleBookmarks)
	{
		chrome.browserAction.setBadgeText({ text: "G" });
		needNotifyOptionsPage = isFromOptionsPage;
		if(GBookmarksTree)
		{
			if(needNotifyOptionsPage)
			{
				notifyOptionsPage();
			}
		}
		else
		{
			loadGoogleBookmakrs(isFromOptionsPage);
		}
	}
	else
	{
		chrome.browserAction.setBadgeText({ text: "" });
	}
}

function notifyOptionsPage()
{
	needNotifyOptionsPage = false;
	chrome.extension.sendRequest('GoogleBookmarksIsReady');
}

function loadGoogleBookmakrs(isFromOptionsPage)
{
	needNotifyOptionsPage = isFromOptionsPage;
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = handleStateChange;
	xhr.open("GET", GBookmarkUrl + '?output=rss&num=10000', true);
	xhr.send();
}

function remove(id)
{
	var child = removeGBookmark(GBookmarksTree, id);
	var xhr = new XMLHttpRequest();
	xhr.open("GET", GBookmarkUrl + 'mark?' + stringify({ dlq: id, sig: signature }));
	xhr.send();
}

function stringify(parameters)
{
	var params = [];
	for(var p in parameters)
	{
		params.push(p + '=' + encodeURIComponent(parameters[p]));
	}
	return params.join('&');
};


document.addEventListener("DOMContentLoaded", function()
{
	setUseGoogleBookmarks(isUseGoogleBookmarks());
});
// vim: noet

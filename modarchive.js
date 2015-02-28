/**
 *  Mod archive plugin for Showtime
 *
 *  (c) Andreas Öman 2012
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

var XML = require('showtime/xml');

(function(plugin) {

  plugin.createService("The Mod Archive", "modarchive:start", "music", true,
		       plugin.path + 'logo.png');

  function tma_req(req, page, args) {
    var doc = showtime.httpGet('http://api.modarchive.org/xml-tools.php', [
      {
	key: 'ehxucyfr-axtvmksx-n5brgkjh-yst3idjm',
	request: req,
	page: page
      }, args]);
    return XML.parse(doc);
  }

 
  function appendMod(page, mod) {
    var artist = null;

    if(mod.artist_info.artist)
      artist = mod.artist_info.artist.alias;
    else if(mod.artist_info.guessed_artist)
      artist = mod.artist_info.guessed_artist.alias

    var title = mod.filename;

    if(mod.songtitle) {
      var tmp = mod.songtitle.toString();
      if(tmp.replace(/(?:(?:^|\n)\s+|\s+(?:$|\n))/g,'').replace(/\s+/g,' ').length)
        title = mod.songtitle;
    }

    page.appendItem(mod.url, 'audio', {
      title: title,
      artist: artist
    });
  }

  function requestContents(page, req, args) {
    var current_page = 1;
    var mods = 0;

    function loader() {
      var doc = tma_req(req, current_page, args).modarchive;
      if(current_page == 1 && doc.error) {
	page.error(doc.error);
	return false;
      }

      mods += doc.results;
      page.entries = mods;

      var modules = doc.filterNodes('module');
      var modules_length = modules.length;
      for (var i = 0; i < modules_length; i++)
      	appendMod(page, modules[i]);

      current_page++;
      return current_page <= doc.totalpages;
    }
    page.type = "directory";
    if(loader())
      page.paginator = loader;
    page.loading = false;

  }

  plugin.addURI("modarchive:artist:([0-9]*)", function(page, id) {
    requestContents(page, 'view_modules_by_artistid', {
      query: id
    });
  });

  plugin.addURI("modarchive:genre:([0-9]*)", function(page, id) {
    requestContents(page, 'search', {
      type: 'genre',
      query: id
    });
  });

  plugin.addURI("modarchive:start", function(page) {
    var doc = tma_req('view_genres').modarchive;

    var parents = doc.filterNodes('parent');
    var len1 = parents.length;
    for (var i = 0 ; i < len1; i++) {
      var p = parents[i];
      page.appendItem(null, "separator", {
	title: p.text
      });
      var len2 = p.children.length;
      for (var j = 0; j < len2; j++) {
        var c = p.children[j];
	page.appendItem("modarchive:genre:" + c.id, "directory", {
	  title: c.text,
	  entries: c.files
	});
      }
    }

    page.metadata.title = "The Mod Archive";
    page.type = "directory";

    page.metadata.background = plugin.path + "protracker.png";
    page.metadata.backgroundAlpha = 0.2;
    page.loading = false;
  });


  // Search hook for tracks
  plugin.addSearcher("The Mod Archive - Tracks", null, function(page, query) {
    requestContents(page, 'search', {
      type: 'filename_or_songtitle',
      query: query
    });
  });

  // Search hook for artists
  plugin.addSearcher("The Mod Archive - Artists", null, function(page, query) {
    var doc = tma_req('search_artist', null, {
      query: query
    }).modarchive;

    if(doc.error)
      return;

    page.entries = len;
    var len = doc.items.length;
    for (var i = 0; i < len; i++) {
      var a = doc.items[i];
      page.appendItem('modarchive:artist:' + a.id, 'artist', {
	title: a.alias,
	icon: a.imageurl_thumb
      });
    }
  });

})(this);

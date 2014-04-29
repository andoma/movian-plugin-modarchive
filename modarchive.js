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
    return new XML(doc.toString());
  }

 
  function appendMod(page, mod) {
    var a = mod.artist_info.artist[0];
    var artist = null;
    if(a)
      artist = new showtime.Link(a.alias, 'modarchive:artist:' + a.id);
    else if(mod.artist_info.guessed_artist[0])
      artist = mod.artist_info.guessed_artist[0].alias

    page.appendItem(mod.url, 'audio', {
      title: showtime.entityDecode(mod.songtitle.toString().replace(/(?:(?:^|\n)\s+|\s+(?:$|\n))/g,'').replace(/\s+/g,' ').length ? mod.songtitle : mod.filename),
      artist: artist
    });
  }

  function requestContents(page, req, args) {
    var current_page = 1;
    var mods = 0;

    function loader() {
      var doc = tma_req(req, current_page, args);
      if(current_page == 1 && doc.error.length > 0) {
	page.error(doc.error);
	return false;
      }

      mods += doc.results;
      page.entries = mods;

      for each (var m in doc.module)
      	appendMod(page, m);

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

  plugin.addURI("modarchive:random", function(page) {
    page.metadata.title = "Random track from The Mod Archive";
    page.type = "directory";
    var v = tma_req('random');
    page.appendItem(v.module.url, 'audio', trackmeta(v.module));
    page.loading = false;
  });

  plugin.addURI("modarchive:start", function(page) {
    var doc = tma_req('view_genres');
    for each (var p in doc.parent) {
      page.appendItem(null, "separator", {
	title: p.text
      });
      for each (var c in p.children.child) {
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
    });
    var entries = 0;
    for each (var a in doc.items.item) {
      entries++;
      page.appendItem('modarchive:artist:' + a.id, 'artist', {
	title: a.alias,
	icon: a.imageurl_thumb
      });
    }
    page.entries = entries;
  });

})(this);

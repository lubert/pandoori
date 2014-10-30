var accessToken;
var artists;
var $page;

/*
 * Listens for message containing html from tab
 */
chrome.extension.onMessage.addListener(function(request, sender) {
  if (request.action == "getSource") {
    $page = $('<div/>').html(request.source);
    getPandoraArtists();
    var $artists = $("#artists");
    $artists.html(artists.join("<br>"))
  }
});

/*
 * Runs script in tab to get page source
 */
function getPageSource() {
  chrome.tabs.executeScript(null, {
    file: "pagesource.js"
  }, function() {
    if (chrome.extension.lastError) {
      $page = chrome.extension.lastError.message;
    }
  });
}

/*
 * Logs into Rdio
 */
function signinRdio() {
  var redirectUrl = chrome.identity.getRedirectURL();
  var authUrl = 'https://www.rdio.com/oauth2/authorize?response_type=token&client_id=lfd8vhPdCivQj-XY7VPaTQ&redirect_uri=' + redirectUrl;
  chrome.identity.launchWebAuthFlow({
    'url': authUrl,
    'interactive': true
  }, function(url) {
    if (url) {
      var re = /access_token=(\S+)&token/g;
      var match = re.exec(url);
      if (match.length >= 2) {
        accessToken = match[1];
        $("#signin").hide();
        $("#convert").show();
        $("#artists").show();
        console.log("token: " + accessToken);
      } else {
        console.log("Error: " + url);
      }
    } else {
      console.log("error");
    }
  });
}

/*
 * Scrapes Pandora stations page for artists
 */
function getPandoraArtists() {
  var arr = [];
  var $links = $("#stations_container .artist_name.single .seed_link:first-of-type", $page);
  $.each($links, function(idx, item) {
    var text = $("<div/>").html(item).text().split("/")[0].trim();
    arr.push(text);
  });
  artists = arr;
}

/*
 * Searches for station key and passes it to callback
 */
function searchArtistStationKey(artist, callback) {
  var endpoint = "http://www.rdio.com/api/1/";
  var params = {
    method: "search",
    query: artist,
    types: "Artist",
    count: 1,
    extras: "-*,name,radioKey",
    access_token: accessToken
  }
  $.post(endpoint, params, function(response) {
    if (response["status"] === "ok" && response.result.results.length >= 1) {
      stationKey = response.result.results[0].radioKey;
      callback(stationKey);
    }
  });
}

/*
 * Adds station to favorites
 */
function addArtistStationToFavorites(stationKey) {
  var endpoint = "http://www.rdio.com/api/1/";
  var params = {
    method: "addToFavorites",
    keys: stationKey,
    access_token: accessToken
  }
  $.post(endpoint, params, function(response) {
    
  });
}

/*
 * Parse page only if Pandora Stations list
 */
$(function() {
  $("#convert").hide();
  $("#artists").hide();
  $("#signin").click(function() {
    signinRdio();
  });
  $("#convert").click(function() {
    $.each(artists, function(idx, artist) {
      searchArtistStationKey(artist, function(stationKey) {
        console.log("key: " + stationKey);
        addArtistStationToFavorites(stationKey);
      });
    });
  });
  chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
    var url = tabs[0].url;
    var matches = url.match("pandora.com/profile/stations");
    if (matches && matches.length > 0) {
      getPageSource();
    } else {
      var $artists = $("#artists");
      $artists.text("Go to pandora.com/profile/stations/");
      $artists.show();
      $("#signin").hide();
    }
  });
});

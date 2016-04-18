module.exports = DrUrlHandler;

function DrUrlHandler(verbose_level, callback) {
    this.verbose_level = verbose_level;

    this.mediaUrl = "";
    this.title = "";
    this.imgUrl = ""
    
    // Logging:
    this.WARN = WARN;
    this.INFO = INFO;
    this.DEBUG = DEBUG;

    // Functions:
    this.handleUrl = handleUrl;
    this.interpretDrUrl = interpretDrUrl;
    this.interpretDrProgramUrl = interpretDrProgramUrl;
    this.fetchPageData = fetchPageData;
    this.fetchProgramCard = fetchProgramCard;

    this.fetchManifest = fetchManifest;
    this.selectVideoUrl = selectVideoUrl;
    this.fetchJson = fetchJson;

/*
    this.onSuccess = onSuccess;
    this.onError = onError;
*/
    this.onSuccess = callback.onSuccess;
    this.onError = callback.onError;
}

function WARN()  { this.verbose_level >= 0 && console.log.apply(console, arguments); }
function INFO()  { this.verbose_level >= 1 && console.log.apply(console, arguments); }
function DEBUG() { this.verbose_level >= 2 && console.log.apply(console, arguments); }

/*
  DrUrlHandler.prototype.getInfo = function() {
  return this.color + ' ' + this.type + ' apple';
  };
*/

function handleUrl(url) {
    try {
        var slugs = this.interpretDrUrl(url);
        if (slugs.isLive) {
            this.success();
        } else if (slugs.hasEpisodeSlug) {
            // Fetch programcard directly if we know which episode
            this.fetchProgramCard(slugs.episodeSlug);
        } else {
            // Fall back to fetch all data for the program page, if episode is unknown.
            this.fetchPageData(slugs.episodeSlug, slugs.seriesSlug);
        }
    } catch (e) {
        this.WARN(e);
        //alert("Ooops!\n" + e)
        this.onError(e)
    }
}

function interpretDrUrl(url) {
    var index = url.search(/dr.dk\//i)
    if (index == -1) {
        throw "Not a dr.dk url";
    }
    var pathStart = index + "dr.dk/".length;
    var path = url.substring(pathStart).split(/[\/#?~!*()';]/);

    if (path.length < 2 || "tv" != path[0]) {
        throw "Please select a program or channel on dr.dk/tv"
    }

    switch (path[1]) {
    case "se":
        return this.interpretDrProgramUrl(path);
        break;
    case "live":
        return this.interpretDrLiveUrl(path);
        break;
    default:
        throw "Please select a program or channel on dr.dk/tv\nURL path must start with /tv/se or /tv/live";
    }
}

function interpretDrProgramUrl(path) {
    // Remove "boern/CHANNEL" from the path.
    if (path[2] == "boern") {
        path = path.slice(2);
    }

    if (path.length < 3 || path[2] == "") {
        throw "Please select a program.\nURL is not long enough.";
    }

    var hasEpisodeSlug = true;
    if (path.length == 3 || path[3] == "") {
        this.DEBUG("Only one slug. Using as series.");
        path[3] = ""
        hasEpisodeSlug = false;
    }

    // Ensure no bad characters in ids
    if (!(encodeURIComponent(path[2]) == path[2]) ||
        (hasEpisodeSlug && !(encodeURIComponent(path[3]) == path[3]))) {
        throw "Bad characters in URL";
    }

    var slugs = {
        seriesSlug: path[2],
        episodeSlug: path[3],
        hasEpisodeSlug: hasEpisodeSlug
    };

    this.DEBUG("Program slugs found:");
    this.DEBUG(slugs);
    return slugs;
}

function interpretDrLiveUrl(path) {
    // DR might inject "boern" in the URL for the kids channels.
    if (path[2] == "boern") {
        if (!path[3]) {
            throw "This is not a proper live path: /tv/live/boern/";
        }
        path = path.slice(1);
    }

    // Ensure no bad characters in id
    if (path[2] && !(encodeURIComponent(path[2]) == path[2])) {
        throw "Bad characters in URL";
    }

    // The default channel is DR1 and might not be in the URL.
    var id = path[2] ? path[2] : "dr1";

    switch (id) {
    case "":
    case "dr1":
        this.title = "DR1 Live";
        this.imgUrl = "/img/dr1.jpg";
        this.mediaUrl = "https://dr01-lh.akamaihd.net/i/dr01_0@147054/master.m3u8?b=100-1600";
        break;
    case "dr2":
        this.title = "DR2 Live";
        this.imgUrl = "/img/dr2.jpg";
        this.mediaUrl = "https://dr02-lh.akamaihd.net/i/dr02_0@147055/master.m3u8?b=100-1600";
        break;
    case "dr3":
        this.title = "DR3 Live";
        this.imgUrl = "/img/dr3.jpg";
        this.mediaUrl = "https://dr03-lh.akamaihd.net/i/dr03_0@147056/master.m3u8?b=100-1600";
        break;
    case "dr-k":
        this.title = "DR K Live";
        this.imgUrl = "/img/dr-k.jpg";
        this.mediaUrl = "https://dr04-lh.akamaihd.net/i/dr04_0@147057/master.m3u8?b=100-1600";
        break;
    case "ramasjang":
    case "dr-ramasjang":
        this.title = "DR Ramasjang Live";
        this.imgUrl = "/img/dr-ramasjang.jpg";
        this.mediaUrl = "https://dr05-lh.akamaihd.net/i/dr05_0@147058/master.m3u8?b=100-1600";
        break;
    case "ultra":
    case "dr-ultra":
        this.title = "DR ULTRA Live";
        this.imgUrl = "/img/dr-ultra.jpg";
        this.mediaUrl = "https://dr06-lh.akamaihd.net/i/dr06_0@147059/master.m3u8?b=100-1600";
        break;
    default:
        throw "Unkown live channel: " + id;
    }

    this.DEBUG("Live channel found:");
    this.DEBUG(this);

    return {
        isLive: true
    }
}

function fetchProgramCard(episodeSlug) {
    var url = "https://www.dr.dk/mu-online/api/1.2/programcard/" + episodeSlug;
    return fetchJson(url, this.fetchManifest.bind(this));
}

function fetchPageData(episodeSlug, seriesSlug) {
    var url = "https://www.dr.dk/mu-online/api/1.2/page/tv/player/" + episodeSlug + "?seriesid=" + seriesSlug;
    return fetchJson(url, this.fetchManifest.bind(this));
}

function fetchManifest(programCardOrPage) {
    var programCard = programCardOrPage
    if (programCardOrPage.ProgramCard) {
        programCard = programCardOrPage.ProgramCard
    }

    this.DEBUG("programCard");
    this.DEBUG(programCard);
    asset = programCard.PrimaryAsset;
    this.DEBUG("asset");
    this.DEBUG(asset);
    if (!asset) {
        throw "Video can not be found. Are you sure it is still available online at DR TV?"
    }
    if (asset.Kind != "VideoResource") {
        throw "Not a video link";
    }
    if (asset.RestrictedToDenmark) {
        this.DEBUG("Denmark only program! Unkown international behaviour.");
    }
    this.title = programCard.Title;
    this.imgUrl = programCard.PrimaryImageUri;

    var url = asset.Uri;
    return fetchJson(url, this.selectVideoUrl.bind(this));
}

function selectVideoUrl(manifest) {
    this.DEBUG("manifest");
    this.DEBUG(manifest);
    for (i in manifest.Links) {
        link = manifest.Links[i]
        if (link.Target == "HLS") {
            this.mediaUrl = link.Uri;
            //this.success();
            this.onSuccess(this.mediaUrl, this.title, this.imgUrl);
            return;
        }
    }
}

/*
function success() {
    this.onSuccess(this.mediaUrl, this.title, this.imgUrl);
}
*/

/*
function onSuccess(mediaUrl, title, imgUrl) {
    console.log("Successfully fetched DR URL:")
    //console.log(this)
    console.log(mediaUrl)
    console.log(title)
    console.log(imgUrl)
}

function onError(errorMsg) {
    console.log("Error: " +  errorMsg);
}
*/

function xhrSuccess() {
    this.callback(JSON.parse(this.responseText));
}

function xhrError() {
    console.error(this.statusText);
}

function fetchJson(sURL, fCallback) {
    //this.DEBUG("Getting " + sURL);
    var XMLHttpRequest = require('xhr2');
    var oReq = new XMLHttpRequest();
    oReq.callback = fCallback;
    oReq.arguments = Array.prototype.slice.call(arguments, 2);
    oReq.onload = xhrSuccess;
    oReq.onerror = xhrError;
    oReq.open("get", sURL, true);
    oReq.send(null);
}


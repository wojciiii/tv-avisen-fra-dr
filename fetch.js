#!/usr/bin/env node

var request = require("request");

var argv = require('yargs')
    .count('verbose')
    .alias('v', 'verbose')
    .argv;

var URL="https://www.dr.dk/tv/se/tv-avisen-med-sporten/"

VERBOSE_LEVEL = argv.verbose;

//console.log('Verbose level = ' + VERBOSE_LEVEL);

function onSuccess(mediaUrl, title, imgUrl) {
    //console.log("Success!");
    console.log(mediaUrl);
}

function onError(errorMsg) {
    console.log("Error: " +  errorMsg);
}

function Callback() {
    this.onSuccess = onSuccess;
    this.onError = onError;
}

var DrUrlHandler = require('./drurlhandler.js');
var i = new DrUrlHandler(VERBOSE_LEVEL, new Callback());
i.handleUrl(URL);


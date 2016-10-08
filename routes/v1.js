var http = require("http"),
  winston = require('winston'),
  cors = require('cors'),
  express = require('express');

var consts = require('../consts.js');

var app = module.exports = express();

// lets describe the API we offer
app.get('/', cors(), function(req, res, next) {
  res.json({groupVersion: 'v1',
            meta: {
              name: ''+consts.APPLICATION_NAME,
              version: 'v'+consts.APPLIVATION_VERSION
            },
            resources: [
              { name: 'info' }
            ]
          });
})

// Fetch weather information from openweathermap for a given City
app.get('/info', cors(), function (req, res, next) {
  winston.info(Date.now() + " some client requested info about the application itself");

  var infoObject = {};
  infoObject.applicationName = consts.APPLICATION_NAME;
  infoObject.applicationVersion = consts.APPLIVATION_VERSION;
  infoObject.runtimeEnvironment = process.env.mode;
  infoObject.runtimeVersion = process.versions;
  infoObject.backendHostname = process.env.HOSTNAME;

  res.json(infoObject);
});

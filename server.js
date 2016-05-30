/* global server */
/* global client */
var http = require("http"),
  winston = require('winston'),
  redis = require("redis"),
  express = require('express'),
  cors = require('cors'),
  app = express();

var consts = require('./consts.js');

var currentweatherVersion = consts.APPLICATION_VERSION,  // This is Currentweather 1.1
  redisAddress = "redis",             // This is service discovery by DNS, and the name
  redisPort = 6379,                   // is set by using REDIS_SERVICE_NAME while
  redisVersion = '',                  // redis version as told by server when connection is ready
  httpAddress = "0.0.0.0",            // doing `oc new-app` or via `docker --link`
  httpPort = "1337",                  // or ...
  openWeatherMapApiKey = process.env.OPENWEATHERMAP_APIKEY;

// These are the API versions known by now
var VERSIONS = {
  'Currentweather API vNext': '/v1beta1',
  'Currentweather '+consts.APPLICATION_VERSION: '/v1'
};

if (openWeatherMapApiKey == "" ) {
  winston.error("Missing mandatory env OPENWEATHERMAP_APIKEY");
  process.exit(1);
}

redis_client = redis.createClient(redisPort, redisAddress);
redis_client.on("error", function (err) {
  winston.warn("Catching error from Redis client to enable reconnect.");
  winston.error(err);
});

redis_client.on("ready", function (time, args, raw_reply) {
  winston.info("redis is ready");
  winston.debug(redis_client.server_info);

  redisVersion = redis_client.server_info.redis_version;
});

app.use(cors());

// route to display versions
app.get('/', function(req, res) {
    res.json(VERSIONS);
})

// versioned routes go in the routes/ directory
// import the routes
for (var k in VERSIONS) {
    app.use(VERSIONS[k], require('./routes' + VERSIONS[k]));
}

// This is to be deprecated in v1 API
app.get('/status/:q', cors(), function (req, res, next) {
  var query = req.params.q

  winston.info("redirecting from /status to /v1beta1/weather");
  res.redirect('/v1beta1/weather/' + query);
});

// This is a health check for OpenShift
app.get('/_status/healthz', cors(), function (req, res, next) {
  var healthzObject = {}

  if (redisVersion != '') {
    healthzObject.currentweather_api_version = 'v0';
    healthzObject.redis_version = redisVersion;
    res.json(healthzObject);
  } else {
    res.status(503).json({status: 'not ready'})
  }
})

app.listen(httpPort, function () {
  winston.info("Server running at 0.0.0.0:" + httpPort + "/");
});

process.on('SIGTERM', function () {
  winston.info("Received SIGTERM. Exiting.")

  app.close();
  process.exit(0);
});

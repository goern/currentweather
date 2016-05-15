/* global server */
/* global client */
var http = require("http"),
  winston = require('winston'),
  redis = require("redis"),
  express = require('express'),
  cors = require('cors'),
  app = express();

var consts = require('consts.js');

var currentweatherVersion = consts.CURRENTWEATHER_VERSION,  // This is Currentweather 1
  redisAddress = "redis",             // This is service discovery by DNS, and the name
  redisPort = 6379,                   // is set by using REDIS_SERVICE_NAME while
  redisVersion = '',                  // redis version as told by server when connection is ready
  httpAddress = "0.0.0.0",            // doing `oc new-app` or via `docker --link`
  httpPort = "1337",                  // or ...
  openWeatherMapApiKey = process.env.OPENWEATHERMAP_APIKEY;

// These are the API versions known by now
var VERSIONS = {'Testing v1': '/v1beta1'};

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

app.get('/status/:q', cors(), function (req, res, next) {
  var query = req.params.q
  winston.info(Date.now() + " some client requested weather data for ", query);

  redis_client.get("currentweather-" + query, function (err, weatherObjectString) {
    if (weatherObjectString == null) {
      winston.info(Date.now() + " Querying live weather data for ", query);
      var url = "http://api.openweathermap.org/data/2.5/weather?q=" + query + "&appid=" + openWeatherMapApiKey;

      http.get(url, function(apiResponse) {
        var body = "";
        apiResponse.on("data", function(chunk) {
          body += chunk;
        });

        apiResponse.on("end", function() {
          var weatherObject = {}
          weatherObject.location = query
          try {
            var weather = JSON.parse(body);
            weatherObject.owm_id = weather.weather[0].id;
            weatherObject.description = weather.weather[0].description;
            weatherObject.temperature = Math.round(weather.main.temp - 273);
            weatherObject.wind = Math.round(weather.wind.speed * 3.6);
          } catch (error) {
            winston.error("Error during json parse: ", error);
            weatherObject.error = error
          }
          redis_client.set("currentweather-" + query, JSON.stringify(weatherObject));
          redis_client.expire("currentweather-" + query, 10);
          res.json(weatherObject);
        });
      }).on("error", function(e) {
        winston.error("Got error: ", e);
      });
    } else {
      winston.info("Using cached weather data", weatherObjectString);
      res.send(weatherObjectString);
    }
  });
});

app.get('/healthz', cors(), function (req, res, next) {
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

var http = require("http"),
  winston = require('winston'),
  cors = require('cors'),
  express = require('express');

var consts = require('../consts.js');

var app = module.exports = express();

openWeatherMapApiKey = process.env.OPENWEATHERMAP_APIKEY;

if (openWeatherMapApiKey == "" ) {
  winston.error("Missing mandatory env OPENWEATHERMAP_APIKEY");
  process.exit(1);
}

// lets describe the API we offer
app.get('/', cors(), function(req, res, next) {
  res.json({groupVersion: 'v1beta1',
            meta: {
              name: ''+consts.APPLICATION_NAME,
              version: 'v'+consts.APPLICATION_VERSION
            },
            resources: [
              { name: 'weather' }
            ]
          });
})

// Fetch weather information from openweathermap for a given City
app.get('/weather/:q', cors(), function (req, res, next) {
  var query = req.params.q
  winston.info(Date.now() + " some client requested weather data for ", query);

  // if we have it cached, use that information
  redis_client.get("currentweather-" + query, function (err, weatherObjectString) {
    // if it is not cached, get it
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

          // and cache the information
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

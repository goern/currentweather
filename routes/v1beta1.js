var winston = require('winston'),
  cors = require('cors'),
  express = require('express');

var app = module.exports = express();

app.get('/', cors(), function(req, res, next) {
  res.json({api: "v1beta1", currentweatherVersion: 'v'+currentweatherVersion})
})

app.get('/weather/:q', cors(), function (req, res, next) {
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

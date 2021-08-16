/**
 * We're using this repository https://github.com/mledoze/countries
 * and this repository https://github.com/samayo/country-json
 * to create a country reference table with all the needed data.
 *
 * With this script we're stripping out all the unneeded fields from
 * the countries.json file
 */

const fetch = require("node-fetch");
const _ = require("lodash");
const fs = require("fs");
const path = require("path");
const Promise = require("bluebird");
const GeoPoint = require("geopoint");

// load the update json
Promise.all([
  // this will give most of the information
  fetch(
    "https://raw.githubusercontent.com/mledoze/countries/master/countries.json"
  ),
  // this will tell the top-left and
  // bottom-right corner coordinates for each country
  fetch(
    "https://raw.githubusercontent.com/samayo/country-json/master/src/country-by-geo-coordinates.json"
  ),
])
  // parse the json content
  .map((response) => response.json())
  // keep only the needed fields
  /*
   Sample country extracted
  { name: { common: 'Honduras' },
    region: 'Americas',
    subregion: 'Central America',
    languages: { spa: 'Spanish' },
    latlng: [ 15, -86.5 ], // coordinates
    area: 112492 } // km^2
  */
  .spread((countries, countriesCoordinates) =>
    _.map(countries, (c) =>
      _.extend(
        {},
        _.pick(c, [
          "name.common",
          "cca2",
          "region",
          "subregion",
          "languages",
          "latlng",
          "area", // km
        ]),
        {
          coord: _(
            _.find(countriesCoordinates, { country: _.get(c, "name.common") })
          )
            .pick(["north", "south", "west", "east"])
            .mapValues(parseFloat)
            .value(),
        }
      )
    )
  )
  // compute the radius in km
  .then((countries) =>
    _.map(countries, (c) => {
      let radius;

      // compute radius from tlbr coordinates
      try {
        const tl = new GeoPoint(c.coord.north, c.coord.west);
        const br = new GeoPoint(c.coord.south, c.coord.east);
        // by getting the distance in km
        // from the TL point
        // to the BR point
        // and dividing by two (radius!)
        radius = tl.distanceTo(br, true) / 2.0;
      } catch (err) {}

      // compute radius from area
      radius = _.defaultTo(radius, Math.sqrt(c.area / Math.PI));

      // defaults to 1000km
      radius = _.defaultTo(radius, 1000);

      return _.extend({}, c, {
        radius: _.ceil(radius),
      });
    })
  )
  // store the content under data/countries.json
  .then((countries) =>
    fs.writeFileSync(
      path.join(__dirname, "..", "data", "countries.json"),
      JSON.stringify(countries, null, "  ")
    )
  )
  .catch(console.error);

/*
 * With these above we can conduct a twitter search by country
 * @see https://developer.twitter.com/en/docs/tutorials/filtering-tweets-by-location
 * @see https://advos.io/social-media-marketing/how-to-search-tweets-by-location-twittertips/
 */

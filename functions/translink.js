'use strict';

const rp = require('request-promise');

const tlBaseUrl = 'http://api.translink.ca/rttiapi/v1';
const tlApiKey = 'hCnIQTl1g1LNlWOZhEfa';

/**
 * Finds all stops near given coordinates.
 *
 * @param lat
 * @param long
 */
exports.getStopsNearCoordinates = function(lat, long) {
    let options = {
        url: `${tlBaseUrl}/stops?apikey=${tlApiKey}&lat=${lat}&long=${long}`,
        headers: {
            'Content-Type': 'application/json'
        },
        simple: false
    };

    return rp(options);
};

/**
 * Finds stops near given coordinates that serve a specific route.
 *
 * @param lat
 * @param long
 * @param routeNo
 * @param terminus
 */
exports.getStopsNearCoordinatesServingRoute = function(lat, long, routeNo, terminus) {
    throw 'Not implemented';

    /*
    Add route param to request.
     */
};

/**
 * Finds stops near given coordinates that serve a specific route with a specific terminus.
 *
 * @param lat
 * @param long
 * @param routeNo
 * @param terminus
 */
exports.getStopsNearCoordinatesServingRouteWithTerminus = function(lat, long, routeNo, terminus) {
    throw 'Not implemented;'

    /*
    Return a promise that will fulfill once the response has come back
    and been manually filtered for terminus.
     */
};

/**
 * Gets a specified number of next arrivals at a given stop.
 *
 * @param stopNo
 * @param count
 */
exports.getArrivalsAtStop = function(stopNo, count) {
    let options = {
        url: `${tlBaseUrl}/stops/${stopNo}/estimates?apikey=${tlApiKey}&count=${count}`,
        headers: {
            'Content-Type': 'application/json'
        },
        simple: false
    };

    return rp(options);
};

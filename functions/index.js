'use strict';

const translink = require('./translink');

const functions = require('firebase-functions');
const rp = require('request-promise');
const {dialogflow, Suggestions, Permission, SimpleResponse} = require('actions-on-google');

process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements

const app = dialogflow();


function getArrivals(lat, long, count) {
    return new Promise((resolve, reject) => {
        translink.getStopsNearCoordinates(lat, long, routeNo).then((stops) => {
            // TODO If routeNo or terminus is given filter the returned stops

            stops = JSON.parse(stops);
            let nearestStop = stops[0].StopNo;

            translink.getArrivalsAtStop(nearestStop, count).then((arrivals) => {
                arrivals = JSON.parse(arrivals);
                resolve({
                    nearestStop: stops[0],
                    arrivals: arrivals
                });
            }).catch((err) => reject(err));
        }).catch((err) => reject(err));
    });
}

function getArrivalsForRoute(lat, long, route, count) {

}

function getArrivalsForRouteWithTerminus(lat, long, route, terminus, count) {

}

app.intent('Default Welcome Intent', (conv) => {
    conv.ask('Welcome to Vancouver Bus Arrivals! You can ask when the next bus will arrive, and can optionally specify a route.');
    conv.ask(new Suggestions('When is the next bus?'));
    conv.ask(new Suggestions('What can I ask?'));
});

app.intent('Default Fallback Intent', (conv) => {
    conv.close('Sorry, I didn\'t understand. Please try again later.');
});

app.intent('Get location permission', (conv) => {
    conv.data.requestedPermission = 'DEVICE_PRECISE_LOCATION';
    return conv.ask(new Permission({
        context: 'To find nearby arrivals',
        permissions: conv.data.requestedPermission
    }));
});

app.intent('Get arrivals near user', (conv, params, permissionGranted) => {
    if (!permissionGranted) conv.close('Sorry, I need your permission to get your location to find nearby stops');

    const {requestedPermission} = conv.data;
    console.log('Requested permission', requestedPermission);

    if (requestedPermission === 'DEVICE_PRECISE_LOCATION') {
        const {coordinates} = conv.device.location;

        // TODO Look at parameters to determine what function to call

        // No information on route/terminus was given; find the next arrival of each route at the stop closest to the user
        // TODO Will unspecified parameters be null so we can just pass them to getNearestArrivals and deal with them there?
        return getArrivals((coordinates.latitude).toFixed(6), (coordinates.longitude).toFixed(6), 1).then((results) => {
            console.log(results);

            if (!results.arrivals.Code) {
                conv.ask(new SimpleResponse({
                    speech: `Here are the next arrivals at the nearest stop, ${results.nearestStop.Name}`,
                    text: `Here are the next arrivals at ${results.nearestStop.Name}`
                }));

                let speech = ``;
                let text = ``;

                results.arrivals.forEach((arrival, i) => {
                    arrival.Schedules.forEach((schedule, j) => {
                        speech += `The ${arrival.RouteNo} to ${schedule.Destination} in ${schedule.ExpectedCountdown} minutes.`;
                        text += `${arrival.RouteNo} ${schedule.Destination} - ${schedule.ExpectedCountdown} minutes`;
                    });
                    if (i !== results.arrivals.length - 1) text += '\n';
                });

                conv.close(new SimpleResponse({
                    speech: speech,
                    text: text
                }));
            } else {
                // TODO Write error code handing function
                conv.close(`Sorry, no stop estimates could be found for ${results.nearestStop.Name}`);
            }

        }).catch((err) => {
            console.error(err);
            conv.close('Sorry, something went wrong when trying to get the next arrivals.');
        });
    } else conv.close('Sorry, I couldn\'t get your location');
});

exports.fulfillment = functions.https.onRequest(app);

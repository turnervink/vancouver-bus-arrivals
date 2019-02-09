'use strict';

const functions = require('firebase-functions');
const rp = require('request-promise');
const {dialogflow, Suggestions, Permission, SimpleResponse} = require('actions-on-google');

const tlBaseUrl = 'http://api.translink.ca/rttiapi/v1';
const tlApiKey = 'hCnIQTl1g1LNlWOZhEfa';

process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements

const app = dialogflow();

function getStopsAtCoordinates(lat, long) {
    let options = {
        url: `${tlBaseUrl}/stops?apikey=${tlApiKey}&lat=${lat}&long=${long}`,
        headers: {
            'Content-Type': 'application/json'
        },
        simple: false
    };

    return rp(options);
}

function getArrivalsAtStop(stopNo, count) {
    let options = {
        url: `${tlBaseUrl}/stops/${stopNo}/estimates?apikey=${tlApiKey}&count=${count}`,
        headers: {
            'Content-Type': 'application/json'
        },
        simple: false
    };

    return rp(options);
}

function getNearestArrivals(lat, long, count, routeNo, terminus) {
    return new Promise((resolve, reject) => {
        getStopsAtCoordinates(lat, long).then((stops) => {
            // TODO If routeNo or terminus is given filter the returned stops

            stops = JSON.parse(stops);
            let nearestStop = stops[0].StopNo;

            getArrivalsAtStop(nearestStop, count).then((arrivals) => {
                arrivals = JSON.parse(arrivals);
                resolve({
                    nearestStop: stops[0],
                    arrivals: arrivals
                });
            }).catch((err) => reject(err));
        }).catch((err) => reject(err));
    });
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

        // TODO Look at parameters to determine what to pass to getNearestArrivals, or call getArrivalsNearLocation

        // No information on route/terminus was given; find the next arrival of each route at the stop closest to the user
        // TODO Will unspecified parameters be null so we can just pass them to getNearestArrivals and deal with them there?
        return getNearestArrivals((coordinates.latitude).toFixed(6), (coordinates.longitude).toFixed(6), 1, null, null).then((results) => {
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
                        speech += `<speak>The ${arrival.RouteNo} to ${schedule.Destination} in ${schedule.ExpectedCountdown} minutes. <break time="500ms" /> </speak>`;
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

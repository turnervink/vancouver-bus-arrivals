'use strict';

const functions = require('firebase-functions');
const rp = require('request-promise');
const {dialogflow, Suggestions, Permission} = require('actions-on-google');

const tlBaseUrl = 'http://api.translink.ca/rttiapi/v1';
const tlApiKey = 'hCnIQTl1g1LNlWOZhEfa';

process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements

const app = dialogflow();

function getStopsAtCoordinates(lat, long) {
    let options = {
        url: `${tlBaseUrl}/stops?apikey=${tlApiKey}&lat=${lat}&long=${long}`,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    return rp(options);
}

function getArrivalsAtStop(stopNo, count) {
    let options = {
        url: `${tlBaseUrl}/stops/${stopNo}/estimates?apikey=${tlApiKey}&count=${count}`,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    return rp(options);
}

function getNearestArrivals(lat, long) {
    return new Promise((resolve, reject) => {
        getStopsAtCoordinates(lat, long).then((stops) => {
            console.log('STOPS', stops);
            stops = JSON.parse(stops);
            let nearestStop = stops[0].StopNo;

            getArrivalsAtStop(nearestStop, 3).then((arrivals) => {
                console.log('ARRIVALS', arrivals);
                arrivals = JSON.parse(arrivals);
                resolve(arrivals);
            }).catch((err) => reject(err));
        }).catch((err) => reject(err));
    });
}

app.intent('Default Welcome Intent', (conv) => {
    conv.ask('Welcome to Vancouver Bus Arrivals!');
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

        return getNearestArrivals((coordinates.latitude).toFixed(6), (coordinates.longitude).toFixed(6)).then((arrivals) => {
            console.log(arrivals);

            let speech = ``;
            let text = ``;

            arrivals.forEach((arrival, i) => {
                arrival.Schedules.forEach((schedule, j) => {

                });
            });

            conv.close('Check the logs');
        }).catch((err) => {
            console.error(err);
            conv.close('Sorry, something went wrong when trying to get the next arrivals.');
        });
    } else conv.close('Sorry, I couldn\'t get your location');
});

exports.fulfillment = functions.https.onRequest(app);

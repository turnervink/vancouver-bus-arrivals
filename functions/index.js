'use strict';

const formatter = require('./speech');
const translink = require('./translink');

const functions = require('firebase-functions');
const {dialogflow, Suggestions, Permission, SimpleResponse} = require('actions-on-google');

process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements

const app = dialogflow();


function getArrivals(lat, long, count) {
    return new Promise((resolve, reject) => {
        translink.getStopsNearCoordinates(lat, long).then((stops) => {
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

function getArrivalsForRoute(lat, long, routeNo, count) {
    return new Promise((resolve, reject) => {
        let obj = this;

        translink.getStopsNearCoordinatesServingRoute(lat, long, routeNo).then((stops) => {
            stops = JSON.parse(stops);
            let promises = [];
            let finalArrivals = [];

            if (stops.Code) reject('No stops serving the route were found');

            stops.forEach((stop) => {
                promises.push(translink.getArrivalsAtStop(stop.StopNo, count, routeNo));
            });

            Promise.all(promises).then((arrivals) => {
                arrivals.forEach((arrival, index) => {
                    arrival = JSON.parse(arrival)[0];

                    let res = {};

                    res.route = arrival.RouteNo;
                    res.terminus = formatter.formatTerminus(arrival.Schedules[0].Destination);
                    res.expectedCountdown = arrival.Schedules[0].ExpectedCountdown;
                    res.stopName = formatter.formatStopName(stops[index].OnStreet, stops[index].AtStreet);
                    finalArrivals.push(res);
                });

                let speech = ``;
                let text = ``;

                finalArrivals.forEach((result, i) => {
                    console.log(result);
                    speech += `On ${result.stopName}, the ${result.route} to ${result.terminus} in ${result.expectedCountdown} minutes.`;
                    text += `${result.stopName}: ${result.terminus} - ${result.expectedCountdown} minutes`;
                    if (i !== finalArrivals.length - 1) text += '\n';
                });

                resolve({
                    speech: speech,
                    text: text
                });
            });
        }).catch((err) => reject(err));
    });
}

function getArrivalsForRouteWithTerminus(lat, long, route, terminus, count) {
    throw 'Not implemented';
}

app.intent('Default Welcome Intent', (conv) => {
    conv.ask('Welcome to Vancouver Bus Arrivals! You can ask when the next bus will arrive, and can optionally specify a route.');
    conv.ask(new Suggestions('When is the next bus?'));
    conv.ask(new Suggestions('What can I ask?'));
});

app.intent('Default Fallback Intent', (conv) => {
    conv.close('Sorry, I didn\'t understand. Please try again later.');
});

app.intent('Get location permission', (conv, params) => {
    conv.data.requestedPermission = 'DEVICE_PRECISE_LOCATION';

    return conv.ask(new Permission({
        context: 'To find nearby arrivals',
        permissions: conv.data.requestedPermission
    }));
});

app.intent('Get arrivals near user', (conv, params, permissionGranted) => {
    if (!permissionGranted) conv.close('Sorry, I need your permission to get your location to find nearby stops');

    const {requestedPermission} = conv.data;

    if (requestedPermission === 'DEVICE_PRECISE_LOCATION') {
        const {coordinates} = conv.device.location;
        let context = conv.contexts.get('arrival_filters');

        if (context.parameters.routeNo !== '') {
            console.log('ROUTE NUMBER WAS GIVEN', context.parameters.routeNo);

            return getArrivalsForRoute(
                (coordinates.latitude).toFixed(6),
                (coordinates.longitude).toFixed(6),
                context.parameters.routeNo,
                1
            ).then((response) => {
                conv.ask(new SimpleResponse({
                    speech: `Here are the next arrivals for the ${context.parameters.routeNo}`,
                    text: `Here are the next arrivals for the ${context.parameters.routeNo} at the stops nearest your location`
                }));

                conv.close(new SimpleResponse({
                    speech: response.speech,
                    text: response.text
                }));
            }).catch((err) => conv.close(err));
        } else {
            console.log('NO ROUTE NUMBER WAS GIVEN');

            return getArrivals((coordinates.latitude).toFixed(6), (coordinates.longitude).toFixed(6), 1).then((results) => {
                console.log(results);

                if (!results.arrivals.Code) {
                    conv.ask(new SimpleResponse({
                        speech: `Here are the next arrivals at the nearest stop, ${results.nearestStop.Name}`,
                        text: `Here are the next arrivals at ${results.nearestStop.Name}`
                    }));

                    // TODO Move this into the getArrivals function as done with getArrivalsForRoute
                    let speech = ``;
                    let text = ``;

                    results.arrivals.forEach((arrival, i) => {
                        arrival.Schedules.forEach(schedule => {
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
        }
    } else conv.close('Sorry, I couldn\'t get your location');
});

exports.fulfillment = functions.https.onRequest(app);

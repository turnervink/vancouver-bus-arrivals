// See https://github.com/dialogflow/dialogflow-fulfillment-nodejs
// for Dialogflow fulfillment library docs, samples, and to report issues
'use strict';

const functions = require('firebase-functions');
const {WebhookClient} = require('dialogflow-fulfillment');
const {BasicCard, Suggestions} = require('actions-on-google');

process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
    const agent = new WebhookClient({request, response});
    // console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
    // console.log('Dialogflow Request body: ' + JSON.stringify(request.body));

    function welcome(agent) {
        let conv = agent.conv();

        conv.ask('Welcome to Vancouver Bus Arrivals!');
        conv.ask(new Suggestions('When is the next bus?'));
        conv.ask(new Suggestions('What can I ask?'));

        agent.add(conv);
    }

    function fallback(agent) {
        let conv = agent.conv();

        conv.close('Sorry, I didn\'t understand. Please try again later.');

        agent.add(conv);
    }

    function googleAssistantOther(agent) {
        let conv = agent.conv(); // Get Actions on Google library conversation object
        conv.ask('Please choose an item:'); // Use Actions on Google library to add responses
        conv.ask(new Carousel({
            title: 'Google Assistant',
            items: {
                'WorksWithGoogleAssistantItemKey': {
                    title: 'Works With the Google Assistant',
                    description: 'If you see this logo, you know it will work with the Google Assistant.',
                    image: {
                        url: imageUrl,
                        accessibilityText: 'Works With the Google Assistant logo',
                    },
                },
                'GoogleHomeItemKey': {
                    title: 'Google Home',
                    description: 'Google Home is a powerful speaker and voice Assistant.',
                    image: {
                        url: imageUrl2,
                        accessibilityText: 'Google Home'
                    },
                },
            },
        }));

        // Add Actions on Google library responses to your agent's response
        agent.add(conv);
    }

    function other(agent) {
        // agent.add(`This message is from Dialogflow's Cloud Functions for Firebase editor!`);
        // agent.add(new Card({
        //         title: `Title: this is a card title`,
        //         imageUrl: null,
        //         text: `This is the body text of a card.  You can even use line\n  breaks and emoji! 💁`
        //     })
        // );

        let conv = agent.conv();
        conv.ask('Hello there');
        conv.ask(new BasicCard({
            title: 'This is a card!',
            text: "Here is some text"
        }));
        agent.add(conv);
    }


    // Run the proper function handler based on the matched Dialogflow intent name
    let intentMap = new Map();
    intentMap.set('Default Welcome Intent', welcome);
    intentMap.set('Default Fallback Intent', fallback);
    agent.handleRequest(intentMap);
});

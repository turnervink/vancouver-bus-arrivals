'use strict';

const acronymTermini = [
    'UBC',
    'SFU'
];

const expansions = {
    'STN': 'Station',
    'EXCH': 'Exchange'
};

function toTitleCase(str) {
    return str.replace(
        /\w\S*/g,
        function (txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        }
    );
}

function expand(str) {
    console.log('EXPANDING', str);
    Object.keys(expansions).forEach(key => {
        console.log(`Finding ${key} in ${str}`);
        let regex = new RegExp(key, 'g');
        str = str.replace(regex, expansions[key]);
    });

    return str;
}

exports.formatStopName = function (onStreet, atStreet) {
    return `${toTitleCase(onStreet)} at ${toTitleCase(atStreet)}`;
};

exports.formatTerminus = function (terminus) {
    if (!acronymTermini.includes(terminus)) {
        terminus = expand(terminus);
        terminus = toTitleCase(terminus);
    }

    return terminus;
};
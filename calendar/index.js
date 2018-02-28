#!/usr/bin/env node

const fs = require('fs')
const authorize = require('./lib/authorize.js')
const config = _require('./config.js', './config.js.skel')
const google = require('googleapis')
const path = require('path')

if (typeof module != 'undefined' && module.parent) {
  module.exports = _calendar
} else {
  const program = require('commander')

  program
    .version('0.1.0', '-v, --version')
    .option('-m, --month <month>', 'The month for the git log, starting at 1 for january.')
    .option('-y, --year <year>', 'The year for the git log, using this format YYYY.')
    .parse(process.argv);

  const path  = process.cwd();
  const date  = new Date()
  const month = parseInt(program.month) || date.getMonth() + 1
  const year  = parseInt(program.year) || date.getFullYear()

  console.log('calender', program.version())

  _calendar(config.calenderId.work, year, month)
    .then(events => events.map(_formatEvent))
    .then(events => events.forEach(event => console.log(event)))
}

function _calendar () {
  return new Promise((resolve, reject) => {
    let secret = path.join(__dirname, 'client_secret.json')
    fs.readFile(secret, (error, content) => {
      if (error) {
        console.log('Error loading client secret file: ' + error);
        return
      }

      authorize(JSON.parse(content), auth => {
        _query(auth, ...arguments)
          .then(resolve)
          .catch(reject);
      });
    })
  })
}

function _query (auth, calenderId, year, month) {
  let from = ('0' + month).slice(-2)
  let until =  ('0' + (month + 1)).slice(-2)

  let query = {
    orderBy: 'startTime',
    timeMin: new Date(`${year}-${from}-01T00:00:00`).toISOString(),
    timeMax: new Date(`${year}-${until}-01T00:00:00`).toISOString(),
    singleEvents: true
  }

  console.log(query)

  let calendar = google.calendar('v3');

  return new Promise ((resolve, reject) => {
    calendar.events.list({
      auth: auth,
      calendarId: encodeURIComponent(calenderId)
    },
    {
      qs: query
    },
    function(err, response) {
      if (err) {
        console.log('The API returned an error: ', err);
        reject(err);
      } else {
        var events = response.items;
        if (events.length == 0) {
          console.log('No events found.');
          reject();
        } else {
          resolve(events);
        }
      }
    })
  })
}

function _formatEvent (event) {
  let start = new Date(event.start.date || event.start.dateTime);
  let end = new Date(event.end.date || event.end.dateTime);
  let from = `${start.getHours()}:${start.getMinutes()}`;
  let to = `${end.getHours()}:${end.getMinutes()}`;

  let diff = (end.getTime() - start.getTime()) / 1000;
  diff /= 60;

  let formated = `${_formatDate(start)} - ${event.summary} - ${diff}m`;
  return formated;
}

function _formatDate (date) {
  let y = date.getFullYear();
  let m = ("0" + (date.getMonth() + 1)).slice(-2);
  let d = ("0" + date.getDate()).slice(-2);

  return `${y}-${m}-${d}`
}

function _exists (m) {
  try {
    require.resolve(m)
  } catch (e) {
    console.log("error", e)
    return false;
  }

  return true;
}

function _require (...modules) {
  for (m of modules) {
    if (_exists(m)) {
      return require(m);
    }
  }

  return null;
}

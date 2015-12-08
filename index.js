'use strict';
var API_KEY = undefined, URL_BASE = '/api/mainsms',
    crypto = require('crypto'),
    http = require('http');

// tools, mainsms.ru/home/api

var genSignature = function(options) {
  var signature = '',
      keys = Object.keys(options).sort(),
      i, imax = keys.length, key, value;

  for (i = 0; i < imax; i++) {
    key = keys[i];
    value = options[key];
    if (value || value === '' || value === 0) {
      signature += value + ';';
    }
  }

  signature += API_KEY;
  signature = crypto.createHash('sha1').update(signature).digest('hex');
  signature = crypto.createHash('md5').update(signature).digest('hex');

  return signature;
};

function sendRequest (url_base, options, callback) {
  var postData = options;
  postData.sign = genSignature(options);
  postData = require('querystring').stringify(postData);

  var request = http.request({
        method: 'POST',
        hostname: 'mainsms.ru',
        path: url_base,
        headers: {
          'Content-Length': postData.length,
          'Content-type': 'application/x-www-form-urlencoded'
        }
      }, function (res) {
        var body = '';

        // http error
        if (res.statusCode !== 200)
          callback({
            code: res.statusCode,
            message: 'HTTP ERROR: bad response code'
          });

        // http ok
        else {
          res.on('data', function (chunk) { body += chunk; });
          res.on('end', function () {

          // parse response
          try {
            body = JSON.parse(body);

            // mainsms ok
            if (body.status === 'success') {
              delete body.status;
              callback(null, body);
            }

            // mainsms error
            else if (body.status === 'error')
              callback({
                code: body.error,
                message: body.message
              });

            // mainsms unknown error
            else callback({
                code: 0,
                message: 'MAINSMS ERROR: unknown error'
              });
          } catch(err) {
            console.log(err);
            callback({
              code: res.statusCode,
              message: 'HTTP ERROR: bad response code'
            });
          }
        });
        }
      })

      // request error
      .on('error', function (err) {
        callback({
          code: -1,
          message: 'REQUEST ERROR: ' + err.message
        });
      });

  request.write(postData);
  request.end();
}

// message, mainsms.ru/home/mainapi

  var message = (function () {
    var URL_GROUP = URL_BASE + '/message';
    return {
      
      send: function (options, callback) {

        // allow array of recipients
        if (options.recipients instanceof Array) options.recipients = options.recipients.join(',');

        //
        sendRequest(URL_GROUP + '/send', options, callback);
      },

      status: function (options, callback) {

        // allow array of messages_id
        if (options.messages_id instanceof Array) options.messages_id = options.messages_id.join(',');

        //
        sendRequest(URL_GROUP + '/status', options, callback);
      },

      price: function (options, callback) {

        // allow array of recipients
        if (options.recipients instanceof Array) options.recipients = options.recipients.join(',');

        //
        sendRequest(URL_GROUP + '/price', options, callback);
      },

      balance: function (options, callback) {
        sendRequest(URL_GROUP + '/balance', options, callback);
      },

      info: function (options, callback) {

        // allow array of phones
        if (options.phones instanceof Array) options.phones = options.phones.join(',');

        //
        sendRequest(URL_GROUP + '/info', options, callback);
      }
    };
  })();

// export

  module.exports = function (key) {

    // fail
    if (!key) {
      console.log('node-mainsmsru: api key required');
      return null;
    }

    // ok
    else {
      API_KEY = key;
      return {
        message: message,
        sending: null,
        batch: null,
        group: null,
        contact: null,
        sender: null
      };
    }
  };

'use strict'

let CheckForProductMatrix = function (ncUtil, channelProfile, flowContext, payload, callback) {
    const request = require('request-promise');
    const jsonata = require('jsonata');
    const nc = require('../util/common');

    let out = {
        ncStatusCode: null,
        payload: {},
        response: {}
    };

    if (!callback) {
        throw new Error("A callback function was not provided");
    } else if (typeof callback !== 'function') {
        throw new TypeError("callback is not a function")
    }

    validateFunction()
        .then(queryProduct)
        .then(buildResponse)
        .catch(handleError)
        .then(() => callback(out))
        .catch(error => {
            logError(`The callback function threw an exception: ${error}`);
            setTimeout(() => {
                throw error;
            });
        });

    function logInfo(msg) {
        nc.log(msg, "info");
    }

    function logWarn(msg) {
        nc.log(msg, "warn");
    }

    function logError(msg) {
        nc.log(msg, "error");
    }

    async function validateFunction() {
        let invalidMsg;

        if (!ncUtil)
            invalidMsg = "ncUtil was not provided";
        else if (!channelProfile)
            invalidMsg = "channelProfile was not provided";
        else if (!channelProfile.channelSettingsValues)
            invalidMsg = "channelProfile.channelSettingsValues was not provided";
        else if (!channelProfile.channelAuthValues)
            invalidMsg = "channelProfile.channelAuthValues was not provided";
        else if (!channelProfile.channelSettingsValues.api_uri)
            invalidMsg = "channelProfile.channelSettingsValues.api_uri was not provided";
        else if (!channelProfile.channelAuthValues.store_hash)
            invalidMsg = "channelProfile.channelAuthValues.store_hash was not provided";
        else if (!channelProfile.channelAuthValues.access_token)
            invalidMsg = "channelProfile.channelAuthValues.access_token was not provided";
        else if (!channelProfile.channelAuthValues.client_id)
            invalidMsg = "channelProfile.channelAuthValues.client_id was not provided";
        else if (!channelProfile.productBusinessReferences)
            invalidMsg = "channelProfile.productBusinessReferences was not provided";
        else if (!nc.isArray(channelProfile.productBusinessReferences))
            invalidMsg = "channelProfile.productBusinessReferences is not an array";
        else if (!nc.isNonEmptyArray(channelProfile.productBusinessReferences))
            invalidMsg = "channelProfile.productBusinessReferences is empty";
        else if (!payload)
            invalidMsg = "payload was not provided";
        else if (!payload.doc)
            invalidMsg = "payload.doc was not provided";

        if (invalidMsg) {
            logError(invalidMsg);
            out.ncStatusCode = 400;
            throw new Error(`Invalid request [${invalidMsg}]`);
        }
        logInfo("Function is valid.");
    }

    async function queryProduct() {
        let headers = {
          "X-Auth-Client": channelProfile.channelAuthValues.client_id,
          "X-Auth-Token": channelProfile.channelAuthValues.access_token
        }

        logInfo(`Looking up Product`);

        let filters = {};
        channelProfile.productBusinessReferences.forEach(businessReference => {
            let value = nc.extractBusinessReference([businessReference], payload.doc);
            filters[businessReference] = value;
        });

        let response = await request.get({ url: `${channelProfile.channelSettingsValues.api_uri}/stores/${channelProfile.channelAuthValues.store_hash}/v3/catalog/products`, qs: filters, headers: headers, json: true, resolveWithFullResponse: true  })
          .catch((err) => { throw err; });

        return response;
    }

    async function buildResponse(response) {
        out.response.endpointStatusCode = response.statusCode;
        out.response.endpointStatusMessage = response.statusMessage;

        if (response.statusCode === 200 && response.body) {
          if (response.body.data && response.body.data.length == 1) {
            out.ncStatusCode = 200;
            out.payload = {
              productRemoteID: response.body.data[0].id,
              productBusinessReference: nc.extractBusinessReference(channelProfile.productBusinessReferences, response.body.data[0])
            };
          } else if (response.body.length > 1) {
            out.ncStatusCode = 409;
            out.payload.error = response.body;
          } else {
            out.ncStatusCode = 204;
          }
        } else if (response.statusCode === 429) {
          out.ncStatusCode = 429;
          out.payload.error = response.body;
        } else if (response.statusCode === 500) {
          out.ncStatusCode = 500;
          out.payload.error = response.body;
        } else {
          out.ncStatusCode = 400;
          out.payload.error = response.body;
        }
    }

    async function handleError(error) {
        logError(error);
        if (error.name === "StatusCodeError") {
            out.response.endpointStatusCode = error.statusCode;
            out.response.endpointStatusMessage = error.message;
            if (error.statusCode >= 500) {
                out.ncStatusCode = 500;
            } else if (error.statusCode === 429) {
                logWarn("Request was throttled.");
                out.ncStatusCode = 429;
            } else {
                out.ncStatusCode = 400;
            }
        }
        out.payload.error = error;
        out.ncStatusCode = out.ncStatusCode || 500;
    }
}

module.exports.CheckForProductMatrix = CheckForProductMatrix;
'use strict'

let UpdateProductQuantity = function (ncUtil, channelProfile, flowContext, payload, callback) {
    const request = require('request-promise');
    const jsonata = require('jsonata');
    const nc = require('../util/common');

    let out = {
        ncStatusCode: null,
        payload: {},
        response: {}
    };

    let headers = {};

    if (!callback) {
        throw new Error("A callback function was not provided");
    } else if (typeof callback !== 'function') {
        throw new TypeError("callback is not a function")
    }

    validateFunction()
        .then(getMatrixProduct)
        .then(updateProductQuantity)
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
        else if (!channelProfile.productQuantityBusinessReferences)
            invalidMsg = "channelProfile.productQuantityBusinessReferences was not provided";
        else if (!nc.isArray(channelProfile.productQuantityBusinessReferences))
            invalidMsg = "channelProfile.productQuantityBusinessReferences is not an array";
        else if (!nc.isNonEmptyArray(channelProfile.productQuantityBusinessReferences))
            invalidMsg = "channelProfile.productQuantityBusinessReferences is empty";
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

    async function getMatrixProduct() {
        headers = {
          "X-Auth-Client": channelProfile.channelAuthValues.client_id,
          "X-Auth-Token": channelProfile.channelAuthValues.access_token
        }

        logInfo(`Getting Product Matrix`);

        // Get variant products
        let response = await request.get({ url: `${channelProfile.channelSettingsValues.api_uri}/stores/${channelProfile.channelAuthValues.store_hash}/v3/catalog/products/${payload.productRemoteID}/variants`, headers: headers, json: true, resolveWithFullResponse: true  })
          .then ((response) => {
            logInfo('Assinging Variant IDs');
            // Update product variant IDs
            payload.doc.variants.forEach(variant => {
              // Look for a match by sku - If found, set the ID for each variant
              let match = response.body.data.find(x => x.sku = variant.sku);
              if (match) {
                variant.id = match.id;
                variant.product_id = payload.productRemoteID;
              }
            });

            // Set product ID
            payload.doc.id = payload.productRemoteID;
          })
          .catch((err) => { throw err; });
    }

    async function updateProductQuantity() {
        logInfo(`Updating Product Pricing`);

        // Update Quantity
        let response = await request.put({ url: `${channelProfile.channelSettingsValues.api_uri}/stores/${channelProfile.channelAuthValues.store_hash}/v3/catalog/products/${payload.productRemoteID}`, body: payload.doc, headers: headers, json: true, resolveWithFullResponse: true  })
          .catch((err) => { throw err; });

        return response;
    }

    async function buildResponse(response) {
        out.response.endpointStatusCode = response.statusCode;
        out.response.endpointStatusMessage = response.statusMessage;

        if (response.statusCode === 200 && response.body) {
          out.payload = {
            doc: response.body.data,
            productQuantityBusinessReference: nc.extractBusinessReference(channelProfile.productQuantityBusinessReferences, response.body.data)
          }

          out.ncStatusCode = 200;
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

module.exports.UpdateProductQuantity = UpdateProductQuantity;
'use strict';

module.exports = function (flowContext, payload) {
  let options = {
    uri: `${this.baseUri}/v2/customers/${payload.customerRemoteID}/addresses/${payload.customerAddressRemoteID}`,
    method: "PUT",
    body: payload.doc,
    resolveWithFullResponse: true
  };

  this.info(`Requesting [${options.method} ${options.uri}]`);

  delete payload.doc.id;

  return this.request(options).then(response => {
    return {
      endpointStatusCode: response.statusCode,
      statusCode: 200,
      payload: response.body
    };
  }).catch(this.handleRejection.bind(this));
};

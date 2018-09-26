'use strict';

function isFunction(func) {
    return typeof func === "function";
}

function isString(str) {
    return typeof str === "string";
}

function isObject(obj) {
    return typeof obj === "object" && obj != null && !isArray(obj) && !isFunction(obj);
}

function isNonEmptyObject(obj) {
    return isObject(obj) && Object.keys(obj).length > 0;
}

function isArray(arr) {
    return Array.isArray(arr);
}

function isNonEmptyArray(arr) {
    return isArray(arr) && arr.length > 0;
}

function isNumber(num) {
    return parseInt(num, 10) && !isNaN(num);
}

function isInteger(int) {
    return isNumber(int) && int % 1 === 0;
}

module.exports = { isFunction, isString, isObject, isNonEmptyObject, isArray, isNonEmptyArray, isNumber, isInteger };

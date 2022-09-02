// noinspection JSUnusedLocalSymbols,JSUnusedGlobalSymbols

import { emailRegExp } from "./RegExps";

/**
 *
 * @param {string} input
 * @returns {boolean}
 */
export function goodString(input) {
  return input && typeof input === "string" && input.length > 0;
}

/**
 *
 * @param {string} input
 * @returns {boolean}
 */
export function goodEmail(input) {
  return goodString(input) && input.match(emailRegExp) != null;
}

/**
 *
 * @param {string} input
 * @returns {boolean}
 */
export function badString(input) {
  return !goodString(input);
}

/**
 *
 * @param {string} input
 * @returns {boolean}
 */
export function badEmail(input) {
  return !goodEmail(input);
}

/**
 *
 * @param {string} url
 * @returns {boolean}
 */
export function goodUrl(url) {
  try {
    if (goodString(url)) {
      let url1 = new URL(url);
      return url1.protocol.indexOf("http") > -1;
    }
  } catch (e) {
    return false;
  }
}

export function goodArray(input) {
  return (
    typeof input !== "undefined" && Array.isArray(input) && input.length > 0
  );
}

export function goodObject(input) {
  return typeof input === "object" && Object.keys(input).length > 0;
}

export function badObject(input) {
  return !goodObject(input);
}

export function goodNumber(input) {
  return (
    typeof input === "number" &&
    !isNaN(input) &&
    input !== Infinity &&
    input !== -Infinity
  );
}

export function badNumber(input) {
  return !goodNumber(input);
}

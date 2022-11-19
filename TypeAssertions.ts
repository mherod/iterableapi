// noinspection JSUnusedGlobalSymbols

import { emailRegExp } from "./RegExps";

export function goodEmail(input: any): input is string {
  if (goodString(input)) {
    return input.match(emailRegExp) != null;
  }
  return false;
}

export function badEmail(input: any): boolean {
  return !goodEmail(input);
}

export function goodString(input: any): input is string {
  return input && typeof input === "string" && input.length > 0;
}

export function badString(input: any): boolean {
  return !goodString(input);
}

export function goodUrl(url: any): url is string {
  try {
    if (goodString(url)) {
      let url1 = new URL(url);
      return url1.protocol.indexOf("http") > -1;
    }
  } catch (e) {}
  return false;
}

export function goodObject(input: any): input is any {
  return typeof input === "object" && Object.keys(input).length > 0;
}

export function badObject(input: any): boolean {
  return !goodObject(input);
}

export function goodNumber(input: any): input is number {
  return (
    typeof input === "number" &&
    !isNaN(input) &&
    input !== Infinity &&
    input !== -Infinity
  );
}

export function badNumber(input: any): boolean {
  return !goodNumber(input);
}

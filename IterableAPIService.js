import { merge } from "lodash";
import { fetch } from "cross-fetch";
import {
  badEmail,
  badNumber,
  badObject,
  badString,
  goodEmail,
  goodString,
} from "./TypeAssertions";
import LRU from "lru-cache";
import { emailRegExp } from "./RegExps";

const logger = console;

const caches = {
  userByUserId: new LRU({
    max: 1000,
    ttl: 1000 * 60 * 5, // 5 minutes
  }),
  userByEmail: new LRU({
    max: 1000,
    ttl: 1000 * 60 * 5, // 5 minutes
  }),
};

// noinspection JSUnusedGlobalSymbols
export default class IterableAPIService {
  config;
  #apiKey;

  /**
   *
   * @param {{iterable_key: string}} config
   */
  constructor(config) {
    this.config = config;
    if (this.config == null) {
      throw new Error("config must not be null");
    }
    const iterableKey = this.config.iterable_key;
    if (typeof iterableKey != "string") {
      throw new Error("config must have iterable_key");
    }
    this.#apiKey = iterableKey;
  }

  get #headers() {
    return {
      accept: "application/json; charset=utf-8",
      "api-key": this.config.iterable_key,
    };
  }

  /**
   *
   * @param {string} email
   * @return {Promise<*>}
   */
  async fetchUserByEmail(email) {
    if (badEmail(email)) {
      logger.warn(
        "IterableAPIService.fetchUserByEmail: email is not a valid email"
      );
      return null;
    }
    if (caches.userByEmail.has(email)) {
      return caches.userByEmail.get(email);
    }
    try {
      let urlString;
      urlString = "https://api.iterable.com/api/users/getByEmail";
      const url = new URL(urlString);
      url.searchParams.set("email", email);
      urlString = url.toString();
      const response = await fetch(urlString, {
        method: "GET",
        headers: this.#headers,
      });
      const responseContentType = response.headers.get("content-type");
      const user = {};
      if (responseContentType === "application/json") {
        const json = await response.json();
        if (typeof json.user === "object") {
          merge(user, json.user);
          caches.userByEmail.set(email, user);
        }
      } else {
        logger.warn(
          "IterableAPIService.fetchUserByEmail: response is not json. contentType:",
          responseContentType
        );
      }
      return user;
    } catch (e) {
      logger.warn("Failed to fetch", e);
      return null;
    }
  }

  /**
   *
   * @param userId
   * @returns {Promise<null|*>}
   */
  async fetchUserByUserId(userId) {
    if (badString(userId)) {
      logger.warn(
        "IterableAPIService.fetchUserByUserId: userId is not a string or is empty"
      );
      return null;
    }
    if (caches.userByUserId.has(userId)) {
      return caches.userByUserId.get(userId);
    }
    try {
      let urlString;
      urlString = "https://api.iterable.com/api/users/byUserId";
      const url = new URL(urlString);
      url.searchParams.set("userId", userId);
      urlString = url.toString();
      const response = await fetch(urlString, {
        method: "GET",
        headers: this.#headers,
      });
      const responseContentType = response.headers.get("content-type");
      const user = {};
      if (responseContentType === "application/json") {
        const json = await response.json();
        if (typeof json.user === "object") {
          merge(user, json.user);
          caches.userByUserId.set(userId, user);
        }
      } else {
        logger.warn(
          "IterableAPIService.fetchUserByUserId: response is not json. contentType:",
          responseContentType
        );
      }
      return user;
    } catch (e) {
      logger.warn("Failed to fetch", e);
      return null;
    }
  }

  /**
   *
   * @param {string} name
   * @param description
   * @returns {Promise<null|({listId : number})>}
   */
  async createStaticList({ name, description }) {
    if (badString(name)) {
      logger.warn(
        "IterableAPIService.createStaticList: name is not a string or is empty"
      );
      return null;
    }
    if (typeof description !== "string" || description.length === 0) {
      logger.warn(
        "IterableAPIService.createStaticList: description is not a string or is empty"
      );
      return null;
    }
    try {
      const response = await fetch(`https://api.iterable.com/api/lists`, {
        method: "POST",
        headers: this.#headers,
        body: JSON.stringify({
          name: name,
          description: description,
        }),
      });
      return await response.json();
    } catch (e) {
      logger.warn("Failed to create static list", e);
      return null;
    }
  }

  async fetchLists() {
    try {
      const response = await fetch("https://api.iterable.com/api/lists", {
        method: "GET",
        headers: this.#headers,
      });
      return await response.json();
    } catch (e) {
      logger.warn("Failed to fetch", e);
      return null;
    }
  }

  /**
   *
   * @param {string} listId
   * @returns {Promise<string[]>}
   */
  async fetchListUsers(listId) {
    if (badString(listId)) {
      logger.warn(
        "IterableAPIService.fetchList: listId is not a string or is empty"
      );
      return [];
    }
    try {
      const url = new URL("https://api.iterable.com/api/lists/getUsers");
      url.searchParams.set("listId", listId);
      const response = await fetch(url, {
        method: "GET",
        headers: this.#headers,
      });
      const text = await response.text();
      return text.split("\n").filter(goodEmail);
    } catch (e) {
      logger.warn("Failed to fetch", e);
      return [];
    }
  }

  /**
   *
   * @param {string|number} listId
   * @param {Array<{email : (string|null), userId: (string|null)}>} subscribers
   * @returns {Promise<null|*>}
   */
  async subscribeToList(listId, subscribers = []) {
    if (badString(listId) && badNumber(listId)) {
      throw new Error(
        "IterableAPIService.subscribeToList: listId is not a string or is empty"
      );
    }
    if (!Array.isArray(subscribers)) {
      throw new Error(
        "IterableAPIService.subscribeToList: subscribers is not an array"
      );
    }
    try {
      const response = await fetch(
        `https://api.iterable.com/api/lists/subscribe`,
        {
          method: "POST",
          headers: this.#headers,
          body: JSON.stringify({
            listId: listId,
            subscribers: [...subscribers],
          }),
        }
      );
      return await response.json();
    } catch (e) {
      logger.warn("Failed to fetch", e);
      return null;
    }
  }

  /**
   *
   * @param email
   * @return {Promise<{}>}
   */
  async fetchUserEvents({ email }) {
    const events = [];
    if (typeof email !== "string" || email.length === 0) {
      logger.warn(
        "IterableAPIService.fetchUserEvents: email is not a string or is empty"
      );
      return events;
    }
    try {
      const emailUriEncoded = encodeURIComponent(email);
      const response = await fetch(
        `https://api.iterable.com/api/events/${emailUriEncoded}?limit=200`,
        {
          method: "GET",
          headers: this.#headers,
        }
      );
      const json = await response.json();
      events.push(...json["events"]);
    } catch (e) {
      logger.warn("Failed to fetch", e);
    }
    return events;
  }

  /**
   *
   * @param {string} templateId
   * @param {string} type
   * @returns {Promise<null|*>}
   */
  async fetchTemplate(templateId, type) {
    const url = new URL(`https://api.iterable.com/api/templates/${type}/get`);
    url.searchParams.set("templateId", templateId);
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: this.#headers,
      });
      return await response.json();
    } catch (e) {
      logger.warn("Failed to fetch", e);
      return null;
    }
  }

  async fetchInAppMessagesForUser(userId) {
    if (badString(userId)) {
      logger.warn(
        "IterableAPIService.fetchInAppMessagesForUser: userId is not a string or is empty"
      );
      return null;
    }
    const url = new URL("https://api.iterable.com/api/inApp/getMessages");
    const searchParams = url.searchParams;
    searchParams.set("userId", userId);
    searchParams.set("count", "5");
    searchParams.set("platform", "Web");
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: this.#headers,
      });
      return await response.json();
    } catch (e) {
      logger.warn("Failed to fetch", e);
      return null;
    }
  }

  async markInAppMessageAsDelivered(userId, messageId) {
    return this.trackInAppMessageEvent({
      userId: userId,
      messageId: messageId,
      event: "trackInAppDelivery",
    });
  }

  async markInAppMessageAsRead(userId, messageId) {
    return this.trackInAppMessageEvent({
      userId: userId,
      messageId: messageId,
      event: "trackInAppOpen",
    });
  }

  async trackInAppMessageEvent({
    userId,
    messageId,
    event,
    //
  }) {
    if (badString(userId)) {
      logger.warn(
        "IterableAPIService.trackInAppMessageEvent: userId is not a string or is empty"
      );
      return null;
    }
    if (badString(messageId)) {
      logger.warn(
        "IterableAPIService.trackInAppMessageEvent: messageId is not a string or is empty"
      );
      return null;
    }
    if (badString(event)) {
      logger.warn(
        "IterableAPIService.trackInAppMessageEvent: event is not a string or it is empty"
      );
    }
    try {
      const response = await fetch(
        `https://api.iterable.com/api/events/${event}`,
        {
          method: "POST",
          headers: this.#headers,
          body: JSON.stringify({
            userId: userId,
            messageId: messageId,
          }),
        }
      );
      return await response.text();
    } catch (e) {
      logger.warn("Failed to fetch", e);
      return null;
    }
  }

  /**
   *
   * @param {string} type
   * @param {object} body
   * @returns {Promise<null|*>}
   */
  async updateTemplate(type, body) {
    if (badString(type)) {
      logger.warn(
        "IterableAPIService.updateTemplate: type is not a string or is empty"
      );
      return null;
    }
    if (badObject(body)) {
      logger.warn(
        "IterableAPIService.updateTemplate: body is not valid object"
      );
      return null;
    }
    try {
      const response = await fetch(
        `https://api.iterable.com/api/templates/${type}/update`,
        {
          method: "POST",
          headers: this.#headers,
          body: JSON.stringify(body),
        }
      );
      return await response.text();
    } catch (e) {
      logger.warn("Failed to fetch", e);
      return null;
    }
  }

  /**
   *
   * @param {string} email
   * @param {string} userId
   * @param dataFields
   * @returns {Promise<null|*>}
   */
  async putUserData({ email, userId, dataFields }) {
    if (email === undefined && userId === undefined) {
      logger.warn(
        "IterableAPIService.putUserData: must provide either email or userId"
      );
      return null;
    }
    if (userId == null && goodString(email) && !email.match(emailRegExp)) {
      logger.warn(
        "IterableAPIService.putUserData: email provided does not appear to be a valid email address"
      );
      return null;
    }
    const payload = {
      dataFields: dataFields,
      mergeNestedObjects: true,
    };
    const hasEmail = goodString(email);
    if (hasEmail) {
      payload.email = email;
    }
    const hasUserId = goodString(userId);
    if (hasUserId) {
      payload.userId = userId;
    }
    payload.preferUserId = hasUserId && hasEmail;
    try {
      const response = await fetch(
        "https://api.iterable.com/api/users/update",
        {
          method: "POST",
          headers: this.#headers,
          body: JSON.stringify(payload),
        }
      );
      return await response.json();
    } catch (e) {
      logger.error("Failed to put user data", e);
      return null;
    }
  }

  /**
   *
   * @param {string} catalog
   * @param {string|number} page
   * @param {string|number} limit
   * @returns {Promise<null|*>}
   */
  async listCatalogItems(catalog, page = 1, limit = 100) {
    if (typeof catalog !== "string" || catalog.length === 0) {
      logger.warn(
        "IterableAPIService.listCatalogItems: catalog is not a string or is empty"
      );
      return null;
    }
    if (typeof page !== "string" && typeof page !== "number") {
      logger.warn(
        "IterableAPIService.listCatalogItems: page is not a string or number"
      );
      return null;
    }
    if (typeof limit !== "string" && typeof limit !== "number") {
      logger.warn(
        "IterableAPIService.listCatalogItems: limit is not a string or number"
      );
      return null;
    }
    try {
      const url = new URL(
        `https://api.iterable.com/api/catalogs/${catalog}/items`
      );
      const searchParams = url.searchParams;
      searchParams.set("page", `${page}`);
      searchParams.set("pageSize", `${limit}`);
      const response = await fetch(url, {
        method: "GET",
        headers: this.#headers,
      });
      return await response.json();
    } catch (e) {
      logger.error("Failed to list catalogs", e);
      return null;
    }
  }

  /**
   *
   * @param {string} catalog
   * @param {string} itemId
   * @param {object} item
   * @returns {Promise<null|*>}
   */
  async createOrReplaceCatalogItem(catalog, itemId, item) {
    if (typeof catalog !== "string" || catalog.length === 0) {
      logger.warn(
        "IterableAPIService.createOrReplaceCatalogItem: catalog is not a string or is empty"
      );
      return null;
    }
    if (typeof itemId !== "string" || itemId.length === 0) {
      logger.warn(
        "IterableAPIService.createOrReplaceCatalogItem: itemId is not a string or is empty"
      );
      return null;
    }
    if (typeof item !== "object") {
      logger.warn(
        "IterableAPIService.createOrReplaceCatalogItem: item is not an object"
      );
      return null;
    }
    try {
      const body = {
        value: item.data ?? item,
      };
      const response = await fetch(
        `https://api.iterable.com/api/catalogs/${catalog}/items/${itemId}`,
        {
          method: "PUT",
          headers: this.#headers,
          body: JSON.stringify(body),
        }
      );
      return await response.json();
    } catch (e) {
      logger.error("Failed to put catalog item", e);
      return null;
    }
  }

  /**
   *
   * @param catalog
   * @param {string} itemId
   * @param {object} item
   * @returns {Promise<null|*>}
   */
  async createOrUpdateCatalogItem(catalog, itemId, item) {
    if (typeof catalog !== "string" || catalog.length === 0) {
      logger.warn(
        "IterableAPIService.createOrUpdateCatalogItem: catalog is not a string or is empty"
      );
      return null;
    }
    if (typeof itemId !== "string" || itemId.length === 0) {
      logger.warn(
        "IterableAPIService.createOrUpdateCatalogItem: itemId is not a string or is empty"
      );
      return null;
    }
    if (typeof item !== "object") {
      logger.warn(
        "IterableAPIService.createOrUpdateCatalogItem: item is not an object"
      );
      return null;
    }
    try {
      const body = {
        update: item.data ?? item,
      };
      const response = await fetch(
        `https://api.iterable.com/api/catalogs/${catalog}/items/${itemId}`,
        {
          method: "PATCH",
          headers: this.#headers,
          body: JSON.stringify(body),
        }
      );
      return await response.json();
    } catch (e) {
      logger.error("Failed to put catalog item", e);
      return null;
    }
  }

  /**
   * @param {string} catalog
   * @param {string|Array<string>} itemId
   */
  async deleteCatalogItem(catalog, itemId) {
    if (badString(catalog)) {
      logger.warn(
        "IterableAPIService.deleteCatalogItem: catalog is not a string or is empty"
      );
      return null;
    }
    if (typeof itemId !== "string" && !Array.isArray(itemId)) {
      logger.warn(
        "IterableAPIService.deleteCatalogItem: itemId is not a string or array"
      );
      return null;
    }
    const itemIds = [];
    if (typeof itemId === "string") {
      itemIds.push(itemId);
    } else if (Array.isArray(itemId)) {
      itemIds.push(...itemId);
    } else {
      logger.warn(
        "IterableAPIService.deleteCatalogItem: itemId must be a string or array of strings"
      );
      return null;
    }
    try {
      const body = {
        itemIds: itemIds,
      };
      const response = await fetch(
        `https://api.iterable.com/api/catalogs/${catalog}/items/${itemId}`,
        {
          method: "DELETE",
          headers: this.#headers,
          body: JSON.stringify(body),
        }
      );
      return await response.json();
    } catch (e) {
      logger.error("Failed to put catalog item", e);
      return null;
    }
  }

  async triggerInAppForUserId(userId, campaignId) {
    if (badString(userId)) {
      logger.warn(
        "IterableAPIService.triggerInAppForUserId: userId is not a string or is empty"
      );
      return null;
    }
    if (badString(campaignId)) {
      logger.warn(
        "IterableAPIService.triggerInAppForUserId: campaignId is not a string or is empty"
      );
      return null;
    }
    try {
      const response = await fetch(
        `https://api.iterable.com/api/inApp/target`,
        {
          method: "POST",
          headers: this.#headers,
          body: JSON.stringify({
            campaignId: campaignId,
            recipientUserId: userId,
          }),
        }
      );
      return await response.json();
    } catch (e) {
      logger.error("Failed to get user data", e);
      return null;
    }
  }

  async triggerInAppForEmail(email, campaignId) {
    if (badString(email)) {
      logger.warn(
        "IterableAPIService.triggerInAppForEmail: email is not a string or is empty"
      );
      return null;
    }
    if (badString(campaignId)) {
      logger.warn(
        "IterableAPIService.triggerInAppForUserId: campaignId is not a string or is empty"
      );
      return null;
    }
    try {
      const response = await fetch(
        `https://api.iterable.com/api/inApp/target`,
        {
          method: "POST",
          headers: this.#headers,
          body: JSON.stringify({
            campaignId: campaignId,
            recipientEmail: email,
          }),
        }
      );
      return await response.json();
    } catch (e) {
      logger.error("Failed to get user data", e);
      return null;
    }
  }

  /**
   * @deprecated use fetchUserByEmail instead
   * @param email
   * @returns {Promise<{ user: * }>}
   */
  async fetchUserIterableData(email) {
    if (badString(email) || !email.match(emailRegExp)) {
      throw new Error(
        "IterableAPIService.fetchUserIterableData: email provided is not a valid email address"
      );
    }
    return {
      user: await this.fetchUserByEmail(email),
    };
  }
}

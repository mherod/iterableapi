import { merge } from "lodash";
import { fetch } from "cross-fetch";
import { badNumber, badString, goodString } from "./TypeAssertions";
import LRU from "lru-cache";

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
    if (typeof email !== "string" || email.length === 0) {
      logger.warn(
        "IterableDataService.fetchUserByEmail: email is not a string or is empty"
      );
      return null;
    }
    if (email.match(/^[^@]+@[^@]+\.[^@]+$/) === null) {
      logger.warn(
        "IterableDataService.fetchUserByEmail: email is not a valid email"
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
          "IterableDataService.fetchUserByEmail: response is not json. contentType:",
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
        "IterableDataService.fetchUserByUserId: userId is not a string or is empty"
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
          "IterableDataService.fetchUserByUserId: response is not json. contentType:",
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
   * @param name
   * @param description
   * @returns {Promise<null|({listId : number})>}
   */
  async createStaticList({ name, description }) {
    if (typeof name !== "string" || name.length === 0) {
      logger.warn(
        "IterableDataService.createStaticList: name is not a string or is empty"
      );
      return null;
    }
    if (typeof description !== "string" || description.length === 0) {
      logger.warn(
        "IterableDataService.createStaticList: description is not a string or is empty"
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
   * @returns {Promise<null|*>}
   */
  async fetchListUsers(listId) {
    if (typeof listId !== "string" || listId.length === 0) {
      logger.warn(
        "IterableDataService.fetchList: listId is not a string or is empty"
      );
      return null;
    }
    let urlString;
    urlString = "https://api.iterable.com/api/lists/getUsers";
    const url = new URL(urlString);
    url.searchParams.set("listId", listId);
    urlString = url.toString();
    const response = await fetch(urlString, {
      method: "GET",
      headers: this.#headers,
    });
    const text = await response.text();
    return text.split("\n").filter((email) => {
      // email regex
      return typeof email === "string" && email.match(/^.+@.+$/i);
    });
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
        "IterableDataService.subscribeToList: listId is not a string or is empty"
      );
    }
    if (!Array.isArray(subscribers)) {
      throw new Error(
        "IterableDataService.subscribeToList: subscribers is not an array"
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
        "IterableDataService.fetchUserEvents: email is not a string or is empty"
      );
      return events;
    }
    try {
      const response = await fetch(
        `https://api.iterable.com/api/events/${encodeURIComponent(
          email
        )}?limit=200`,
        {
          method: "GET",
          headers: this.#headers,
        }
      );
      let json = await response.json();
      events.push(...json.events);
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
    let urlString;
    urlString = `https://api.iterable.com/api/templates/${type}/get`;
    const url = new URL(urlString);
    url.searchParams.set("templateId", templateId);
    urlString = url.toString();
    try {
      const response = await fetch(urlString, {
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
    if (typeof userId !== "string" || userId.length === 0) {
      logger.warn(
        "IterableDataService.fetchInAppMessagesForUser: userId is not a string or is empty"
      );
      return null;
    }
    let urlString = "https://api.iterable.com/api/inApp/getMessages";
    const url = new URL(urlString);
    url.searchParams.set("userId", userId);
    url.searchParams.set("count", "5");
    url.searchParams.set("platform", "Web");
    urlString = url.toString();
    try {
      const response = await fetch(urlString, {
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
    if (typeof userId !== "string" || userId.length === 0) {
      logger.warn(
        "IterableDataService.trackInAppMessageEvent: userId is not a string or is empty"
      );
      return null;
    }
    if (typeof messageId !== "string" || messageId.length === 0) {
      logger.warn(
        "IterableDataService.trackInAppMessageEvent: messageId is not a string or is empty"
      );
      return null;
    }
    if (typeof event !== "string" || event.length === 0) {
      logger.warn(
        "IterableDataService.trackInAppMessageEvent: event is not a string or it is empty"
      );
    }
    const body = {
      userId,
      messageId,
    };
    try {
      const response = await fetch(
        "https://api.iterable.com/api/events/" + event,
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
   * @param {string} type
   * @param {object} body
   * @returns {Promise<null|*>}
   */
  async updateTemplate(type, body) {
    if (typeof type !== "string" || type.length === 0) {
      logger.warn(
        "IterableDataService.updateTemplate: type is not a string or is empty"
      );
      return null;
    }
    if (typeof body !== "object") {
      logger.warn("IterableDataService.updateTemplate: body is not an object");
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
        "IterableDataService.putUserData: must define either email or userId"
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
      payload.preferUserId = hasUserId && hasEmail;
    }
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
        "IterableDataService.listCatalogItems: catalog is not a string or is empty"
      );
      return null;
    }
    if (typeof page !== "string" && typeof page !== "number") {
      logger.warn(
        "IterableDataService.listCatalogItems: page is not a string or number"
      );
      return null;
    }
    if (typeof limit !== "string" && typeof limit !== "number") {
      logger.warn(
        "IterableDataService.listCatalogItems: limit is not a string or number"
      );
      return null;
    }
    try {
      const url = new URL(
        `https://api.iterable.com/api/catalogs/${catalog}/items`
      );
      url.searchParams.set("page", `${page}`);
      url.searchParams.set("pageSize", `${limit}`);
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
        "IterableDataService.createOrReplaceCatalogItem: catalog is not a string or is empty"
      );
      return null;
    }
    if (typeof itemId !== "string" || itemId.length === 0) {
      logger.warn(
        "IterableDataService.createOrReplaceCatalogItem: itemId is not a string or is empty"
      );
      return null;
    }
    if (typeof item !== "object") {
      logger.warn(
        "IterableDataService.createOrReplaceCatalogItem: item is not an object"
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
        "IterableDataService.createOrUpdateCatalogItem: catalog is not a string or is empty"
      );
      return null;
    }
    if (typeof itemId !== "string" || itemId.length === 0) {
      logger.warn(
        "IterableDataService.createOrUpdateCatalogItem: itemId is not a string or is empty"
      );
      return null;
    }
    if (typeof item !== "object") {
      logger.warn(
        "IterableDataService.createOrUpdateCatalogItem: item is not an object"
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
    if (typeof catalog !== "string" || catalog.length === 0) {
      logger.warn(
        "IterableDataService.deleteCatalogItem: catalog is not a string or is empty"
      );
      return null;
    }
    if (typeof itemId !== "string" && !Array.isArray(itemId)) {
      logger.warn(
        "IterableDataService.deleteCatalogItem: itemId is not a string or array"
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
        "IterableDataService.deleteCatalogItem: itemId must be a string or array of strings"
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
    if (typeof userId !== "string" || userId.length === 0) {
      logger.warn(
        "IterableDataService.triggerInAppForUserId: userId is not a string or is empty"
      );
      return null;
    }
    if (typeof campaignId !== "string" || campaignId.length === 0) {
      logger.warn(
        "IterableDataService.triggerInAppForUserId: campaignId is not a string or is empty"
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
    if (typeof email !== "string" || email.length === 0) {
      logger.warn(
        "IterableDataService.triggerInAppForEmail: email is not a string or is empty"
      );
      return null;
    }
    if (typeof campaignId !== "string" || campaignId.length === 0) {
      logger.warn(
        "IterableDataService.triggerInAppForUserId: campaignId is not a string or is empty"
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
    return {
      user: await this.fetchUserByEmail(email),
    };
  }
}

import { merge } from "lodash";
import { fetch } from "cross-fetch";
import {
  badEmail,
  badNumber,
  badObject,
  badString,
  goodEmail,
  goodString
} from "./TypeAssertions";

import { emailRegExp } from "./RegExps";
import MyLRUCache from "./MyLRUCache";

const logger = console;

const caches = {
  userByUserId: new MyLRUCache({
    max: 1000,
    ttl: 1000 * 60 * 5 // 5 minutes
  }),
  userByEmail: new MyLRUCache({
    max: 1000,
    ttl: 1000 * 60 * 5 // 5 minutes
  })
};

export type UncheckedObject = any;

export interface IterableUser {
  userId: string;
}

// interface IterablePutUserDataPayload {
//   email: any;
//   userId: any;
//   preferUserId: boolean;
//   dataFields: any;
//   mergeNestedObjects: boolean;
// }

// noinspection JSUnusedGlobalSymbols
export default class IterableAPIService {
  #apiKey;

  /**
   *
   * @param {{iterable_key: string}|string} config
   */
  constructor(config) {
    if (typeof config == "string") {
      this.#apiKey = config;
    } else if (typeof config == "object") {
      const iterableKey = config.iterable_key;
      if (badString(iterableKey)) {
        throw new Error("config must have iterable_key");
      }
      this.#apiKey = iterableKey;
    }
  }

  get #headers(): {
    //
    "api-key": string;
    accept: "application/json; charset=utf-8"
    //
  } {
    return {
      accept: "application/json; charset=utf-8",
      "api-key": this.#apiKey
    };
  }

  async fetchUserIdByEmail(email): Promise<string> {
    const user: IterableUser = await this.fetchUserByEmail(email);
    return user.userId;
  }

  async fetchUserByEmail(email: string): Promise<IterableUser> {
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
      const url = new URL("https://api.iterable.com/api/users/getByEmail");
      url.searchParams.set("email", email);
      const response = await fetch(url, {
        method: "GET",
        headers: this.#headers
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
      return user as IterableUser;
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
      const url = new URL("https://api.iterable.com/api/users/byUserId");
      url.searchParams.set("userId", userId);
      const response = await fetch(url, {
        method: "GET",
        headers: this.#headers
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
  async createStaticList({
                           name,
                           description
                         }: {
    name: string;
    description: string;
  }) {
    if (badString(name)) {
      logger.warn(
        "IterableAPIService.createStaticList: name is not a string or is empty"
      );
      return null;
    }
    if (badString(description)) {
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
          description: description
        })
      });
      return await response.json();
    } catch (e) {
      logger.warn("Failed to create static list", e);
      return null;
    }
  }

  async fetchLists(): Promise<UncheckedObject | null> {
    try {
      const response = await fetch("https://api.iterable.com/api/lists", {
        method: "GET",
        headers: this.#headers
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
        headers: this.#headers
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
            subscribers: [...subscribers]
          })
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
      const url = new URL(
        `https://api.iterable.com/api/events/${emailUriEncoded}`
      );
      url.searchParams.set("limit", "200");
      const response = await fetch(url, {
        method: "GET",
        headers: this.#headers
      });
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
        headers: this.#headers
      });
      return await response.json();
    } catch (e) {
      logger.warn("Failed to fetch", e);
      return null;
    }
  }

  async fetchInAppMessagesForUser(userId): Promise<UncheckedObject> {
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
        headers: this.#headers
      });
      return await response.json();
    } catch (e) {
      logger.warn("Failed to fetch", e);
      return null;
    }
  }

  async markInAppMessageAsDelivered(
    //
    userId: string,
    messageId: string
    //
  ) {
    return this.trackInAppMessageEvent({
      userId: userId,
      messageId: messageId,
      event: "trackInAppDelivery"
    });
  }

  async markInAppMessageAsRead(userId, messageId) {
    return this.trackInAppMessageEvent({
      userId: userId,
      messageId: messageId,
      event: "trackInAppOpen"
    });
  }

  async trackInAppMessageEvent({
                                 userId,
                                 messageId,
                                 event
                               }: //
                                 {
                                   userId: string;
                                   messageId: string;
                                   event: string;
                                 }) //
  {
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
            messageId: messageId
          })
        }
      );
      return await response.text();
    } catch (e) {
      logger.warn("Failed to fetch", e);
      return null;
    }
  }

  async updateTemplate(type: string, body: UncheckedObject): Promise<string> {
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
          body: JSON.stringify(body)
        }
      );
      return await response.text();
    } catch (e) {
      logger.warn("Failed to fetch", e);
      return null;
    }
  }

  async putUserData(
    //
    {
      email,
      userId,
      dataFields
    }: //
      {
        email?: string;
        userId?: string;
        dataFields: UncheckedObject;
      }
  ): //
    Promise<UncheckedObject> {
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
    const payload: any = {
      dataFields: dataFields,
      mergeNestedObjects: true
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
          body: JSON.stringify(payload)
        }
      );
      return await response.json();
    } catch (e) {
      logger.error("Failed to put user data", e);
      return null;
    }
  }

  async listCatalogItems(
    //
    catalog: string,
    page: number = 1,
    limit: number = 100
    //
  ): Promise<UncheckedObject> {
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
        headers: this.#headers
      });
      return await response.json();
    } catch (e) {
      logger.error("Failed to list catalogs", e);
      return null;
    }
  }

  async createOrReplaceCatalogItem(
    //
    catalog: string,
    itemId: string,
    item: {
      data: UncheckedObject;
      //
    }
    //
  ): Promise<any> {
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
        value: item.data ?? item
      };
      const response = await fetch(
        `https://api.iterable.com/api/catalogs/${catalog}/items/${itemId}`,
        {
          method: "PUT",
          headers: this.#headers,
          body: JSON.stringify(body)
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
        update: item.data ?? item
      };
      const response = await fetch(
        `https://api.iterable.com/api/catalogs/${catalog}/items/${itemId}`,
        {
          method: "PATCH",
          headers: this.#headers,
          body: JSON.stringify(body)
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
        itemIds: itemIds
      };
      const response = await fetch(
        `https://api.iterable.com/api/catalogs/${catalog}/items/${itemId}`,
        {
          method: "DELETE",
          headers: this.#headers,
          body: JSON.stringify(body)
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
            recipientUserId: userId
          })
        }
      );
      return await response.json();
    } catch (e) {
      logger.error("Failed to get user data", e);
      return null;
    }
  }

  async triggerInAppForEmail(email: string, campaignId: string) {
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
            recipientEmail: email
          })
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
   * @returns {Promise<{ user: * }>}
   */
  async fetchUserIterableData(email: string): Promise<{ user: IterableUser }> {
    if (badString(email) || !email.match(emailRegExp)) {
      throw new Error(
        "IterableAPIService.fetchUserIterableData: email provided is not a valid email address"
      );
    }
    return {
      user: await this.fetchUserByEmail(email)
    };
  }
}

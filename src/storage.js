/* global browser */

import {sortingType} from "./constants";

const _VERSION = 1;

const defaultState = {
    // Non-settings
    version: _VERSION,
    token: null,
    mode: 'about',
    popupSize: 1,
    previewQuality: 0,
    localFollows: [],
    followedGames: [],
    favorites: [],
    favoritesMode: false,
    followedGamesSorting: sortingType.FOLLOWED_DATE,
    followedStreamsSorting: sortingType.VIEWERS,
    followedVideosSorting: sortingType.NEWEST,
    followedChannelsSorting: sortingType.FOLLOWED_DATE,
    showAvatars: false,
    showAvatarsFollowed: false,

    // global
    darkMode: false,
    tooltips: true,
    fetchAllFollowedVideos: false,

    // notifications
    // text & audio for favorites, text for non-favorites
    notifications: 13,
    notificationClick: 0,
    notificationVolume: 20,

    minutesBetweenCheck: 1,
    languageCodes: '',
};

const deferredSettingsKeys = ['mode', 'followedGamesSorting', 'followedStreamsSorting', 'followedVideosSorting', 'followedChannelsSorting'];
const flagSettings = ['notifications', 'notificationClick'];
const hugeSettings = ['localFollows', 'followedGames', 'favorites'];

let storage = {};
let deferredSettings = {};
let engine = 'local';

export default {
    async load() {
        // check preferred engine
        const localSettings = await browser.storage.local.get(['engine', ...hugeSettings]);
        engine = localSettings?.engine === 'sync' ? 'sync' : 'local';
        console.log('Preferred engine:', engine);

        // load all saved settings
        storage = await browser.storage.sync.get(null);

        if (engine === 'local') {
            hugeSettings.forEach(settingKey => {
                storage[settingKey] = localSettings[settingKey] ?? [];
            });
        }

        // Stamp current schema version
        if (! storage.version) {
            browser.storage.sync.set({ version: _VERSION });
        }

        // console.log('settings', storage);

        return storage;
    },

    get(key, flag = null) {
        if (key === 'engine') return engine;

        const setting = storage[key] !== undefined
            ? storage[key]
            : defaultState[key];

        if (flagSettings.includes(key)) {
            return (setting & flag) === flag;
        }

        return setting;
    },

    getAll() {
        const { token, ...rest } = storage;
        return rest;
    },

    // set in local storage if setting exists
    // no undefineds!!
    async set(key, value, addFlag = false) {
        if (defaultState[key] !== undefined && value !== undefined) {
            // handle flags
            if (flagSettings.includes(key)) {
                const currentFlags = storage[key] ?? defaultState[key];

                if (addFlag) value = currentFlags | value;
                else         value = currentFlags & ~value;
            }

            if (deferredSettingsKeys.includes(key)) {
                deferredSettings[key] = value;
                storage[key] = value;
                return true;
            }

            if (hugeSettings.includes(key)) {
                await browser.storage[engine].set({[key]: value});
            } else {
                await browser.storage.sync.set({[key]: value});
            }

            storage[key] = value;
            return true;
        }

         return false;
    },

    saveDeferred() {
        if (Object.keys(deferredSettings).length) {
            // This assumes all deferred settings belong to sync storage engine
            browser.storage.sync.set(deferredSettings);
            deferredSettings = {};
        }
    },

    async switchEngine(nextEngine) {
        if (! ['local', 'sync'].includes(nextEngine)) return 'Invalid engine';
        if (engine === nextEngine) return 'Cannot switch to same engine';
        console.log(`Switching storage engine: ${engine} -> ${nextEngine}`);

        let newSettings = {};
        hugeSettings.forEach(key => {
            newSettings[key] = storage[key];
        });

        try {
            await browser.storage[nextEngine].set(newSettings);
        } catch (e) {
            console.log(e);
            return e;
        }

        browser.storage.local.set({ engine: nextEngine });
        engine = nextEngine;

        return true;
    },

    async import(json) {
        const settings = JSON.parse(json);
        let settingsToSet = {};
        let bigSettingsToSet = {};

        for (const property in defaultState) {
            if (['engine', 'version', 'token'].includes(property)) continue;

            // console.log(`Trying ${property}`, typeof settings[property], typeof defaultState[property]);
            if (settings[property] && (typeof settings[property] === typeof defaultState[property])) {
                if (hugeSettings.includes(property)) {
                    bigSettingsToSet[property] = settings[property];
                } else {
                    settingsToSet[property] = settings[property];
                }
            }
        }

        console.log('Importing: ', settingsToSet, bigSettingsToSet);
        if (engine && engine === 'local') {
            await browser.storage.local.set(bigSettingsToSet);
            await browser.storage.sync.set(settingsToSet);
        } else {
            await browser.storage.sync.set({ ...settingsToSet, ...bigSettingsToSet });
        }

        storage = { ...storage, ...settingsToSet, ...bigSettingsToSet };
    },

    async resetSettings() {
        await browser.storage.local.clear();
        await browser.storage.sync.clear();
        await this.load();
    }
}

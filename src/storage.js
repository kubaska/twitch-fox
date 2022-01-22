/* global browser */

const _VERSION = 1;

const defaultState = {
    // Non-settings
    version: _VERSION,
    token: null,
    localFollows: [],
    favorites: [],
    favoritesMode: false,

    // global
    darkMode: false,
    tooltips: true,

    // notifications
    // text & audio for favorites, text for non-favorites
    notifications: 13,
    notificationVolume: 20,
    openTwitchPage: false,
    openPopout: false,
    openChat: false,

    minutesBetweenCheck: 1,
    languageCodes: '',
};

const flagSettings = ['notifications'];

let storage = {};

export default {
    async load() {
        // load all saved settings
        const settings = await browser.storage.sync.get(null);

        console.log('settings', settings);

        storage = settings;
    },

    get(key, flag = null) {
        const setting = storage[key] !== undefined
            ? storage[key]
            : defaultState[key];

        if (flagSettings.includes(key)) {
            return (setting & flag) === flag;
        }

        return setting;
    },

    set(key, value, addFlag = false) {
        // set in local storage if setting exists
        // no undefineds!!
        if (defaultState[key] !== undefined && value !== undefined) {
            // handle flags
            if (flagSettings.includes(key)) {
                const currentFlags = storage[key] ?? defaultState[key];

                if (addFlag) value = currentFlags | value;
                else         value = currentFlags & ~value;
            }

            storage[key] = value;

            browser.storage.sync.set({[key]: value});
        }

         return false;
    }
}

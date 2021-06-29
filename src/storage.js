/* global browser */

const _VERSION = 1;

const defaultState = {
    // Non-settings
    token: null,
    localFollows: [],
    version: _VERSION,

    // global
    darkMode: false,
    tooltips: true,

    // notifications
    desktopNotifications: true,
    notificationVolume: 20,
    openTwitchPage: false,
    openPopout: false,
    openChat: false,

    minutesBetweenCheck: 1,
    languageCodes: '',
};

let storage = {};

export default {
    async load() {
        // load all saved settings
        const settings = await browser.storage.sync.get(null);

        console.log('settings', settings);

        storage = settings;
    },

    get(key) {
        return storage[key] !== undefined
            ? storage[key]
            : defaultState[key];
    },

    set(key, value) {
        // set in local storage if setting exists
        // no undefineds!!
        if (defaultState[key] !== undefined && value !== undefined) {
            storage[key] = value;

            browser.storage.sync.set({[key]: value});
        }
    }
}

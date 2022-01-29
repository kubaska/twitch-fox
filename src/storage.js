/* global browser */

const _VERSION = 1;

const defaultState = {
    // Non-settings
    version: _VERSION,
    token: null,
    mode: 'about',
    localFollows: [],
    favorites: [],
    favoritesMode: false,

    // global
    darkMode: false,
    tooltips: true,

    // notifications
    // text & audio for favorites, text for non-favorites
    notifications: 13,
    notificationClick: 0,
    notificationVolume: 20,

    minutesBetweenCheck: 1,
    languageCodes: '',
};

const flagSettings = ['notifications', 'notificationClick'];
const hugeSettings = ['localFollows', 'favorites'];

let storage = {};
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
        browser.storage.sync.set({ version: _VERSION });

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

    async switchEngine(engine) {
        const nextEngine = engine === 'sync' ? 'sync' : 'local';

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

    async resetSettings() {
        await browser.storage.local.clear();
        await browser.storage.sync.clear();
    }
}

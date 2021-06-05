/* global browser */

import axios from "axios";
import {chunk, differenceBy, findIndex, isEmpty, map, orderBy, remove, take} from "lodash";

// Variable declarations

let alarmOn = false;
let alarmTarget = null;
let authorizedUser; // An object containing the data of the authorized user
let userFollows = []; // Array with followed channels of authorized user
let userFollowIDs = []; // Array with IDs of followed channels
let userFollowedStreams = []; // Array with followed stream objects
let userFollowedLocalStreams = [
    { id: 28579002, name: 'cellbit' },
    { id: 71092938, name: 'xqcow' },
];
let userFollowedStreamsCache = new Set();
let lastURL = '';
let lastName = '';
let results;
let resultsIndex = 0;

const accept = 'application/vnd.twitchtv.v5+json';
const clientID = 'dzawctbciav48ou6hyv0sxbgflvfdpp';
const redirectURI = 'https://hunter5000.github.io/twitchfox.html';
const scope = 'user_follows_edit user_read';
const responseType = 'token';
const injection = 'browser.runtime.sendMessage' +
    '({content: location.href, type: "OAuth"});';
const audio = new Audio();
const defaults = {
    // Non-settings
    token: '',
    mode: 'streams',
    favorites: [],
    follows: [],
    lastVersion: '',
    notifiedStreams: [],
    favoritesMode: false,

    // Settings
    nonTwitchFollows: false,
    darkMode: false,
    tooltips: true,
    showNewUser: false,
    showWhatsNew: false,
    showLogos: true,
    openTwitchPage: false,
    openPopout: false,
    openChat: false,
    favoritesDesktopNotifications: true,
    favoritesAudioNotifications: true,
    nonfavoritesDesktopNotifications: true,
    nonfavoritesAudioNotifications: false,
    alarmInterval: 1,
    limitAlarm: false,
    alarmLength: 10,
    alarmVolume: 20,
    minutesBetweenCheck: 1,
    resultLimit: 12,
    languageCodes: '',
};
const storage = {};

// axios
const _axios = axios.create({
    baseURL: 'https://api.twitch.tv/kraken/',
    headers: {
        Accept: accept,
        'Client-ID': clientID
    }
});
_axios.interceptors.request.use(function (request) {
    const token = getStorage('token');

    if (token) {
        request.headers.Authorization = `OAuth ${token}`
    } else {
        // todo check if request belongs to auth routes
        // and fail immediately?
        // contains: follow, user
    }

    return request;
})

// Function declarations

const getAuthorizedUser = () => authorizedUser;
const getUserFollows = () => userFollows;
const getUserFollowIDs = () => userFollowIDs;
const getUserFollowedStreams = () => userFollowedStreams;
const getResults = () => results;
const getIndex = () => resultsIndex;

const defaultContent = () => [];

const defaultResults = () => [{
    content: defaultContent(),
    type: '',
    endpoint: '',
    opts: {},
    scroll: 0,
    total: 0,
    filter: '',
    cursor: '',
}];

const setResults = (newResults) => {
    results = newResults;
};

const setIndex = (newIndex) => {
    resultsIndex = newIndex;
};

const getStorage = key => storage[key];

const twitchAPI = (endpoint, theOpts, callback) => {
    /*
      "endpoint" expects a string describing the endpoint
      "opts" expects an object that may look like the example below:
      {
        channel: 121059319,
        game: 'Overwatch',
        language: 'en',
        stream_type: 'live',
        limit: '25',
        offset: '0'
      }
      "callback" expects the function to be called after the request is finished
    */
    // console.log(endpoint + JSON.stringify(opts));

    let method = 'GET';

    let url;
    const opts = theOpts;
    if (endpoint === 'Get User') {
        url = 'user';
    } else if (endpoint === 'Get Top Games') {
        url = 'games/top';
    } else if (endpoint === 'Get Live Streams') {
        url = 'streams';
    } else if (endpoint === 'Get Top Videos') {
        url = 'videos/top';
    } else if (endpoint === 'Get Top Clips') {
        url = 'clips/top';
    } else if (endpoint === 'Get Followed Streams') {
        url = 'streams/followed';
    } else if (endpoint === 'Get Followed Videos') {
        url = 'videos/followed';
    } else if (endpoint === 'Get Followed Clips') {
        url = 'clips/followed';
    } else if (endpoint === 'Get User Follows') {
        url = `users/${opts._id}/follows/channels`;
        delete opts._id;
    } else if (endpoint === 'Get Channel Videos') {
        url = `channels/${opts._id}/videos`;
        delete opts._id;
    } else if (endpoint === 'Search Channels') {
        url = 'search/channels';
    } else if (endpoint === 'Search Games') {
        url = 'search/games';
    } else if (endpoint === 'Search Streams') {
        url = 'search/streams';
    } else if (endpoint === 'Get Channel by ID') {
        url = `channels/${opts._id}`;
        delete opts._id;
    } else if (endpoint === 'Follow Channel') {
        url = `users/${authorizedUser._id}/follows/channels/${opts._id}`;
        delete opts._id;
        method = 'PUT';
    } else if (endpoint === 'Unfollow Channel') {
        url = `users/${authorizedUser._id}/follows/channels/${opts._id}`;
        delete opts._id;
        method = 'DELETE';
    }

    return _axios.request({ url, method, params: opts })
        .then(response => {
            console.log(endpoint, response);

            if (callback) {
                if (response.status === 200) {
                    callback(response.data);
                } else if (response.status === 204) callback(true);
                else callback();
            }
            else {
                return response.data;
            }
        });
};

const updateBadge = () => {
    const streamNo = userFollowedStreams.length;

    // set description (hover on badge)
    let streams = take(userFollowedStreams, 20).map(stream => {
        return browser.i18n.getMessage('streaming', [
            stream.channel.display_name, stream.channel.game
        ]);
    }).join('\n')

    if (streamNo > 20) {
        // todo i18n
        streams += `\n...and ${streamNo - 20} more`;
    }

    // set number of streams
    browser.browserAction.setBadgeText({
        text: streamNo ? streamNo.toString() : '',
    });

    browser.browserAction.setTitle({
        title: streams ? `Twitch Fox\n\n${streams}` : 'Twitch Fox',
    });
};

const Alarm = {
    initialize: () => {
        audio.src = 'assets/alarm.ogg';
        audio.volume = getStorage('alarmVolume') / 100;
    },
    play: () => {
        // if (! alarmOn) return;

        audio.pause();
        audio.load();
        audio.play()
            .catch(() => {});
    },
    end: () => {
        audio.pause();
    },
};

const playAlarm = (override) => {
    Alarm.play();
};

const setStorage = (key, value, callback) => {
    const obj = {};
    obj[key] = value;
    browser.storage.sync.set(obj).then(() => {
        Alarm.initialize();
        browser.runtime.sendMessage({
            content: 'options',
        });
        if (key === 'tooltips' || key === 'nonTwitchFollows') {
            browser.runtime.sendMessage({
                content: 'initialize',
            });
        }
    });
    storage[key] = value;
    if (callback) callback();
};

const parseToken = (url) => {
    const error = url.match(/[&]error=([^&]+)/);
    if (error) {
        // console.log('Error getting access token: ' + error[1]);
        return null;
    }
    return url.match(/[&#]access_token=([\w]+)/)[1];
};

const startFollowAlarm = () => {
    browser.alarms.create('getFollowedStreams', {
        delayInMinutes: 1,
        periodInMinutes: getStorage('minutesBetweenCheck'),
    });
    // onFollowAlarmTrigger();
};

const getFollow = (_id, callback) => {
    /*
      Get a NON-user's followed channel
    */
    twitchAPI('Get Channel by ID', {
        _id,
    }, (data) => {
        if (!data) {
            if (callback) callback();
            return;
        }
        const index = userFollowIDs.indexOf(String(_id));
        if (index > -1) {
            userFollows.splice(index, 1);
            userFollowIDs.splice(index, 1);
        }
        userFollowIDs.push(data._id);
        userFollows.push(data);
        if (callback) callback();
        else {
            browser.runtime.sendMessage({
                content: 'followed',
            });
        }
    });
};

const getFollows = () => {
    /*
      Get all of a NON-user's followed channels
      Note: This function is a *large* strain on the Twitch API
    */
    if (!getStorage('nonTwitchFollows')) return;
    userFollowIDs = [];
    userFollows = [];
    userFollowedStreams = [];
    const follows = getStorage('follows');
    if (!follows.length) return;
    let responded = 0;
    const callback = () => {
        responded += 1;
        if (responded === follows.length) {
            browser.runtime.sendMessage({
                content: 'followed',
            });
            startFollowAlarm();
        }
    };
    for (let i = 0; i < follows.length; i += 1) {
        getFollow(follows[i], callback);
    }
};

const desktopNotification = (stream) => {
    if (lastName) return;
    const title = browser.i18n.getMessage('streaming', [
        stream.channel.display_name, stream.channel.game,
    ]);
    const logo = stream.channel.logo != null
        ? stream.channel.logo
        : 'https://static-cdn.jtvnw.net/jtv_user_pictures/xarth/404_user_300x300.png';

    browser.notifications.create('follow-notification', {
        type: 'basic',
        iconUrl: logo,
        title,
        message: stream.channel.status,
    });

    lastURL = stream.channel.url;
    lastName = stream.channel.name;
};

const notify = (stream) => {
    // Regular followed channel
    if (getStorage('nonfavoritesDesktopNotifications')) {
        desktopNotification(stream);
    }
    if (getStorage('nonfavoritesAudioNotifications')) {
        Alarm.play();
    }
};

const initFollows = () => {
    if (getStorage('nonTwitchFollows')) getFollows();
    else {
        userFollowIDs = [];
        userFollows = [];
        userFollowedStreams = [];
        browser.runtime.sendMessage({
            content: 'followed',
        });
    }
};

const deauthorize = () => {
    /*
      Deletes the token from storage
    */
    setStorage('token', '');
    authorizedUser = null;
    initFollows();
    updateBadge();
    browser.runtime.sendMessage({
        content: 'followed',
    });
};

const getUser = () => {
    /*
      When called, attempts to use the Twitch API to get the data of the current
      authorized user
    */
    twitchAPI('Get User', {}, (data) => {
        if (!data) {
            // Perhaps we have made a mistake.
            deauthorize();
            return;
        }
        authorizedUser = data;
        browser.runtime.sendMessage({
            content: 'initialize',
        });
        // Now get the user's follows
        getUserFollowedStreams();
    });
};

// And a listener for receiving a message from the injected code

const authorize = () => {
    /*
      Sends the user to the authorization page
    */
    // The URL we must send the user to for authentication
    const url = `https://api.twitch.tv/kraken/oauth2/authorize?client_id=${
        clientID}&redirect_uri=${redirectURI}&response_type=${
        responseType}&scope=${scope}`;
    browser.tabs.create({
        url,
    });
};

const unfollowAll = () => {
    setStorage('follows', []);
    getFollows(() => {
        browser.runtime.sendMessage({
            content: 'followed',
        });
    });
    updateBadge();
};

const importFollows = (followsJSON) => {
    const follows = JSON.parse(followsJSON);
    if (!follows.map(follow => (Number.isNaN(follow) ? 'i' : '')).join('')) {
        // Only allow an array of numbers
        setStorage('follows', follows);
        initFollows();
    }
};

const cleanFollows = () => {
    const follows = getStorage('follows');
    let changed = false;
    for (let i = 0; i < follows.length; i += 1) {
        const follow = follows[i];
        if (Number.isNaN(follow)) {
            follows.splice(i, 1);
            changed = true;
            i -= 1;
        }
    }
    if (changed) setStorage('follows', follows, initFollows);
    // console.log("Follows cleaned");
};

const follow = (channel) => {
    if (getStorage('nonTwitchFollows')) {
        // Add to the followed list
        const follows = getStorage('follows');
        if (follows.indexOf(String(channel._id)) < 0) {
            follows.unshift(String(channel._id));
            setStorage('follows', follows);
            getFollow(String(channel._id), () => {
                startFollowAlarm();
                browser.runtime.sendMessage({
                    content: 'followed',
                });
            });
        }
    } else {
        // Only a provisional follow
        if (userFollowIDs.indexOf(String(channel._id)) < 0) {
            userFollowIDs.unshift(String(channel._id));
            userFollows.unshift(channel);
        }
        // Also have to check if there are any new followed streams
        startFollowAlarm();
        browser.runtime.sendMessage({
            content: 'followed',
        });
    }
};

const unfollow = (channel) => {
    if (getStorage('nonTwitchFollows')) {
        // Remove from the followed list
        const follows = getStorage('follows');
        const followsIndex = follows.indexOf(String(channel._id));
        if (followsIndex > -1) {
            follows.splice(followsIndex, 1);
            setStorage('follows', followsIndex);
        }
        // Also have to remove from userFollows(IDs)
        const userFollowsIndex = userFollowIDs.indexOf(String(channel._id));
        if (userFollowsIndex > -1) {
            userFollows.splice(userFollowsIndex, 1);
            userFollowIDs.splice(userFollowsIndex, 1);
        }
    } else {
        // Only a provisional unfollow
        const index = userFollowIDs.indexOf(String(channel._id));
        if (index > -1) {
            userFollows.splice(index, 1);
            userFollowIDs.splice(index, 1);
        }
    }
    // Also see if we have to remove a followed stream
    const index = userFollowedStreams.map(stream =>
        String(stream.channel._id)).indexOf(String(channel._id));
    if (index > -1) userFollowedStreams.splice(index, 1);
    updateBadge();
    browser.runtime.sendMessage({
        content: 'followed',
    });
};

const favorite = (_id) => {
    const favorites = getStorage('favorites');
    if (userFollowIDs.indexOf(_id) > -1 && favorites.indexOf(_id) < 0) {
        favorites.unshift(_id);
        setStorage('favorites', favorites);
    }
    updateBadge();
    browser.runtime.sendMessage({
        content: 'updatePage',
    });
};

const unfavorite = (_id) => {
    const favorites = getStorage('favorites');
    const index = favorites.indexOf(_id);
    if (index > -1) {
        favorites.splice(index, 1);
        setStorage('favorites', favorites);
    }
    updateBadge();
    browser.runtime.sendMessage({
        content: 'updatePage',
    });
};

const unfavoriteAll = () => {
    setStorage('favorites', []);
    updateBadge();
    browser.runtime.sendMessage({
        content: 'updatePage',
    });
};

const resetStorage = (settings, overwrite) => {
    // Either sets null values of storage to 'settings' or overwrites all values
    const keys = Object.keys(settings);

    browser.storage.sync.get(null).then((res) => {
        for (let i = 0; i < keys.length; i += 1) {
            const prop = keys[i];
            if (res[prop] === undefined || overwrite) {
                const val = settings[prop];
                setStorage(prop, val);
            } else {
                storage[prop] = res[prop];
            }
        }
        // All settings accounted for
        // browser.storage.sync.get('token').then((newRes) => {
        //     cleanFollows();
        //     if (newRes.token) getUser();
        //     else initFollows();
        // });
    });
};

/**
 * Fetch entire resource.
 *
 * @param endpoint    API Endpoint
 * @param responseKey Block in which Twitch returns all data we are interested in.
 *                    Should be moved to twitchAPI eventually.
 * @param limit       1-100
 * @return {Promise<[]|*[]>}
 */
const fetchPaginatedResource = async (endpoint, responseKey, limit = 100) => {
    let result = [];
    let keepGoing = true;

    while (keepGoing) {
        let response;

        try {
            response = await twitchAPI(
                endpoint,
                { limit, offset: result.length }
            );
        } catch (e) {
            // we are unauthorized or connection issue
            // just resolve with empty result
            return [];
        }

        result.push(...response[responseKey]);
        if (response[responseKey].length < limit) keepGoing = false;
    }

    return result;
}

/**
 * Fetch follows of logged in user.
 *
 * @return {Promise<*[]|*[]>}
 */
const fetchUserFollows = async () => {
    return await fetchPaginatedResource(
        'Get User Follows', 'follows', 100
    );
}

/**
 * Fetch currently online streams of logged in user.
 *
 * @return {Promise<*[]|*[]>}
 */
const fetchTwitchFollowedStreams = async () => {
    return await fetchPaginatedResource(
        'Get Followed Streams', 'streams', 100
    )
}

/**
 * Fetch locally followed online streams.
 *
 * @return {Promise<[]>}
 */
const fetchLocalFollowedStreams = async () => {
    const follows = chunk(userFollowedLocalStreams, 100);
    let result = [];

    for (const chunk of follows) {
        const res = await twitchAPI(
            'Get Live Streams',
            { limit: 100, channel: map(chunk, 'id').join(',') }
        )
        result.push(...res.streams);
    }

    return result;
}

/**
 * Fetch and update online streams.
 */
const fetchFollowedStreams = () => {
    Promise.all([
        fetchTwitchFollowedStreams(),
        fetchLocalFollowedStreams()
    ]).then(result => {
        const total = orderBy(result[0].concat(result[1]), 'viewers', 'desc');

        // compute difference with current followed
        const diff = differenceBy(total, userFollowedStreams, '_id');

        if (! isEmpty(diff)) {
            // play alarm
            Alarm.play();

            // and display a notification if we have new stream
            notify(diff[0]);
        }

        userFollowedStreams = total;

        // also update badge
        updateBadge();
    });
}

const openTwitchPage = (url) => {
    browser.tabs.create({
        url,
    });
};

const openPopout = (name) => {
    browser.windows.create({
        url: `http://player.twitch.tv/?channel=${name}`,
        height: 500,
        width: 850,
        type: 'popup',
    });
};

const openChat = (name) => {
    browser.windows.create({
        url: `http:/twitch.tv/${name}/chat?popout`,
        height: 600,
        width: 340,
        type: 'popup',
    });
};

// Assignments

results = defaultResults();

// Other statements

resetStorage(defaults);

browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.url && changeInfo.url.indexOf(redirectURI) !== -1) {
        // console.log("Executing script");
        browser.tabs.executeScript(tabId, {
            code: injection,
        });
    }
});

browser.runtime.onMessage.addListener((request, sender) => {
    if (request.type === 'OAuth') {
        browser.tabs.remove(sender.tab.id);
        setStorage('token', parseToken(request.content));
        getUser();
    }
});

browser.notifications.onClicked.addListener(() => {
    // browser.browserAction.openPopup(); //Will work in Firefox 57
    if (getStorage('openTwitchPage')) openTwitchPage(lastURL);
    if (getStorage('openPopout')) openPopout(lastName);
    if (getStorage('openChat')) openChat(lastName);
    lastName = '';
    lastURL = '';
});

browser.notifications.onClosed.addListener((notificationId, byUser) => {
    lastName = '';
    lastURL = '';
});

browser.alarms.onAlarm.addListener((alarmInfo) => {
    if (alarmInfo.name === 'getFollowedStreams') {
        fetchFollowedStreams();
    }
});

browser.browserAction.setBadgeBackgroundColor({
    color: '#6641A5',
});

// Exports

window.authorize = authorize;
window.defaultContent = defaultContent;
window.defaultResults = defaultResults;
window.favorite = favorite;
window.follow = follow;
window.getAuthorizedUser = getAuthorizedUser;
window.getIndex = getIndex;
window.getResults = getResults;
window.getStorage = getStorage;
window.getUserFollowIDs = getUserFollowIDs;
window.getUserFollows = getUserFollows;
window.getUserFollowedStreams = getUserFollowedStreams;
window.importFollows = importFollows;
window.initFollows = initFollows;
window.openChat = openChat;
window.openPopout = openPopout;
window.openTwitchPage = openTwitchPage;
window.playAlarm = playAlarm;
window.setIndex = setIndex;
window.setResults = setResults;
window.setStorage = setStorage;
window.twitchAPI = twitchAPI;
window.unfavorite = unfavorite;
window.unfavoriteAll = unfavoriteAll;
window.unfollow = unfollow;
window.unfollowAll = unfollowAll;

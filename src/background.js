/* global browser */

import axios from "axios";
import _storage from './storage';
import {chunk, differenceBy, filter, find, isEmpty, map, orderBy, pullAllBy, take} from "lodash";

// Variable declarations

let authorizedUser; // An object containing the data of the authorized user

let userFollows = []; // Array with followed channels of authorized user
let userFollowsCache = new Set();
let userFollowedStreams = []; // Array with followed stream objects

let lastNotificationStreamName = '';
let results;
let resultsIndex = 0;
let popupMode = 'streams'; // default mode is streams

const clientID = 'dzawctbciav48ou6hyv0sxbgflvfdpp';
const redirectURI = 'https://hunter5000.github.io/twitchfox.html';
const scope = 'user_follows_edit user_read';
const responseType = 'token';
const audio = new Audio();

const BROWSER_ALARM_TYPE = {
    FETCH_FOLLOWED_STREAMS: 'fetchFollowedStreams'
}

// axios
const _axios = axios.create({
    baseURL: 'https://api.twitch.tv/kraken/',
    headers: {
        Accept: 'application/vnd.twitchtv.v5+json',
        'Client-ID': clientID
    }
});
_axios.interceptors.request.use(function (request) {
    const token = _storage.get('token')

    if (token) {
        request.headers.Authorization = `OAuth ${token}`
    }

    return request;
})

// Function declarations

const getAuthorizedUser = () => authorizedUser;
const getUserFollows = () => userFollows;
const getUserFollowedStreams = () => userFollowedStreams;
const getResults = () => results;
const getIndex = () => resultsIndex;
const getMode = () => popupMode;

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

const setMode = newMode => { popupMode = newMode; }

const getStorage = key => _storage.get(key);
const setStorage = (key, value, callback) => {
    _storage.set(key, value);
    if (callback) callback();
};

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
        url = `users/${authorizedUser._id}/follows/channels`;
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

    if (! _storage.get('token') && (url.includes('follow') || url.includes('user'))) {
        // return immediately if we're making request
        // to endpoint that needs authorization
        if (callback) return callback([]);
        return [];
    }

    return _axios.request({ url, method, params: opts })
        .then(response => {
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
    },
    play: () => {
        const volumePercent = _storage.get('notificationVolume');

        if (! volumePercent) return;

        audio.pause();
        audio.load();
        audio.volume = volumePercent / 100;
        audio.play().catch(() => {});
    },
    end: () => {
        audio.pause();
    },
};

const playAlarm = () => {
    Alarm.play();
};

const desktopNotification = (stream) => {
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

    lastNotificationStreamName = stream.channel.name;
};

/**
 * Send the user to the authorization page
 */
const authorize = () => {
    const url = `https://api.twitch.tv/kraken/oauth2/authorize?client_id=${
        clientID}&redirect_uri=${redirectURI}&response_type=${
        responseType}&scope=${scope}`;
    browser.tabs.create({
        url,
    });
};

/**
 * Clean up after user
 */
const deauthorize = () => {
    _storage.set('token', null);
    authorizedUser = null;
    userFollows = [];
    userFollowedStreams = [];
    rebuildFollowCache();
};

const importFollows = (json) => {
    const parsed = JSON.parse(json);

    const follows = filter(parsed, follow => {
        const { id, name } = follow;

        if (id && name) return { id, name };
        else if (id)    return { id };
        else            return false;
    });

    setStorage('localFollows', follows);

    rebuildFollowCache();
}

const isFollowing = (name) => {
    return userFollowsCache.has(name);
}

const follow = async (id, name, forceLocal) => {
    if (authorizedUser && ! forceLocal) {
        const response = await twitchAPI('Follow Channel', { _id: id });

        const successful = id === response?.channel?._id;

        if (successful) {
            userFollows.push(...response);
            userFollowsCache.add(response.channel.name);
        }

        return successful;
    }
    else {
        // save in storage
        const allLocalFollows = _storage.get('localFollows');

        const exists = find(allLocalFollows, { id, name });

        if (exists) {
            console.log(`!!! Follow [${id}, ${name}] already exists, skipping`);
            return true;
        }

        allLocalFollows.push({ id, name });
        userFollowsCache.add(name);
        _storage.set('localFollows', allLocalFollows);

        return true;
    }
};

const unfollow = (id, name) => {
    const existsLocally = find(_storage.get('localFollows'), { id });

    if (existsLocally) {
        const allLocalFollows = _storage.get('localFollows');

        pullAllBy(allLocalFollows, [{ id }], 'id');

        _storage.set('localFollows', allLocalFollows);
    }
    else {
        if (! _storage.get('token')) {
            console.log('!!! Tried to unfollow online channel without being logged, skipping');
            return;
        }

        twitchAPI('Unfollow Channel', { _id: id });

        // remove from userFollows
        pullAllBy(userFollows, [{ id }], 'id');
    }

    if (name) {
        userFollowsCache.delete(name);
    }
}

const rebuildFollowCache = () => {
    const local = _storage.get('localFollows');
    local.forEach(follow => {
        userFollowsCache.add(follow.name);
    });

    userFollows.forEach(follow => {
        userFollowsCache.add(follow.channel.name);
    });
};

/**
 * Fetch current user from Twitch API
 *
 * @return {Promise<{}>}
 */
const fetchCurrentUser = async () => {
    const user = await twitchAPI('Get User', {});

    authorizedUser = user;

    return user;
}

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
    userFollows = await fetchPaginatedResource(
        'Get User Follows', 'follows', 100
    );
}

/**
 * Fetch currently online streams of logged in user.
 *
 * @return {Promise<*[]|*[]>}
 */
const fetchTwitchFollowedStreams = async () => {
    if (! authorizedUser) return Promise.resolve([]);

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
    const follows = chunk(_storage.get('localFollows'), 100);
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
            // display a notification if we have new stream
            if (_storage.get('desktopNotifications')) {
                desktopNotification(diff[0]);
            }

            // and play alarm
            Alarm.play();
        }

        userFollowedStreams = total;

        // also update badge
        updateBadge();
    });
}

/**
 * Initialize user and associated follows.
 * Called when auth state changes
 *
 * @return {Promise<void>}
 */
const initializeFollows = async () => {
    if (_storage.get('token')) {
        await fetchCurrentUser();
        await fetchUserFollows();
    }

    rebuildFollowCache();

    browser.runtime.sendMessage({ content: 'INITIALIZE' });

    browser.alarms.create(BROWSER_ALARM_TYPE.FETCH_FOLLOWED_STREAMS, {
        delayInMinutes: 0.02, // ~ 1-2 sec
        periodInMinutes: _storage.get('minutesBetweenCheck'),
    });
}

_storage.load().then(() => {
    Alarm.initialize();

    initializeFollows();
})

const openTwitchPage = (name) => {
    browser.tabs.create({
        url: 'https://twitch.tv/'+name,
    });
};

const openPopout = (name) => {
    browser.windows.create({
        url: `https://player.twitch.tv/?parent=localhost&channel=${name}`,
        height: 500,
        width: 850,
        type: 'popup',
    });
};

const openChat = (name) => {
    browser.windows.create({
        url: `https:/twitch.tv/${name}/chat?popout`,
        height: 600,
        width: 340,
        type: 'popup',
    });
};

// Assignments

results = defaultResults();

// Other statements

browser.tabs.onUpdated.addListener((tabId, changeInfo, tabInfo) => {
    if (changeInfo.url) {
        const match = changeInfo.url.match(/access_token=(\w+)/);
        const token = match ? match[1] : null;

        if (! token) {
            // here should be error handling if Twitch decides
            // to return some kind of error instead of token,
            // but with current state of extension i have no way of doing this
            // (and it never even happened to me anyway...)
            return;
        }

        _storage.set('token', token);
        browser.tabs.remove(tabId);

        initializeFollows();
    }
}, {
    // URL filter
    urls: [redirectURI+'*']
});

browser.notifications.onClicked.addListener(() => {
    if (! lastNotificationStreamName) return;

    if (getStorage('openTwitchPage')) openTwitchPage(lastNotificationStreamName);
    if (getStorage('openPopout')) openPopout(lastNotificationStreamName);
    if (getStorage('openChat')) openChat(lastNotificationStreamName);

    lastNotificationStreamName = '';
});

browser.notifications.onClosed.addListener(notificationId => {
    lastNotificationStreamName = '';
});

browser.alarms.onAlarm.addListener(alarmInfo => {
    if (alarmInfo.name === BROWSER_ALARM_TYPE.FETCH_FOLLOWED_STREAMS) {
        fetchFollowedStreams();
    }
});

browser.browserAction.setBadgeBackgroundColor({
    color: '#6641A5',
});

// Exports

window.authorize = authorize;
window.deauthorize = deauthorize;
window.defaultContent = defaultContent;
window.defaultResults = defaultResults;
window.follow = follow;
window.getAuthorizedUser = getAuthorizedUser;
window.getIndex = getIndex;
window.getMode = getMode;
window.getResults = getResults;
window.getStorage = getStorage;
window.getUserFollows = getUserFollows;
window.getUserFollowedStreams = getUserFollowedStreams;
window.importFollows = importFollows;
window.isFollowing = isFollowing;
window.playAlarm = playAlarm;
window.setIndex = setIndex;
window.setMode = setMode;
window.setResults = setResults;
window.setStorage = setStorage;
window.twitchAPI = twitchAPI;
window.unfollow = unfollow;
window._storage = () => _storage;

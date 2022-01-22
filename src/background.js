/* global browser */

import axios from "axios";
import _storage from './storage';
import {chunk, differenceBy, find, isEmpty, map, orderBy, pull, pullAllBy, take} from "lodash";
import {endpointList, endpoints, ENotificationFlag, tabs} from "./contants";
import utils from "./utils";

// Variable declarations

let authorizedUser; // An object containing the data of the authorized user

let userFollows = []; // Array with followed channels of authorized user
let userFollowsCache = new Set();
let userFavoritesCache = new Set();
let userFollowedStreams = []; // Array with followed stream objects

let lastNotificationStreamName = '';
let results;
let resultsIndex = 0;
let popupMode = tabs.STREAMS; // default mode is streams

const clientID = 'dzawctbciav48ou6hyv0sxbgflvfdpp';
const redirectURI = 'https://hunter5000.github.io/twitchfox.html';
const scope = 'user:read:email user:read:follows user:edit:follows';
const responseType = 'token';
const audio = new Audio();

// Enums
const BROWSER_ALARM_TYPE = {
    FETCH_FOLLOWED_STREAMS: 'fetchFollowedStreams'
}

// axios
const _axios = axios.create({
    baseURL: 'https://api.twitch.tv/helix/',
    headers: {
        'Client-ID': clientID
    }
});
_axios.interceptors.request.use(function (request) {
    const token = _storage.get('token');

    if (token) {
        request.headers.Authorization = `Bearer ${token}`;
    }

    // This prevents Twitch from returning results for user region.
    request.headers['Accept-Language'] = undefined;

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

const getResultsContentLength = () => {
    return results[resultsIndex].content.length;
}

const setMode = newMode => { popupMode = newMode; }

const getStorage = (key, flag) => _storage.get(key, flag);
const setStorage = (key, value, addFlag) => _storage.set(key, value, addFlag);

/**
 * Call Twitch API from popup
 *
 * @param endpoint  API endpoint
 * @param theOpts   Endpoint options
 * @param newIndex  Should results create new history entry?
 * @param reset     Resets current history entry
 * @return {Promise<T>}
 */
const callApi = async (endpoint, theOpts = {}, newIndex, reset) => {
    const opts = utils.cloneObj(theOpts);
    console.log('callApi', endpoint);

    if (newIndex) {
        resultsIndex += 1;
        // Remove elements after the new one
        results.splice(
            resultsIndex, results.length - resultsIndex,
            defaultResults()[0],
        );
    }

    if (reset) {
        results[resultsIndex].content = defaultContent();
        results[resultsIndex].scroll = 0;
        results[resultsIndex].cursor = '';
        delete opts.first;
        delete opts.language;
        delete opts.after;
    }

    // Old "limit" field
    if (! opts.first) {
        opts.first = 100;
    }

    // todo also check endpointList if language is allowed in next ver
    if (endpointList[endpoint].langCodesAllowed && getStorage('languageCodes')) {
        opts.language = getStorage('languageCodes');
    }

    // todo check
    // after = cursor
    if (results[resultsIndex].cursor) {
        opts.after = results[resultsIndex].cursor;
    }

    return twitchAPI(endpoint, opts)
        .then(response => {
            results[resultsIndex].content.push(...response.data);
            results[resultsIndex].type = endpointList[endpoint].contentType;

            results[resultsIndex].total = response.total;
            results[resultsIndex].endpoint = endpoint;
            results[resultsIndex].opts = opts;
            results[resultsIndex].cursor = response.pagination.cursor;

            return response;
        })
        .catch(error => {
            console.log(error);
            return error;
        });
};

/**
 * Calls Twitch API
 *
 * @param endpoint  Endpoint
 * @param theOpts   Request options
 * @return {Promise<AxiosResponse<any>>|*[]|*}
 */
const twitchAPI = (endpoint, theOpts) => {
    if (! endpointList[endpoint]) {
        console.log('Invalid endpoint: ', endpoint);
        return;
    }

    const opts = utils.cloneObj(theOpts);
    const { url, method } = endpointList[endpoint];

    // Check if url function takes arguments and feed it ID if it does
    // const _url = url.length
    //     ? url(opts.id)
    //     : url();
    //
    // delete opts.id;
    const _url = url();

    console.log('[REQ]', endpoint, opts);

    return _axios.request({ url: _url, method, params: opts })
        .then(response => {
            console.log('[RES]', endpoint, response);

            return response.data;
        });
};

const setResultsToFollowedStreams = () => {
    let results = defaultResults();
    results[0].content = getUserFollowedStreams();
    results[0].type = 'stream';
    setResults(results);
    setIndex(0);
}

const setResultsToFollowedChannels = () => {
    let results = defaultResults();
    results[0].content = getUserFollows();
    results[0].type = 'channel';
    setResults(results);
    setIndex(0);
}

const saveTabState = (searchQuery, scrollPos) => {
    results[resultsIndex].filter = searchQuery;
    results[resultsIndex].scroll = scrollPos;
}

const updateBadge = () => {
    const streamNo = userFollowedStreams.length;

    // set description (hover on badge)
    let streams = take(userFollowedStreams, 20).map(stream => {
        return `${stream.user_name} streaming ${stream.game_name}`;
    }).join('\n')

    if (streamNo > 20) {
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
    const title = `${stream.user_name} streaming ${stream.game_name}`;
    const channel = find(userFollows, { id: stream.user_id });
    const logo = channel?.profile_image_url ?? '/assets/twitch-fox.svg';

    browser.notifications.create('follow-notification', {
        type: 'basic',
        iconUrl: logo,
        title,
        message: stream.title,
    });

    lastNotificationStreamName = stream.user_name;
};

/**
 * Send the user to the authorization page
 */
const authorize = () => {
    const url = `https://id.twitch.tv/oauth2/authorize?client_id=${
        clientID}&redirect_uri=${redirectURI}&response_type=${
        responseType}&scope=${scope}`;
    browser.tabs.create({ url });
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

/**
 * Import follows using 4.3.0 schema
 *
 * @param json
 */
const importFollowsLegacy = (json) => {
    const parsed = JSON.parse(json);
    const currentTime = utils.getISODateStringNoMs();

    const follows = parsed.map(follow => {
        const id = parseInt(follow);

        if (id) return { id, fd: currentTime };
        else    return false;
    }).filter(value => value);

    setStorage('localFollows', follows);
    rebuildFollowCache();
}

/**
 * Import follows using current schema
 *
 * @param json
 */
const importFollows = (json) => {
    const parsed = JSON.parse(json);
    const currentTime = utils.getISODateStringNoMs();

    const follows = parsed.map(follow => {
        const { id, fd } = follow;

        if (id && fd) return { id, fd };
        else if (id)  return { id, fd: currentTime };
        else          return false;
    }).filter(value => value);

    setStorage('localFollows', follows);

    rebuildFollowCache();
}

/**
 * Check if channel with specified ID is followed by user.
 *
 * @param id
 * @return {boolean}
 */
const isFollowing = (id) => {
    return userFollowsCache.has(id);
}

/**
 * Follow Twitch channel
 *
 * @param id
 * @param name
 * @param forceLocal
 * @return {Promise<boolean>}
 */
const follow = async (id, name, forceLocal) => {
    if (authorizedUser && ! forceLocal) {
        const response = await twitchAPI('Follow Channel', { _id: id });

        const successful = id === response?.channel?._id;

        if (successful) {
            userFollows.push(...response);
            userFollowsCache.add(response.channel._id);
        }

        return successful;
    }
    else {
        // save in storage
        const allLocalFollows = _storage.get('localFollows');

        const exists = find(allLocalFollows, { id });

        if (exists) {
            console.log(`!!! Follow [${id}, ${name}] already exists, skipping`);
            return true;
        }

        allLocalFollows.push({ id, name });
        userFollowsCache.add(id);
        _storage.set('localFollows', allLocalFollows);

        return true;
    }
};

/**
 * Unfollows Twitch channel
 *
 * @param id
 */
const unfollow = (id) => {
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

    // todo add unfavorite
    if (id) {
        userFollowsCache.delete(id);
    }
}

const isFavorite = (id) => userFavoritesCache.has(id);

const favorite = (id) => {
    id = parseInt(id);

    // Reject non-follows
    if (! isFollowing(id)) return false;

    const favorites = _storage.get('favorites');

    // Reject already existing favorite
    if (find(favorites, { id })) return false;

    favorites.push(id);

    setStorage('favorites', favorites);
    userFavoritesCache.add(id);
}

const unfavorite = (id) => {
    id = parseInt(id);

    const favorites = _storage.get('favorites');

    pull(favorites, id);

    _storage.set('favorites', favorites);
    userFavoritesCache.delete(id);
}

const rebuildFollowCache = () => {
    const local = _storage.get('localFollows');
    local.forEach(follow => {
        userFollowsCache.add(follow.id);
    });

    userFollows.forEach(follow => {
        userFollowsCache.add(parseInt(follow.id));
    });
};
const rebuildFavoriteCache = () => {
    const favorites = _storage.get('favorites');
    favorites.forEach(favorite => {
        userFavoritesCache.add(favorite);
    })
}

/**
 * Fetch current user from Twitch API
 *
 * @return {Promise<{}>}
 */
const fetchCurrentUser = async () => {
    const user = await twitchAPI(endpoints.GET_USERS, {});
    // todo make this retryable

    if (user?.data && user.data[0]) {
        authorizedUser = user.data[0];
    } else {
        // Token expired or API is down
        authorizedUser = null;
    }

    return authorizedUser;
}

/**
 * Fetch entire resource.
 * Endpoint must have data and pagination keys.
 *
 * @param endpoint       API Endpoint
 * @param requestOptions Additional request options
 * @param limit          1-100
 * @return {Promise<[]|*[]>}
 */
const fetchPaginatedResource = async (endpoint, requestOptions, limit = 100) => {
    let result = [];
    let keepGoing = true;
    let pagination = null;

    while (keepGoing) {
        let response;

        try {
            response = await twitchAPI(
                endpoint,
                { first: limit, after: pagination, ...requestOptions }
            );
        } catch (e) {
            // we are unauthorized or connection issue
            // just resolve with empty result
            // todo make this retryable
            return [];
        }

        result.push(...response.data);
        if (response.data.length < limit) keepGoing = false;
        pagination = response?.pagination?.cursor;
    }

    return result;
}

/**
 * Fetch follows of logged in user.
 *
 * @return {Promise<*[]|*[]>}
 */
const fetchUserFollows = async () => {
    // Request follows of logged in user.
    const twitchFollows = await fetchPaginatedResource(
        endpoints.GET_USER_FOLLOWS, { from_id: authorizedUser.id }, 100
    );

    // Combine local & online follows with same data structure
    const follows = [
        ...twitchFollows.map(follow => {
            return { id: parseInt(follow.to_id), fd: follow.followed_at }
        }),
        ...getStorage('localFollows')
    ];

    // Create associative object for easy follow date lookup
    let followDates = {};
    follows.forEach(follow => { followDates[follow.id] = follow.fd ?? '2020-01-01T20:00:00Z' });

    let finalAccounts = [];

    await Promise.allSettled(
        chunk(follows, 100).map(followChunk => {
            return twitchAPI(endpoints.GET_USERS, { id: followChunk.map(f => f.id) });
        })
    )
        .then(allAccounts => {
            allAccounts.forEach(accounts => {
                if (accounts.status === 'fulfilled') {
                    finalAccounts.push(...accounts.value.data);
                } else {
                    // rejected
                    console.log('Fetching user follows failed', accounts.reason);
                }
            })
        });

    userFollows = orderBy(finalAccounts, [(_) => new Date(followDates[_.id])], ['desc']);
}

/**
 * Fetch currently online streams of logged in user.
 *
 * @return {Promise<*[]|*[]>}
 */
const fetchTwitchFollowedStreams = async () => {
    if (! authorizedUser) return Promise.resolve([]);

    return await fetchPaginatedResource(
        endpoints.GET_FOLLOWED_STREAMS, { user_id: authorizedUser.id }, 100
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
            endpoints.GET_STREAMS,
            { first: 100, user_id: map(chunk, 'id') }
        )
        result.push(...res.data);
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
        const total = orderBy(result[0].concat(result[1]), 'viewer_count', 'desc');

        // compute difference with current followed
        const diff = differenceBy(total, userFollowedStreams, 'id');

        if (! isEmpty(diff)) {
            // prefer favorite streams
            const favoritesFirst = orderBy(diff, (stream) => isFavorite(parseInt(stream.user_id)), 'desc');

            const anyFavorites = favoritesFirst.some(stream => isFavorite(parseInt(stream.user_id)));

            // display a notification if we have new stream
            if (anyFavorites) {
                if (_storage.get('notifications', ENotificationFlag.favoritesTextNotification)) {
                    desktopNotification(favoritesFirst[0]);
                }
                if (_storage.get('notifications', ENotificationFlag.favoritesAudioNotification)) {
                    Alarm.play();
                }
            } else {
                if (_storage.get('notifications', ENotificationFlag.textNotification)) {
                    desktopNotification(favoritesFirst[0]);
                }
                if (_storage.get('notifications', ENotificationFlag.audioNotification)) {
                    Alarm.play();
                }
            }
        }

        userFollowedStreams = total;

        // also update badge
        updateBadge();
    }).catch(err => {
        console.log('Cannot fetch followed streams', err);
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
    rebuildFavoriteCache();

    browser.runtime.sendMessage({ content: 'INITIALIZE' });

    browser.alarms.create(BROWSER_ALARM_TYPE.FETCH_FOLLOWED_STREAMS, {
        delayInMinutes: 0.02, // ~ 1-2 sec
        periodInMinutes: _storage.get('minutesBetweenCheck'),
    });
}

_storage.load().then(() => {
    Alarm.initialize();

    initializeFollows();
});

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

    if (getStorage('openTwitchPage')) utils.openStream(lastNotificationStreamName);
    if (getStorage('openPopout')) utils.openStreamPopout(lastNotificationStreamName);
    if (getStorage('openChat')) utils.openChatPopout(lastNotificationStreamName);

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

browser.contextMenus.create({
    contexts: ['browser_action'],
    onclick: () => { browser.tabs.create({ url: 'html/popup.html' })},
    title: 'Open Extended View'
})

// Exports

window.authorize = authorize;
window.callApi = callApi;
window.deauthorize = deauthorize;
window.defaultContent = defaultContent;
window.defaultResults = defaultResults;
window.favorite = favorite;
window.follow = follow;
window.getAuthorizedUser = getAuthorizedUser;
window.getIndex = getIndex;
window.getMode = getMode;
window.getResults = getResults;
window.getResultsContentLength = getResultsContentLength;
window.getStorage = getStorage;
window.getUserFollows = getUserFollows;
window.getUserFollowedStreams = getUserFollowedStreams;
window.importFollows = importFollows;
window.importFollowsLegacy = importFollowsLegacy;
window.isFavorite = isFavorite;
window.isFollowing = isFollowing;
window.playAlarm = playAlarm;
window.saveTabState = saveTabState;
window.setIndex = setIndex;
window.setMode = setMode;
window.setResults = setResults;
window.setResultsToFollowedChannels = setResultsToFollowedChannels;
window.setResultsToFollowedStreams = setResultsToFollowedStreams;
window.setStorage = setStorage;
window.unfavorite = unfavorite;
window.unfollow = unfollow;
window._storage = () => _storage;

/* global browser */

import axios from "axios";
import _storage from './storage';
import {chunk, differenceBy, find, isEmpty, map, orderBy, pull, pullAllBy, take} from "lodash";
import {endpointList, endpoints, ENotificationClickFlag, ENotificationFlag, ERuntimeMessage, tabs} from "./constants";
import utils from "./utils";

// Variable declarations

let authorizedUser; // An object containing the data of the authorized user

let userFollows = []; // Array with followed channels of authorized user
let userFollowsCache = new Set();
let followedGamesCache = new Set();
let userFavoritesCache = new Set();
let userFollowedStreams = []; // Array with followed stream objects
let userFollowedGames = [];
let followedVideos = []; // Cached results of followed videos

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

const resetResults = () => {
    resultsIndex = 0;
    results = defaultResults();
}

const getResultsContentLength = () => results[resultsIndex].content.length;

const setMode = newMode => {
    popupMode = newMode;
    setStorage('mode', newMode);
}

/**
 * Get item from persistent storage.
 *
 * @param key
 * @param flag
 * @return {string|boolean|array|object}
 */
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

    // first = limit
    if (! opts.first) {
        opts.first = 100;
    }

    if (endpointList[endpoint].langCodesAllowed && getStorage('languageCodes')) {
        opts.language = getStorage('languageCodes').toString().split(',');
    }

    // after = cursor
    if (results[resultsIndex].cursor) {
        opts.after = results[resultsIndex].cursor;
    }

    return twitchAPI(endpoint, opts)
        .then(response => {
            // deduplicate current results against new results
            const ids = new Set(results[resultsIndex].content.map(content => content.id));
            results[resultsIndex].content.push(...response.data.filter(content => !ids.has(content.id)));

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
    const { url } = endpointList[endpoint];

    // console.log('[REQ]', endpoint, opts);

    return _axios.request({ url, method: 'GET', params: opts })
        .then(response => {
            // console.log('[RES]', endpoint, response);
            return response.data;
        });
};

const refreshResults = async () => {
    await callApi(results[resultsIndex].endpoint, results[resultsIndex].opts, false, true);
}

const setResultsToFollowedTab = (tab) => {
    let newResults;

    // Check if currently saved results belong to newly switched tab.
    // If it does, do not create new results, but use existing instead.
    // This preserves users search query and scroll position.
    if (results[0].followedTab && results[0].followedTab === tab) {
        newResults = results;
    } else {
        newResults = defaultResults();
    }

    switch (tab) {
        case tabs.FOLLOWED_GAMES:
            newResults[0].content = userFollowedGames;
            newResults[0].type = 'game';
            break;
        case tabs.FOLLOWED_STREAMS:
            newResults[0].content = getUserFollowedStreams();
            newResults[0].type = 'stream';
            break;
        case tabs.FOLLOWED_VIDEOS:
            newResults[0].content = followedVideos;
            newResults[0].type = 'video';
            break;
        case tabs.FOLLOWED_CHANNELS:
            newResults[0].content = getUserFollows();
            newResults[0].type = 'channel';
            break;
    }
    newResults[0].followedTab = tab;
    setResults(newResults);
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
    const title = `${stream.user_name || stream.user_login} streaming ${stream.game_name}`;
    const channel = find(userFollows, { id: stream.user_id });
    const logo = channel?.profile_image_url ?? '/assets/twitch-fox.svg';

    browser.notifications.create('follow-notification', {
        type: 'basic',
        iconUrl: logo,
        title,
        message: stream.title,
    });

    lastNotificationStreamName = stream.user_login;
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
    browser.alarms.clear(BROWSER_ALARM_TYPE.FETCH_FOLLOWED_STREAMS);
    authorizedUser = null;
    userFollows = [];
    userFollowedStreams = [];
    rebuildFollowCache();
    updateBadge();
};

/**
 * Import follows using 4.2.3 schema
 *
 * @param json
 */
const importFollowsLegacy = (json) => {
    const parsed = JSON.parse(json);
    let date = (new Date()).getTime() - (parsed.length * 1000);

    const follows = parsed.map(follow => {
        const id = parseInt(follow);

        if (id) return { id, fd: utils.getISODateStringNoMs(date += 1000) };
        else    return false;
    }).filter(value => value);

    const finalFollows = orderBy(follows, [(_) => new Date(_.fd)], ['desc']);

    return setStorage('localFollows', finalFollows)
        .then(() => {
            rebuildFollowCache();
            fetchUserFollows();
        });
}

/**
 * Import follows using current schema
 *
 * @param json
 */
const importFollows = (json) => {
    const parsed = JSON.parse(json);
    let date = (new Date()).getTime() - (parsed.length * 1000);

    const follows = parsed.map(follow => {
        const { id, fd } = follow;

        if (id && fd) return { id, fd };
        else if (id)  return { id, fd: utils.getISODateStringNoMs(date += 1000) };
        else          return false;
    }).filter(value => value);

    const finalFollows = orderBy(follows, [(_) => new Date(_.fd)], ['desc']);

    return setStorage('localFollows', finalFollows)
        .then(() => {
            rebuildFollowCache();
            fetchUserFollows();
        });
}

/**
 * Check if channel with specified ID is followed by user.
 *
 * @param id {int}
 * @return {boolean}
 */
const isFollowing = (id) => userFollowsCache.has(id);
/**
 * Check if game is followed by user.
 *
 * @param id {int}
 * @returns {boolean}
 */
const isFollowingGame = (id) => followedGamesCache.has(id);

const baseFollow = async (storageKey, id) => {
    const allFollows = _storage.get(storageKey);

    const exists = find(allFollows, { id });

    if (exists) {
        console.log(`! Follow [${id}] on [${storageKey}] already exists, skipping`);
        return true;
    }

    allFollows.unshift({ id, fd: utils.getISODateStringNoMs() });
    await setStorage(storageKey, allFollows);
}

/**
 * Follow Twitch channel
 *
 * @param id
 * @return {Promise<boolean>}
 */
const follow = async (id) => {
    await baseFollow('localFollows', id);
    userFollowsCache.add(id);

    // Add channel to userFollows
    twitchAPI(endpoints.GET_USERS, { id })
        .then(response => {
            if (response?.data && response.data[0]) {
                userFollows.unshift(response.data[0]);
            }
        })
        .catch(err => { console.log(err); });

    return true;
};

const followGame = async (id) => {
    await baseFollow('followedGames', id);
    followedGamesCache.add(id);

    // Add game to userFollowedGames
    twitchAPI(endpoints.GET_GAMES, { id })
        .then(response => {
            if (response?.data && response.data[0]) {
                userFollowedGames.unshift(response.data[0]);
            }
        })
        .catch(err => { console.log(err); });

    return true;
}

/**
 * Base unfollow implementation
 *
 * @param storageKey {string}
 * @param id {int}
 * @returns {Promise<boolean>|Promise<void>}
 */
const baseUnfollow = (storageKey, id) => {
    const follows = _storage.get(storageKey);

    // Skip unfollowing if follow is missing in storage.
    // This may happen if user tries to unfollow channel followed through their Twitch account.
    if (! find(follows, { id })) {
        return Promise.resolve();
    }

    pullAllBy(follows, [{ id }], 'id');

    return setStorage(storageKey, follows);
}

/**
 * Unfollows Twitch channel
 *
 * @param id
 * @returns {Promise<T>}
 */
const unfollow = (id) => {
    return baseUnfollow('localFollows', id)
        .then(() => {
            pullAllBy(userFollows, [{ id: id.toString() }], 'id');
            userFollowsCache.delete(id);
            unfavorite(id);
        })
}

const unfollowGame = (id) => {
    return baseUnfollow('followedGames', id)
        .then(() => {
            pullAllBy(userFollowedGames, [{ id: id.toString() }], 'id');
            followedGamesCache.delete(id);
        });
}

const isFavorite = (id) => userFavoritesCache.has(id);

const favorite = (id) => {
    id = parseInt(id);

    // Reject non-follows
    if (! isFollowing(id)) return false;

    const favorites = _storage.get('favorites');

    // Reject already existing favorite
    if (find(favorites, { id })) return false;

    favorites.unshift(id);

    return setStorage('favorites', favorites)
        .then(() => {
            userFavoritesCache.add(id);
        });
}

const unfavorite = (id) => {
    id = parseInt(id);

    const favorites = _storage.get('favorites');

    pull(favorites, id);

    return setStorage('favorites', favorites)
        .then(() => {
            userFavoritesCache.delete(id);
        });
}

const rebuildFollowCache = () => {
    userFollowsCache = new Set([
        ..._storage.get('localFollows').map(follow => follow.id),
        ...userFollows.map(follow => parseInt(follow.id))
    ]);

    followedGamesCache = new Set(_storage.get('followedGames').map(follow => follow.id));
};
const rebuildFavoriteCache = () => {
    userFavoritesCache = new Set(_storage.get('favorites'));
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
 * Response root must have data and pagination keys.
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
 * Fetch resource for each value in values array.
 * Note: this function will rapidly exhaust rate limits. Just how Twitch wanted it to be.
 *
 * @param endpoint    {endpointList}
 * @param resourceKey {string}
 * @param values      {array}
 * @returns {Promise<*[]>}
 */
const fetchArrayOfSingularResource = async (endpoint, resourceKey, values) => {
    if (values.length === 0) {
        return [];
    }

    let resource = [];

    await Promise.allSettled(
        values.map(value => {
            return twitchAPI(endpoint, { [resourceKey]: value });
        })
    ).then(allResults => {
        allResults.forEach(results => {
            if (results.status === 'fulfilled') {
                resource.push(...results.value.data);
            } else {
                // rejected
                console.log('Failed to fetch singular resource', endpoint, results.reason);
            }
        });
    });

    return resource;
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

    const finalAccounts = await fetchArrayOfSingularResource(
        endpoints.GET_USERS,
        'id',
        chunk(follows, 100).map(chunk => chunk.map(f => f.id))
    );

    userFollows = orderBy(finalAccounts, [(_) => new Date(followDates[_.id])], ['desc']);
}

const fetchFollowedGames = async () => {
    const allGames = _storage.get('followedGames');

    // Create associative object for easy follow date lookup
    let followDates = {};
    allGames.forEach(follow => { followDates[follow.id] = follow.fd ?? '2020-01-01T20:00:00Z' });

    const onlineGames = await fetchArrayOfSingularResource(
        endpoints.GET_GAMES,
        'id',
        chunk(allGames.map(game => game.id), 100)
    );

    userFollowedGames = orderBy(onlineGames, [(_) => new Date(followDates[_.id])], ['desc']);
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
 * Fetch and cache videos from followed/favorite channels.
 *
 * @return {Promise<void>}
 */
const fetchFollowedVideos = async () => {
    const videos = await fetchArrayOfSingularResource(
        endpoints.GET_VIDEOS,
        'user_id',
        _storage.get('fetchAllFollowedVideos')
            ? [...userFollowsCache]
            : _storage.get('favorites')
    );

    followedVideos = orderBy(
        videos.slice(0, 500), // hard cap of 500 results
        [video => new Date(video.created_at)],
        ['desc']
    );
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
        await Promise.allSettled([fetchUserFollows(), fetchFollowedGames()])
    }

    rebuildFollowCache();
    rebuildFavoriteCache();

    browser.runtime.sendMessage({ content: ERuntimeMessage.INITIALIZE });

    browser.alarms.create(BROWSER_ALARM_TYPE.FETCH_FOLLOWED_STREAMS, {
        delayInMinutes: 0.02, // ~ 1-2 sec
        periodInMinutes: _storage.get('minutesBetweenCheck'),
    });
}

_storage.load().then(() => {
    popupMode = getStorage('mode');
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

        setStorage('token', token)
            .then(() => {
                browser.tabs.remove(tabId);
                initializeFollows();
            });
    }
}, {
    // URL filter
    urls: [redirectURI+'*']
});

browser.notifications.onClicked.addListener(() => {
    if (! lastNotificationStreamName) return;

    if (getStorage('notificationClick', ENotificationClickFlag.openStreamNewTab))
        utils.openStream(lastNotificationStreamName);
    if (getStorage('notificationClick', ENotificationClickFlag.openStreamPopout))
        utils.openStreamPopout(lastNotificationStreamName);
    if (getStorage('notificationClick', ENotificationClickFlag.openChatPopout))
        utils.openChatPopout(lastNotificationStreamName);

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
});

// Exports
window.authorize = authorize;
window.callApi = callApi;
window.deauthorize = deauthorize;
window.favorite = favorite;
window.fetchFollowedVideos = fetchFollowedVideos;
window.follow = follow;
window.followGame = followGame;
window.getAuthorizedUser = getAuthorizedUser;
window.getIndex = getIndex;
window.getMode = getMode;
window.getResults = getResults;
window.getResultsContentLength = getResultsContentLength;
window.getStorage = getStorage;
window.importFollows = importFollows;
window.importFollowsLegacy = importFollowsLegacy;
window.isFavorite = isFavorite;
window.isFollowing = isFollowing;
window.isFollowingGame = isFollowingGame;
window.playAlarm = playAlarm;
window.refreshResults = refreshResults;
window.resetResults = resetResults;
window.saveTabState = saveTabState;
window.setIndex = setIndex;
window.setMode = setMode;
window.setResultsToFollowedTab = setResultsToFollowedTab;
window.setStorage = setStorage;
window.unfavorite = unfavorite;
window.unfollow = unfollow;
window.unfollowGame = unfollowGame;
window._storage = () => _storage;

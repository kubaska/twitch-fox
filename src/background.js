/* global browser */

import axios from "axios";
import _storage from './storage';
import {chunk, differenceBy, filter, find, isEmpty, map, orderBy, pullAllBy, take} from "lodash";

// Variable declarations

let authorizedUser; // An object containing the data of the authorized user

let userFollows = []; // Array with followed channels of authorized user
let userFollowIDs = []; // todo remove

let userFollowsCache = new Set();

let userFollowedStreams = []; // Array with followed stream objects
let lastURL = '';
let lastName = '';
let results;
let resultsIndex = 0;

const accept = 'application/vnd.twitchtv.v5+json';
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
        Accept: accept,
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
    },
    play: () => {
        // if (! alarmOn) return;

        audio.pause();
        audio.load();
        audio.volume = _storage.get('notificationVolume') / 100;
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
            // startFollowAlarm();
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
    if (_storage.get('desktopNotifications')) {
        desktopNotification(stream);
    }
    if (_storage.get('audioNotifications')) {
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
        console.log('follow online', response);

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

        console.log('follow local');

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
        console.log('unfollow local');

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
        console.log('unfollow online');
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

    console.log('followCache', userFollowsCache);
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

    browser.alarms.create(BROWSER_ALARM_TYPE.FETCH_FOLLOWED_STREAMS, {
        delayInMinutes: 0.02, // ~ 1-2 sec
        periodInMinutes: _storage.get('minutesBetweenCheck'),
    });
}

_storage.load().then(() => {
    Alarm.initialize();

    initializeFollows();
})

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

browser.tabs.onUpdated.addListener((tabId, changeInfo, tabInfo) => {
    if (changeInfo.url) {
        const match = changeInfo.url.match(/access_token=(\w+)/);
        const token = match ? match[1] : null;

        console.log('parsing token', changeInfo.url, token);

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
window.getResults = getResults;
window.getStorage = getStorage;
window.getUserFollowIDs = getUserFollowIDs;
window.getUserFollows = getUserFollows;
window.getUserFollowedStreams = getUserFollowedStreams;
window.importFollows = importFollows;
window.initFollows = initFollows;
window.isFollowing = isFollowing;
window.openChat = openChat;
window.openPopout = openPopout;
window.openTwitchPage = openTwitchPage;
window.playAlarm = playAlarm;
window.setIndex = setIndex;
window.setResults = setResults;
window.setStorage = setStorage;
window.twitchAPI = twitchAPI;
window.unfollow = unfollow;
window._storage = () => _storage;

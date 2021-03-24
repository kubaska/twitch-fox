// Variable declarations

let alarmInterval;
let alarmOn = false;
let alarmPeriod = 1000;
let alarmLength = 10000;
let alarmOngoing = 0;
let alarmLimit = false;
let alarmTarget = null;
let authorizedUser; // An object containing the data of the authorized user
let userFollows = []; // Array with followed channels of authorized user
let userFollowIDs = []; // Array with IDs of followed channels
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

// Function declarations

let onFollowAlarmTrigger;

const getAuthorizedUser = () => authorizedUser;
const getUserFollows = () => userFollows;
const getUserFollowIDs = () => userFollowIDs;
const getUserFollowedStreams = () => userFollowedStreams;
const getResults = () => results;
const getIndex = () => resultsIndex;
const getAlarmStatus = () => alarmOn;

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
    const init = {
        method: 'GET',
        headers: {
            Accept: accept,
            'Client-ID': clientID,
            Authorization: `OAuth ${getStorage('token')}`,
        },
    };
    let url;
    const opts = theOpts;
    if (endpoint === 'Get User') {
        url = 'https://api.twitch.tv/kraken/user?';
    } else if (endpoint === 'Get Top Games') {
        url = 'https://api.twitch.tv/kraken/games/top?';
    } else if (endpoint === 'Get Live Streams') {
        url = 'https://api.twitch.tv/kraken/streams/?';
    } else if (endpoint === 'Get Top Videos') {
        url = 'https://api.twitch.tv/kraken/videos/top?';
    } else if (endpoint === 'Get Top Clips') {
        url = 'https://api.twitch.tv/kraken/clips/top?';
    } else if (endpoint === 'Get Followed Streams') {
        url = 'https://api.twitch.tv/kraken/streams/followed?';
    } else if (endpoint === 'Get Followed Videos') {
        url = 'https://api.twitch.tv/kraken/videos/followed?';
    } else if (endpoint === 'Get Followed Clips') {
        url = 'https://api.twitch.tv/kraken/clips/followed?';
    } else if (endpoint === 'Get User Follows') {
        url = `https://api.twitch.tv/kraken/users/${opts._id}/follows/channels?`;
        delete opts._id;
    } else if (endpoint === 'Get Channel Videos') {
        url = `https://api.twitch.tv/kraken/channels/${opts._id}/videos?`;
        delete opts._id;
    } else if (endpoint === 'Search Channels') {
        url = 'https://api.twitch.tv/kraken/search/channels?';
    } else if (endpoint === 'Search Games') {
        url = 'https://api.twitch.tv/kraken/search/games?';
    } else if (endpoint === 'Search Streams') {
        url = 'https://api.twitch.tv/kraken/search/streams?';
    } else if (endpoint === 'Get Channel by ID') {
        url = `https://api.twitch.tv/kraken/channels/${opts._id}?`;
        delete opts._id;
    } else if (endpoint === 'Follow Channel') {
        url = `https://api.twitch.tv/kraken/users/${
            authorizedUser._id}/follows/channels/${opts._id}?`;
        delete opts._id;
        init.method = 'PUT';
    } else if (endpoint === 'Unfollow Channel') {
        url = `https://api.twitch.tv/kraken/users/${authorizedUser._id
        }/follows/channels/${opts._id}?`;
        delete opts._id;
        init.method = 'DELETE';
    }
    const params =
        Object.entries(opts).map(([key, val]) => `${key}=${val}`).join('&');
    url += params;
    fetch(url, init).then((response) => {
        if (response.status === 200) {
            response.json().then((data) => {
                callback(data);
            });
        } else if (response.status === 204) callback(true);
        else callback();
    });
};

const updateBadge = () => {
    const text = getStorage('favoritesMode') ?
        userFollowedStreams.map(stream => ((
            getStorage('favorites').indexOf(String(stream.channel._id)) > -1) ?
            'i' : '')).join('').length : userFollowedStreams.length;
    let title;
    // If the alarm is going, show the stream that triggered the alarm
    if (alarmTarget) {
        title = `${browser.i18n.getMessage('justStartedStreaming', [
            alarmTarget.channel.display_name, alarmTarget.channel.game,
        ])}\n${browser.i18n.getMessage('clickToEndAlarm')}`;
    } else {
        // Otherwise, show all followed stuff
        title = userFollowedStreams.map(stream =>
            (getStorage('favorites').indexOf(String(stream.channel._id)) > -1 ?
                `\n${browser.i18n.getMessage('streaming', [stream.channel.display_name,
                    stream.channel.game])}` : '')).join('');
        // If it's favorites mode, only show favorited streams
        if (getStorage('favoritesMode')) {
            title += `\n${browser.i18n.getMessage(
                'nonFavoritesLive',
                userFollowedStreams.length - text,
            )}`;
        } else {
            title += userFollowedStreams.map(stream =>
                (getStorage('favorites').indexOf(String(stream.channel._id)) <
                0 ? `\n${browser.i18n.getMessage('streaming', [
                    stream.channel.display_name, stream.channel.game,
                ])}` : '')).join('');
        }
    }
    title = title.length ? `Twitch Fox\n${title}` : 'Twitch Fox';
    browser.browserAction.setBadgeText({
        text: text ? String(text) : '',
    });
    browser.browserAction.setTitle({
        title,
    });
};

const endAlarm = () => {
    clearInterval(alarmInterval);
    audio.pause();
    alarmOn = false;
    alarmTarget = null;
    updateBadge();
};

const playAlarm = (override) => {
    if (!alarmOn && !override) return;
    audio.play();
    // Also flash the badge
    browser.browserAction.setBadgeBackgroundColor({
        color: '#FF0000',
    });
    setTimeout(() => browser.browserAction.setBadgeBackgroundColor({
        color: '#6641A5',
    }), 250);
    if (alarmLimit && !override) {
        alarmOngoing += alarmPeriod;
        if (alarmLimit && alarmOngoing >= alarmLength) endAlarm();
    }
};

const setAlarm = (target) => {
    // console.log("setAlarm");
    audio.load();
    clearInterval(alarmInterval);
    alarmInterval = setInterval(playAlarm, alarmPeriod);
    playAlarm();
    alarmOn = true;
    alarmTarget = target;
    alarmOngoing = 0;
    updateBadge();
    /* browser.runtime.sendMessage({
      content: "endAlarm"
    }); */
};

const updateAlarm = () => {
    audio.volume = getStorage('alarmVolume') / 100;
    audio.src = 'alarm.ogg';
    alarmPeriod = getStorage('alarmInterval') * 1000;
    alarmLength = getStorage('alarmLength') * 1000;
    alarmLimit = getStorage('limitAlarm');
    if (alarmOn) {
        clearInterval(alarmInterval);
        audio.pause();
        alarmInterval = setInterval(playAlarm, alarmPeriod);
        playAlarm();
    }
};

const setStorage = (key, value, callback) => {
    const obj = {};
    obj[key] = value;
    browser.storage.sync.set(obj).then(() => {
        updateAlarm();
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
    onFollowAlarmTrigger();
};

const getUserFollowedChannels = (offset = 0) => {
    /*
      Get all of a user's followed channels
    */
    const limit = 100; // Special result limit used for this function only
    if (!offset) {
        userFollowIDs = [];
        userFollows = [];
    }
    twitchAPI('Get User Follows', {
        _id: authorizedUser._id,
        offset,
        limit,
    }, (data) => {
        if (!data) {
            // Try again later?
            setTimeout(() => getUserFollowedChannels(), 60000);
            return;
        }
        let j = 0;
        for (let i = 0; i < data.follows.length; i += 1) {
            if (userFollowIDs.indexOf(data.follows[i].channel._id) < 0) {
                userFollowIDs.push(data.follows[i].channel._id);
                userFollows.push(data.follows[i]);
                j += 1;
            }
        }
        j = j || limit;
        if (data._total > offset) {
            getUserFollowedChannels(offset + j);
        } else {
            browser.runtime.sendMessage({
                content: 'followed',
            });
            // Now get the user's followed streams
            startFollowAlarm();
        }
    });
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
    const logo = stream.channel.logo != null ? stream.channel.logo : 'https://' +
        'static-cdn.jtvnw.net/jtv_user_pictures/xarth/404_user_300x300.png';

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
    // We assume that the channel is followed and the stream is new
    if (getStorage('favorites').indexOf(String(stream.channel._id)) > -1) {
        // Favorited channel
        if (getStorage('favoritesDesktopNotifications')) {
            desktopNotification(stream);
        }
        if (getStorage('favoritesAudioNotifications')) {
            setAlarm(stream);
        }
    } else {
        // Regular followed channel
        if (getStorage('nonfavoritesDesktopNotifications')) {
            desktopNotification(stream);
        }
        if (getStorage('nonfavoritesAudioNotifications')) {
            setAlarm(stream);
        }
    }
};

const getFollowedStreams = (offset = 0) => {
    /*
      Get all of a user's followed streams
    */
    const limit = 100; // Special result limit used for this function only
    let j = 0;
    if (!offset) {
        userFollowedStreams = [];
    }
    const twitchCallback = (data) => {
        if (!data) setTimeout(() => getFollowedStreams(), 60000);
        for (let i = 0; i < data.streams.length; i += 1) {
            const stream = data.streams[i];
            if (userFollowIDs.indexOf(String(stream.channel._id)) < 0) {
                // For some reason, we don't have this channel marked as followed,
                // but we were still notified that it came online!
                if (authorizedUser) {
                    // Assume that Twitch is right, and update our follows!
                    getUserFollowedChannels(() => {
                        browser.runtime.sendMessage({
                            content: 'followedStreams',
                        });
                    });
                } else if (getStorage('nonTwitchFollows')) getFollows();
            }
            if (userFollowedStreams.map(s => s._id).indexOf(stream._id) < 0) {
                userFollowedStreams.push(stream);
                const notifiedStreams = getStorage('notifiedStreams');
                if (notifiedStreams.indexOf(stream._id) < 0) {
                    // We have not notified the user about this stream yet
                    notifiedStreams.push(stream._id);
                    setStorage('notifiedStreams', notifiedStreams);
                    notify(stream);
                }
                j += 1;
            }
        }
        j = j || limit;
        if (data._total > offset) {
            getFollowedStreams(offset + j);
        } else {
            // Done
            updateBadge();
            browser.runtime.sendMessage({
                content: 'followed',
            });
        }
    };
    if (authorizedUser) {
        twitchAPI('Get Followed Streams', {
            offset,
            limit,
        }, data => twitchCallback(data));
    } else if (getStorage('nonTwitchFollows')) {
        twitchAPI('Get Live Streams', {
            channel: getStorage('follows').join(','),
            offset,
            limit,
        }, data => twitchCallback(data));
    } else {
        // We've got no streams to get
        userFollowedStreams = [];
        browser.runtime.sendMessage({
            content: 'followed',
        });
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
    endAlarm();
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
        getUserFollowedChannels();
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
        browser.storage.sync.get('token').then((newRes) => {
            cleanFollows();
            if (newRes.token) getUser();
            else initFollows();
        });
    });
};

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

onFollowAlarmTrigger = () => {
    getFollowedStreams();
};
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
    endAlarm();
});

browser.notifications.onClosed.addListener((notificationId, byUser) => {
    lastName = '';
    lastURL = '';
    if (byUser) endAlarm();
});

browser.alarms.onAlarm.addListener((alarmInfo) => {
    if (alarmInfo.name === 'getFollowedStreams') onFollowAlarmTrigger();
});

browser.browserAction.setBadgeBackgroundColor({
    color: '#6641A5',
});

// Exports

window.authorize = authorize;
window.defaultContent = defaultContent;
window.defaultResults = defaultResults;
window.endAlarm = endAlarm;
window.favorite = favorite;
window.follow = follow;
window.getAlarmStatus = getAlarmStatus;
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

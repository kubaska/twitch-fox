/*
  Build the user interface, including streams, games, clips, videos, and their
  followed equivalents.
  Use the Twitch API to perform searches
  Allow the user to authorize and deauthorize their account with Twitch
*/

// Disable if bp is non-existent
// if (!bp) browser.browserAction.disable();
// Just kidding this also disables it on non-private windows

import utils from "./utils";
import LazyLoad from "vanilla-lazyload";

const bp = browser.extension.getBackgroundPage();

const settings = document.getElementById('settings');
const back = document.getElementById('back');
const forward = document.getElementById('forward');
const searchBar = document.getElementById('searchBar');
const search = document.getElementById('search');
const searchBox = document.getElementById('searchBox');
const refresh = document.getElementById('refresh');
const exitSearch = document.getElementById('exitSearch');
const avatar = document.getElementById('avatar');
const login = document.getElementById('login');
const loginText = document.getElementById('loginText');
const contentArea = document.getElementById('contentArea');
const screenLock = document.getElementById('screenLock');
const lazyload = new LazyLoad({
    container: contentArea
});

let enlargedPreview = document.getElementById('enlargedPreview');
let enlargedContent = '';
let newEnlarged;
let oldEnlarged;

let mode;

const delimitNumber = (num = 0) => num.toString().replace(
    /\B(?=(\d{3})+(?!\d))/g,
    browser.i18n.getMessage('delimiter'),
);

const setMode = (newMode) => {
    /*
      Set the mode in both the script and the storage
    */
    mode = newMode;
    bp.setMode(newMode);
};

const addTooltip = (parent, noDisable) => {
    const tooltip = document.createElement('span');
    tooltip.classList.add('tooltip');
    if (noDisable) tooltip.classList.add('noDisable');
    parent.appendChild(tooltip);
    return tooltip;
};

let addCard;

const enlarge = (contentDiv, contentBack, img) => {
    if (oldEnlarged && oldEnlarged.id !==
        enlargedPreview.id) {
        screenLock.removeChild(oldEnlarged);
    }
    const rect = contentBack.getBoundingClientRect();
    newEnlarged = enlargedPreview.cloneNode();
    newEnlarged.id = 'newEnlarged';
    contentDiv.classList.add('hidden');
    enlargedContent = contentDiv.id;
    enlargedPreview.style.backgroundImage =
        `url("${img}")`;
    enlargedPreview.style.left = `${rect.left}px`;
    enlargedPreview.style.top = `${rect.top}px`;
    enlargedPreview.style.transform =
        `translate(${-rect.left}px,${131 - rect.top}px)`;
    enlargedPreview.classList.add('enlarged');
    screenLock.classList.remove('hidden');
};

const enlarge2 = (element) => {
    if (oldEnlarged && oldEnlarged.id !== enlargedPreview.id) {
        screenLock.removeChild(oldEnlarged);
    }
    const contentBack = element.querySelector('.contentBack');
    const rect = contentBack.getBoundingClientRect();
    newEnlarged = enlargedPreview.cloneNode();
    newEnlarged.id = 'newEnlarged';
    element.classList.add('hidden');
    enlargedContent = element.id;
    enlargedPreview.style.backgroundImage = contentBack.style.backgroundImage;
    enlargedPreview.style.left = `${rect.left}px`;
    enlargedPreview.style.top = `${rect.top}px`;
    enlargedPreview.style.transform = `translate(${-rect.left}px,${131 - rect.top}px)`;
    enlargedPreview.classList.add('enlarged');
    screenLock.classList.remove('hidden');
};

const filterContent = (noScroll) => {
    const filter = searchBox.value.toLowerCase();
    const results = bp.getResults();
    const index = bp.getIndex();

    const tags = document.getElementsByClassName('tag');
    let hidden = 0;
    for (let i = 0; i < tags.length; i += 1) {
        if (tags[i].textContent.toLowerCase().search(filter) > -1) {
            tags[i].parentElement.classList.remove('hide');
        } else {
            tags[i].parentElement.classList.add('hide');
            hidden += 1;
        }
    }
    if (!filter && !noScroll) {
        contentArea.scrollTop = results[index].scroll;
    }
    let noResults = document.getElementById('noResults');
    if (tags.length - hidden === 0) {
        if (noResults) {
            noResults.classList.remove('hide');
        } else {
            noResults = document.createElement('div');
            noResults.id = 'noResults';
            noResults.classList.add('noResults');
            if (results[index].content.length) {
                noResults.textContent = browser.i18n.getMessage('noResults');
            } else if (index === 0 && mode === 'channels') {
                noResults.textContent = browser.i18n.getMessage('channelsTabReady');
            } else if (mode.substr(0, 8) === 'followed') {
                noResults.textContent = browser.i18n.getMessage('noFollowedResults');
            } else {
                noResults.textContent = browser.i18n.getMessage('noSearchResults');
            }
            contentArea.append(noResults);
        }
    } else if (noResults) {
        noResults.classList.add('hide');
    }
};

const updatePage = (noScroll) => {
    // console.log("updatePage");
    /*
      Create info cards from the info the Twitch API gathered
    */
    const results = bp.getResults();
    const index = bp.getIndex();

    while (contentArea.hasChildNodes()) {
        contentArea.removeChild(contentArea.firstChild);
    }

    for (let i = 0; i < results[index].content.length; i += 1) {
        addCard(results[index].content[i], results[index].type);
    }

    if (results.length - index > 1) {
        forward.classList.add('possible');
    } else {
        forward.classList.remove('possible');
    }

    if (index > 0 || mode.substr(0, 8) === 'followed') {
        if (results[index].total) {
            searchBox.placeholder =
                browser.i18n.getMessage('filterOf', [
                    delimitNumber(contentArea.children.length),
                    delimitNumber(results[index].total),
                ]);
        } else {
            searchBox.placeholder = browser.i18n.getMessage(
                'filter',
                delimitNumber(contentArea.children.length),
            );
        }
        search.classList.remove('possible');
        back.classList[index > 0 ? 'add' : 'remove']('possible');
    } else {
        if (results[index].total || mode === 'channels') {
            searchBox.placeholder = mode === 'channels' ?
                browser.i18n.getMessage('searchTwitch') :
                browser.i18n.getMessage('searchOrFilterOf', [
                    delimitNumber(contentArea.children.length),
                    delimitNumber(results[index].total),
                ]);
            search.classList.add('possible');
        } else {
            searchBox.placeholder = browser.i18n.getMessage(
                'filter',
                delimitNumber(contentArea.children.length),
            );
            search.classList.remove('possible');
        }
        back.classList.remove('possible');
    }

    exitSearch.classList[forward.classList.contains('possible') ||
    back.classList.contains('possible') ? 'add' : 'remove']('possible');

    if (mode === 'followedChannels' || mode === 'followedStreams') {
        // Refresh button becomes favorites filter
        // refresh.classList.remove('refresh');
        // refresh.classList.add('favorites');
        // refresh.classList[bp.getStorage('favoritesMode') ? 'add' : 'remove']('possible');
        refresh.firstElementChild.textContent =
            browser.i18n.getMessage(refresh.classList.contains('possible') ? 'allFollowsTip' : 'favoritesTip');
    } else {
        // refresh.classList.remove('favorites');
        // refresh.classList.add('refresh');
        refresh.classList.add('possible');
        refresh.firstElementChild.textContent = browser.i18n.getMessage('refreshTip');
    }

    if (!noScroll) searchBox.value = results[index].filter;

    filterContent(noScroll);
    lazyload.update();
};

const getApiResults = (endpoint, theOpts = {}, newIndex, reset) => {
    const results = bp.getResults();
    let offset = contentArea.children.length;
    let index = bp.getIndex();
    const opts = theOpts;

    results[index].filter = searchBox.value;
    results[index].scroll = reset ? 0 : contentArea.scrollTop;

    if (newIndex) {
        index += 1;
        bp.setIndex(index);
        // Remove elements after the new one
        results.splice(
            index, results.length - index,
            bp.defaultResults()[0],
        );
        offset = 0;
    }

    if (reset) {
        offset = 0;
        results[index].content = bp.defaultContent();
        delete opts.limit;
        delete opts.language;
        delete opts.cursor;
    }

    if (!Object.prototype.hasOwnProperty.call(opts, 'limit')) {
        opts.limit = bp.getStorage('resultLimit');
    }

    if (bp.getStorage('languageCodes')) {
        opts.language = bp.getStorage('languageCodes');
    }

    if (endpoint !== 'Get Top Clips' && endpoint !== 'Get Followed Clips') {
        opts.offset = offset;
    } else {
        opts.cursor = results[index].cursor;
    }

    refresh.classList.add('thinking');
    searchBox.placeholder = browser.i18n.getMessage('loading');
    bp.twitchAPI(endpoint, opts, (data) => {
        if (data) {
            if (endpoint === 'Get Top Games') {
                Array.prototype.push.apply(results[index].content, data.top);
                results[index].type = 'game';
            } else if (endpoint === 'Get Live Streams' ||
                endpoint === 'Search Streams') {
                Array.prototype.push.apply(results[index].content, data.streams);
                results[index].type = 'stream';
            } else if (endpoint === 'Search Games') {
                Array.prototype.push.apply(results[index].content, data.games);
                results[index].type = 'game';
            } else if (endpoint === 'Get Top Videos') {
                Array.prototype.push.apply(results[index].content, data.vods);
                results[index].type = 'video';
            } else if (endpoint === 'Get Followed Videos' ||
                endpoint === 'Get Channel Videos') {
                Array.prototype.push.apply(results[index].content, data.videos);
                results[index].type = 'video';
            } else if (endpoint === 'Get Followed Clips' ||
                endpoint === 'Get Top Clips') {
                Array.prototype.push.apply(results[index].content, data.clips);
                results[index].type = 'clip';
            } else if (endpoint === 'Search Channels') {
                Array.prototype.push.apply(results[index].content, data.channels);
                results[index].type = 'channel';
            }
            results[index].total = data._total;
            results[index].endpoint = endpoint;
            results[index].opts = JSON.stringify(opts);
            results[index].cursor = data._cursor;
            bp.setResults(results);
        }
        refresh.classList.remove('thinking');
        searchBox.value = '';
        updatePage();
    });
};

const UI = {
    insertBackgroundUrl: (element, url, useLazyloader = true) => {
        if (useLazyloader) {
            element.dataset['bg'] = url;
        } else {
            element.style.backgroundImage = `url("${url}")`;
        }
    },

    getParentElement: (element, klass) => {
        while (element && ! element.classList.contains(klass)) {
            element = element.parentElement;
        }
        return element;
    }
}

addCard = (content, type) => {
    if (type === 'game') {
        let card = document.getElementById('stub-game').cloneNode(true);

        const game = content.game ? content.game : content;

        card.id = `GAME!${game._id}`;
        card.dataset['game'] = game.name;

        card.querySelectorAll('.game-name').forEach(element => {
            element.textContent = game.name;
        })

        card.querySelector('.contentBack').dataset['bg'] = game.box.medium;

        if (content.viewers) {
            card.querySelector('.viewer-count').textContent = delimitNumber(content.viewers);
        } else {
            // Searching for game does not return the viewer count, hide it
            card.querySelector('.viewer-count').classList.add('hide');
        }

        card.querySelector('.tag').textContent = game.name;

        card.addEventListener('click', cardClickHandler);

        contentArea.appendChild(card);
    }
    else if (type === 'stream') {
        let card = document.getElementById('stub-stream').cloneNode(true);

        card.id = `STREAM!${content._id}`;
        card.dataset['id'] = content._id;
        card.dataset['streamerId'] = content.channel._id;
        card.dataset['name'] = content.channel.name;
        card.dataset['game'] = content.game;

        card.querySelector('.status.stream').textContent = content.channel.status;

        UI.insertBackgroundUrl(card.querySelector('.contentBack'), content.preview.large);

        if (content.game) {
            card.querySelector('.game-name').textContent = content.game;
            UI.insertBackgroundUrl(
                card.querySelector('.cornerGame'),
                `https://static-cdn.jtvnw.net/ttv-boxart/${content.game}-52x72.jpg`
            );
        } else {
            card.querySelector('.cornerGame').classList.add('hide');
        }

        const startDate = new Date(content.created_at);
        const now = Date.now();

        card.querySelector('.uptime-time').textContent = utils.timeSince(startDate, now);
        card.querySelector('.uptime-started').textContent = startDate.toLocaleString();
        card.querySelector('.viewer-number').textContent = delimitNumber(content.viewers);

        card.querySelectorAll('.streamer-name').forEach(element => {
            element.textContent = content.channel.display_name;
        });

        // tooltip stuff
        card.querySelector('.smallVideos .tooltip').textContent = browser.i18n.getMessage(
            'channelVideosTip', content.channel.display_name
        );
        card.querySelector('.smallClips .tooltip').textContent = browser.i18n.getMessage(
            'channelClipsTip', content.channel.display_name
        );

        const following = bp.isFollowing(content.channel.name);
        card.querySelector('.follow').style = following ? 'display:none' : '';
        card.querySelector('.unfollow').style = following ? '' : 'display:none';

        UI.insertBackgroundUrl(card.querySelector('.cornerLogo'), content.channel.logo);

        card.querySelector('.tag').textContent =
            content.game+content.channel.name+content.channel.display_name+content.channel.status;

        card.addEventListener('click', cardClickHandler);

        contentArea.appendChild(card);
    }
    else if (type === 'video' || type === 'clip') {
        let card = document.getElementById('stub-stream').cloneNode(true);
        const id = type === 'video' ? content._id : content.tracking_id;
        const channel = type === 'video' ? content.channel : content.broadcaster;

        card.id = type === 'video' ? `VIDEO!${id}` : `CLIP!${id}`;
        card.dataset['id'] = id;
        // for some reason, Twitch returns id prop with an underscore
        // for videos and without for clips...
        card.dataset['streamerId'] = type === 'video' ? channel._id : channel.id;
        card.dataset['name'] = channel.name;
        card.dataset['game'] = content.game;

        card.querySelector('.status.stream').textContent = content.title;

        UI.insertBackgroundUrl(
            card.querySelector('.contentBack'),
            type === 'video' ? content.preview.large : content.thumbnails.medium
        );

        if (content.game) {
            card.querySelector('.game-name').textContent = content.game;
            UI.insertBackgroundUrl(
                card.querySelector('.cornerGame'),
                `https://static-cdn.jtvnw.net/ttv-boxart/${content.game}-52x72.jpg`
            );
        } else {
            card.querySelector('.cornerGame').classList.add('hide');
        }

        let seconds = type === 'video' ? content.length : content.duration;
        const createdAt = new Date(content.created_at);

        card.querySelector('.uptime-time').textContent = utils.secondsToHHMMSS(parseInt(seconds));
        card.querySelector('.uptime-started').textContent = createdAt.toLocaleString();
        card.querySelector('.viewer-number').textContent = delimitNumber(content.views);

        // Hide chat button
        card.querySelector('.contentButton.chat').classList.add('hide');

        const following = bp.isFollowing(channel.name);
        card.querySelector('.follow').style = following ? 'display:none' : '';
        card.querySelector('.unfollow').style = following ? '' : 'display:none';

        card.querySelectorAll('.streamer-name').forEach(element => {
            element.textContent = channel.display_name;
        });

        // tooltip stuff
        card.querySelector('.smallVideos .tooltip').textContent = browser.i18n.getMessage(
            'channelVideosTip', channel.display_name
        );
        card.querySelector('.smallClips .tooltip').textContent = browser.i18n.getMessage(
            'channelClipsTip', channel.display_name
        );

        UI.insertBackgroundUrl(card.querySelector('.cornerLogo'), channel.logo);

        card.querySelector('.tag').textContent =
            content.game+channel.name+channel.display_name+channel.status;

        card.addEventListener('click', cardClickHandler);

        contentArea.appendChild(card);

        // if (document.getElementById(id)) {
        //     return;
        // }

    }
    else if (type === 'channel') {
        const channel = content.channel ? content.channel : content;

        let card = document.getElementById('stub-channel').cloneNode(true);
        card.id = `CHANNEL!${channel._id}`;
        card.dataset['id'] = channel._id;
        card.dataset['streamerId'] = channel._id;
        card.dataset['name'] = channel.name;

        card.querySelectorAll('.streamer-name').forEach(element => {
            element.textContent = channel.display_name;
        });

        card.querySelector('.status.channel').textContent = channel.description;

        UI.insertBackgroundUrl(
            card.querySelector('.contentBack'),
            channel.logo
                ? channel.logo
                : 'https://static-cdn.jtvnw.net/jtv_user_pictures/xarth/404_user_300x300.png',
            false
        );

        if (content.game) {
            card.dataset['game'] = content.game;
            card.querySelector('.game-name').textContent = content.game;
            UI.insertBackgroundUrl(
                card.querySelector('.cornerGame'),
                `https://static-cdn.jtvnw.net/ttv-boxart/${content.game}-52x72.jpg`,
                false
            );
        } else {
            card.querySelector('.cornerGame').classList.add('hide');
        }

        const following = bp.isFollowing(channel.name);
        card.querySelectorAll('.follow').forEach(btn => btn.style = following ? 'display:none' : '');
        card.querySelector('.unfollow').style = following ? '' : 'display:none';

        // tooltip stuff
        card.querySelector('.smallVideos .tooltip').textContent = browser.i18n.getMessage(
            'channelVideosTip', channel.display_name
        );
        card.querySelector('.smallClips .tooltip').textContent = browser.i18n.getMessage(
            'channelClipsTip', channel.display_name
        );

        card.querySelector('.tag').textContent = channel.name+channel.display_name;

        card.addEventListener('click', cardClickHandler);

        contentArea.appendChild(card);
    }
};

const cardClickHandler = (e) => {
    const trigger = e.target.dataset['trigger'];

    if (! trigger) return;

    if (e.target.classList.contains('noAccess')) return;

    const topElem = UI.getParentElement(e.target, 'content');

    const meta = {
        streamerId: parseInt(topElem.dataset['streamerId']),
        name: topElem.dataset['name'],
        game: topElem.dataset['game']
    }

    switch (trigger) {
        case 'openStream':
            browser.tabs.create({
                url: 'https://twitch.tv/'+meta.name,
            });
            break;
        case 'openGame':
            browser.tabs.create({
                url: 'https://www.twitch.tv/directory/game/'+meta.game
            });
            break;
        case 'openStreamPopout':
            browser.windows.create({
                url: 'http://player.twitch.tv/?parent=localhost&channel='+meta.name,
                height: 500,
                width: 850,
                type: 'popup',
            });
            break;
        case 'openChat':
            browser.windows.create({
                url: `http:/twitch.tv/${meta.name}/chat?popout`,
                height: 600,
                width: 340,
                type: 'popup',
            });
            break;
        case 'enlarge':
            enlarge2(topElem);
            break;
        case 'follow':
            bp.follow(meta.streamerId, meta.name, false);
            updatePage(true);
            break;
        case 'followLocal':
            bp.follow(meta.streamerId, meta.name, true);
            updatePage(true);
            break;
        case 'unfollow':
            bp.unfollow(meta.streamerId, meta.name);
            updatePage(true);
            break;
        case 'browseVideosByChannel':
            getApiResults('Get Channel Videos', { _id: meta.streamerId, }, true);
            break;
        case 'browseClipsByChannel':
            getApiResults('Get Top Clips', { channel: meta.name }, true);
            break;
        case 'browseGame':
            getApiResults('Get Live Streams', { game: meta.game }, true);
            break;
        case 'browseChannelsByGame':
            getApiResults('Get Top Videos', { game: meta.game }, true);
            break;
        case 'browseClipsByGame':
            getApiResults('Get Top Clips', { game: meta.game }, true);
            break;
    }
}

const updateTab = (newMode) => {
    /*
      Update the current selected tab and the mode
    */

    // console.log("updateTab");
    mode = bp.getMode();

    let results = bp.getResults();
    let index = bp.getIndex();

    if (newMode) {
        if (document.getElementById(newMode).classList.contains('noAccess')) {
            // The mode we are trying to switch to is not allowed
            return;
        }
        document.getElementById(mode).classList.remove('selected');
        setMode(newMode);
    }

    document.getElementById(mode).classList.add('selected');
    while (contentArea.hasChildNodes()) {
        contentArea.removeChild(contentArea.firstChild);
    }

    if (mode === 'about') {
        // Show the about page
        // contentArea.classList.add('hide');
        const about = document.getElementById('about-page').cloneNode(true);
        about.id = '';
        contentArea.appendChild(about);
        searchBar.classList.add('hide');
        // aboutPage.classList.remove('hide');
    } else {
        // Show the content area
        // aboutPage.classList.add('hide');
        contentArea.classList.remove('hide');
        searchBar.classList.remove('hide');

        if (index === 0) {
            // Tell the Twitch API to find us the information we want
            if (mode === 'games') {
                if (results[index].content.length < 1) getApiResults('Get Top Games');
                else updatePage();
            } else if (mode === 'streams') {
                if (results[index].content.length < 1) {
                    getApiResults('Get Live Streams');
                } else updatePage();
            } else if (mode === 'videos') {
                if (results[index].content.length < 1) {
                    getApiResults('Get Top Videos');
                } else updatePage();
            } else if (mode === 'clips') {
                if (results[index].content.length < 1) getApiResults('Get Top Clips');
                else updatePage();
            } else if (mode === 'channels') {
                updatePage();
            } else if (mode === 'followedStreams') {
                index = 0;
                results = bp.defaultResults();
                results[index].content = bp.getUserFollowedStreams();
                results[index].type = 'stream';
                bp.setResults(results);
                updatePage();
            } else if (mode === 'followedVideos') {
                if (results[index].content.length < 1) {
                    getApiResults('Get Followed Videos');
                } else updatePage();
            } else if (mode === 'followedClips') {
                if (results[index].content.length < 1) {
                    getApiResults('Get Followed Clips');
                } else updatePage();
            } else if (mode === 'followedChannels') {
                index = 0;
                results = bp.defaultResults();
                results[index].content = bp.getUserFollows();
                results[index].type = 'channel';
                bp.setResults(results);
                updatePage();
            }
        } else {
            updatePage();
        }
    }
};

const initialize = () => {
    /*
      Initalizes the popup interface, essentially ensuring that all non-dynamic
      content (streams, games, etc.) is properly diplayed.
      Includes internationalization, proper tooltips, etc.
    */

    // console.log("initalize()");

    // Get the storage data for a few popup-specific things

    mode = bp.getMode();

    // Login/logout
    if (bp.getAuthorizedUser()) {
        loginText.textContent = browser.i18n.getMessage('logout');
        avatar.classList.remove('noAccess');
        avatar.style.backgroundImage = `url("${bp.getAuthorizedUser().logo}")`;
    } else {
        loginText.textContent = browser.i18n.getMessage('login');
        avatar.classList.add('noAccess');
        avatar.style.backgroundImage = '';
    }

    if (!bp.getStorage('tooltips')) {
        document.getElementById('styleLink').href = 'noTooltips.css';
    }

    if (bp.getStorage('darkMode')) {
        document.getElementById('darkMode').href = 'dark.css';
    }

    // Tooltips
    const tooltips = document.getElementsByClassName('tooltip');
    for (let i = 0; i < tooltips.length; i += 1) {
        const tooltip = tooltips[i];
        if (tooltip.id.substring(0, 8) === 'followed') {
            if (bp.getAuthorizedUser() ||
                (bp.getStorage('nonTwitchFollows') &&
                    (tooltip.id === 'followedStreamsTip' || tooltip.id ===
                        'followedChannelsTip'))) {
                tooltip.textContent = browser.i18n.getMessage(tooltip.id);
                tooltip.parentElement.classList.remove('noAccess');
            } else {
                tooltip.textContent = browser.i18n.getMessage('noAccessTip');
                tooltip.parentElement.classList.add('noAccess');
            }
        } else if (tooltip.id === 'loginTip') {
            if (bp.getAuthorizedUser()) {
                tooltip.textContent = browser.i18n.getMessage('logoutTip');
            } else {
                tooltip.textContent = browser.i18n.getMessage(tooltip.id);
            }
        } else if (tooltip.id === 'avatarTip') {
            if (bp.getAuthorizedUser()) {
                if (bp.getStorage('tooltips')) {
                    tooltip.textContent =
                        browser.i18n.getMessage(
                            tooltip.id,
                            bp.getAuthorizedUser().display_name,
                        );
                } else {
                    tooltip.classList.add('noDisable');
                    tooltip.textContent = bp.getAuthorizedUser().display_name;
                }
            }
        } else if (tooltip.id) {
            tooltip.textContent = browser.i18n.getMessage(tooltip.id);
        }
    }

    // Select current tab
    if (document.getElementById(mode).classList.contains('noAccess')) {
        // You don't want people to remain on a tab after it becomes unusable
        document.getElementById(mode).classList.remove('selected');
        bp.setResults(bp.defaultResults());
        setMode('games');
    }
    document.getElementById(mode).classList.add('selected');

    updateTab();
};

const selectTab = (e) => {
    if (e.target.classList.contains('tab') &&
        ! e.target.classList.contains('noAccess') &&
        e.target.id !== mode
    ) {
        bp.setResults(bp.defaultResults());
        bp.setIndex(0);
        updateTab(e.target.id);
    }
}

/*
  Click events
*/

document.querySelectorAll('#menu .tab')
    .forEach(tab => {
        document.addEventListener('click', selectTab);
    });

// Settings page
settings.addEventListener('click', () => browser.runtime.openOptionsPage());

// Back button
back.addEventListener('click', () => {
    if (!back.classList.contains('possible')) return;
    bp.setIndex(bp.getIndex() - 1);
    updatePage();
});

// Forward button
forward.addEventListener('click', () => {
    if (!forward.classList.contains('possible')) return;
    bp.setIndex(bp.getIndex() + 1);
    updatePage();
});

const makeSearch = () => {
    // Perform search using getApiResults
    if (!search.classList.contains('possible') || !searchBox.value) return;
    if (mode === 'games') {
        getApiResults('Search Games', {
            query: searchBox.value,
        }, true);
    } else if (mode === 'streams') {
        getApiResults('Search Streams', {
            query: searchBox.value,
        }, true);
    } else if (mode === 'channels') {
        getApiResults('Search Channels', {
            query: searchBox.value,
        }, true);
    }
};

// Search button
search.addEventListener('click', makeSearch);

// Enter key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') makeSearch();
});

// Search box
searchBox.addEventListener('input', filterContent);

// Refresh button
refresh.addEventListener('click', () => {
    const results = bp.getResults();
    const index = bp.getIndex();
    getApiResults(
        results[index].endpoint,
        JSON.parse(results[index].opts), false, true,
    );
});

// Exit search button
exitSearch.addEventListener('click', () => {
    if (!exitSearch.classList.contains('possible')) return;
    bp.setResults(bp.defaultResults());
    bp.setIndex(0);
    updateTab();
});

// Avatar
avatar.addEventListener('click', () => {
    if (bp.getAuthorizedUser()) {
        const url = `https://www.twitch.tv/${bp.getAuthorizedUser().name}`;
        browser.tabs.create({
            url,
        });
    }
});

// Login/logout
login.addEventListener('click', () => {
    if (bp.getAuthorizedUser()) {
        bp.deauthorize();
    } else {
        bp.authorize();
    }
});

screenLock.addEventListener('click', () => {
    screenLock.classList.add('hidden');
    document.getElementById(enlargedContent).classList.remove('hidden');
    enlargedPreview.classList.remove('enlarged');
    enlargedPreview.style.transform = 'none';
    oldEnlarged = enlargedPreview;
    oldEnlarged.id = 'oldEnlarged';

    enlargedPreview = newEnlarged;
    enlargedPreview.id = 'enlargedPreview';
    screenLock.appendChild(enlargedPreview);
});

contentArea.addEventListener('scroll', () => {
    if (contentArea.scrollHeight - contentArea.scrollTop === 564) {
        const results = bp.getResults();
        const index = bp.getIndex();
        getApiResults(results[index].endpoint, JSON.parse(results[index].opts));
    }
});

browser.runtime.onMessage.addListener((request) => {
    if (request.content === 'initialize' ||
        (request.content === mode.substr(0, 8)) ||
        (request.content === mode)) initialize();
    else if (request.content !== 'options') updatePage(true);
});

initialize();

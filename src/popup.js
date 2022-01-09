/* global browser */

import {endpoints, tabs} from "./contants";
import {makeCard, UI} from "./ui";
import utils from "./utils";
import {debounce} from "lodash";
import './css/popup.sass';

const bp = browser.extension.getBackgroundPage();

// Navigation
const back = document.getElementById('back');
const forward = document.getElementById('forward');
const searchBar = document.getElementById('navigation');
const search = document.getElementById('search');
const searchBox = document.getElementById('searchBox');
const refresh = document.getElementById('refresh');
const exitSearch = document.getElementById('exitSearch');
const avatar = document.getElementById('avatar');
const login = document.getElementById('login');
const loginText = document.getElementById('loginText');

const contentArea = document.getElementById('content-area');
const mediaContainer = document.getElementById('media-container');
const previewElement = document.getElementById('preview');
const settings = document.getElementById('settings');

let mode;


/**
 * Set the popup mode in both the script and the storage
 *
 * @param newMode
 */
const setMode = (newMode) => {
    mode = newMode;
    bp.setMode(newMode);
};


const enlarge = (element) => {
    const cover = element.querySelector('.media-object__cover-inner');
    const rect = cover.getBoundingClientRect();
    previewElement.style.backgroundImage = `url(${cover.src})`;
    previewElement.style.left = `${rect.left}px`;
    previewElement.style.top = `${rect.top}px`;
    previewElement.style.width = `${rect.width}px`;
    previewElement.style.height = `${rect.height}px`;
    previewElement.style.transition = 'none';

    setTimeout(() => {
        previewElement.style.transition = 'all 0.3s ease';
        previewElement.classList.add('enabled');
    }, 1);
}
previewElement.addEventListener('click', () => {
    previewElement.classList.remove('enabled');
});

const filterContent = (noScroll) => {
    const filter = searchBox.value.toLowerCase();
    const results = bp.getResults();
    const index = bp.getIndex();

    const tags = document.querySelectorAll('.media-container .tag');
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
        }
        else {
            noResults = document.createElement('div');
            noResults.id = 'noResults';
            noResults.classList.add('noResults');
            if (results[index].content.length) {
                noResults.textContent = browser.i18n.getMessage('noResults');
            } else if (index === 0 && mode === tabs.SEARCH) {
                noResults.textContent = browser.i18n.getMessage('channelsTabReady');
            } else if (tabs.isFollowedTab(mode)) {
                noResults.textContent = browser.i18n.getMessage('noFollowedResults');
            } else {
                noResults.textContent = browser.i18n.getMessage('noSearchResults');
            }
            contentArea.append(noResults);
        }
    }
    else if (noResults) {
        noResults.classList.add('hide');
    }
};

/**
 * Render Twitch content
 *
 * @param noScroll Keep scroll position in place
 */
const updatePage = (noScroll) => {
    const results = bp.getResults();
    const index = bp.getIndex();

    while (mediaContainer.hasChildNodes()) {
        mediaContainer.removeChild(mediaContainer.firstChild);
    }
    let addCount = 0;
    let cards = document.createDocumentFragment();

    for (let i = 0; i < results[index].content.length; i += 1) {
        const card = makeCard(bp, results[index].type, results[index].content[i]);
        card.addEventListener('click', cardClickHandler);
        cards.appendChild(card);
        addCount++;
    }

    mediaContainer.appendChild(cards);

    console.log('Cards added: ', addCount);
    mediaContainer.className = 'media-container ' + results[index].type;

    if (results.length - index > 1) {
        forward.classList.remove('icon--inactive');
    } else {
        forward.classList.add('icon--inactive');
    }

    if (index > 0 || tabs.isFollowedTab(mode)) {
        if (results[index].total) {
            searchBox.placeholder =
                browser.i18n.getMessage('filterOf', [
                    utils.delimitNumber(mediaContainer.children.length),
                    utils.delimitNumber(results[index].total),
                ]);
        } else {
            searchBox.placeholder = browser.i18n.getMessage(
                'filter',
                utils.delimitNumber(mediaContainer.children.length),
            );
        }
        search.classList.add('icon--inactive');
        back.classList[index > 0 ? 'remove' : 'add']('icon--inactive');
    } else {
        if (mode === tabs.GAMES || mode === tabs.SEARCH) {
            searchBox.placeholder = mode === tabs.SEARCH ?
                browser.i18n.getMessage('searchTwitch') :
                browser.i18n.getMessage('searchOrFilterOf', [
                    utils.delimitNumber(mediaContainer.children.length),
                    utils.delimitNumber(results[index].total),
                ]);
            search.classList.remove('icon--inactive');
        } else {
            searchBox.placeholder = browser.i18n.getMessage(
                'filter',
                utils.delimitNumber(mediaContainer.children.length),
            );
            search.classList.add('icon--inactive');
        }
        back.classList.add('icon--inactive');
    }

    // fixme
    exitSearch.classList[forward.classList.contains('icon--inactive') ||
    back.classList.contains('icon--inactive') ? 'add' : 'remove']('icon--inactive');

    if (mode === tabs.FOLLOWED_CHANNELS || mode === tabs.FOLLOWED_STREAMS) {
        refresh.classList.add('icon--inactive');
    } else {
        refresh.classList.remove('icon--inactive');
        // fixme
        // refresh.firstElementChild.textContent = browser.i18n.getMessage('refreshTip');
    }

    if (!noScroll) searchBox.value = results[index].filter;

    filterContent(noScroll);
};

const callApi = (endpoint, opts = {}, newIndex, reset) => {
    // we dont have endpoint when we change popup mode and all content gets removed
    // scroll handler fires and results is reset to default values
    if (! endpoint) return;

    refresh.classList.add('thinking');
    searchBox.placeholder = browser.i18n.getMessage('loading');
    saveTabState();

    bp.callApi(endpoint, opts, newIndex, reset)
        .then(() => {
            console.log('done popup');

        })
        .catch(error => {
            console.log('popup callApi error', error);
            // show error screen
        })
        .finally(() => {
            refresh.classList.remove('thinking');
            searchBox.value = '';
            updatePage();
        })
}

const saveTabState = () => {
    bp.saveTabState(searchBox.value, contentArea.scrollTop);
}

const cardClickHandler = (e) => {
    const trigger = e.target.dataset['trigger'];
    if (! trigger) return;

    const topElem = UI.getParentElement(e.target, 'media-object');

    const meta = {
        type: topElem.dataset['type'],
        id: topElem.dataset['id'],
        streamerId: parseInt(topElem.dataset['streamerId']),
        name: topElem.dataset['name'],
        game: topElem.dataset['game'],
        gameId: topElem.dataset['gameId'],
    }

    switch (trigger) {
        case 'openStream':
            if (meta.type === 'video') {
                utils.openVideo(meta.id);
            }
            else if (meta.type === 'clip') {
                utils.openClip(meta.id);
            }
            else {
                utils.openStream(meta.name);
            }
            break;
        case 'openGame':
            utils.openGameDirectory(meta.game);
            break;
        case 'openStreamPopout':
            utils.openStreamPopout(meta.name);
            break;
        case 'openChat':
            utils.openChatPopout(meta.name);
            break;
        case 'enlarge':
            enlarge(topElem);
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
            callApi(endpoints.GET_VIDEOS, { user_id: meta.streamerId }, true);
            break;
        case 'browseClipsByChannel':
            callApi(endpoints.GET_CLIPS, {
                broadcaster_id: meta.streamerId,
                started_at: (new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).toISOString()
            }, true);
            break;
        case 'browseGame':
            callApi(endpoints.GET_STREAMS, { game_id: meta.gameId }, true);
            break;
        case 'browseVideosByGame':
            callApi(endpoints.GET_VIDEOS, { game_id: meta.gameId, period: 'month' }, true);
            break;
        case 'browseClipsByGame':
            callApi(endpoints.GET_CLIPS, { game_id: meta.gameId }, true);
            break;
    }
}

/**
 * Update the current selected tab and the mode
 *
 * @param newMode
 */
const updateTab = (newMode) => {
    // console.log("updateTab");
    mode = bp.getMode();

    let results = bp.getResults();
    let index = bp.getIndex();

    if (newMode) {
        if (document.getElementById(newMode).classList.contains('noAccess')) {
            // The mode we are trying to switch to is not allowed
            return;
        }
        document.getElementById(mode).classList.remove('tab--selected');
        setMode(newMode);
    }

    document.getElementById(mode).classList.add('tab--selected');
    while (mediaContainer.hasChildNodes()) {
        mediaContainer.removeChild(mediaContainer.firstChild);
    }

    if (mode === tabs.ABOUT) {
        // Show the about page
        const about = document.getElementById('about-page').cloneNode(true);
        about.id = '';
        contentArea.appendChild(about);
        searchBar.classList.add('hide');
    } else {
        // Show the content area
        contentArea.classList.remove('hide');
        searchBar.classList.remove('hide');

        if (index === 0) {
            // Tell the Twitch API to find us the information we want
            if (mode === tabs.GAMES) {
                if (results[index].content.length < 1) {
                    callApi(endpoints.GET_TOP_GAMES);
                } else updatePage();
            }
            else if (mode === tabs.STREAMS) {
                if (results[index].content.length < 1) {
                    callApi(endpoints.GET_STREAMS);
                } else updatePage();
            }
            else if (mode === tabs.SEARCH) {
                updatePage();
            }
            else if (mode === tabs.FOLLOWED_STREAMS) {
                index = 0;
                results = bp.defaultResults();
                results[index].content = bp.getUserFollowedStreams();
                results[index].type = 'stream';
                bp.setResults(results);
                updatePage();
            }
            else if (mode === tabs.FOLLOWED_CHANNELS) {
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

/**
 * Initializes the popup interface, essentially ensuring that all non-dynamic
 * content (streams, games, etc.) is properly displayed.
 * Includes internationalization, proper tooltips, etc.
 */
const initialize = () => {
    mode = bp.getMode();

    const user = bp.getAuthorizedUser();

    // Tooltips & avatar specific
    if (bp.getStorage('tooltips')) {
        document.getElementById('tooltips-stylesheet').href = 'tooltips.css';
        UI.fillTooltip(avatar, user.display_name);
    } else {
        avatar.title = user.display_name;
    }

    // Avatar
    avatar.style.backgroundImage = `url("${user.profile_image_url}")`;

    if (bp.getStorage('darkMode')) {
        document.documentElement.classList.add('__theme-dark');
    }

    // Select current tab
    document.getElementById(mode).classList.add('tab--selected');

    updateTab();
};

const selectTab = (e) => {
    if (e.target.classList.contains('tab') && e.target.id !== mode) {
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
        tab.addEventListener('click', selectTab);
    });

// Settings page
settings.addEventListener('click', () => browser.runtime.openOptionsPage());

// Back button
back.addEventListener('click', () => {
    if (back.classList.contains('icon--inactive')) return;
    saveTabState();
    bp.setIndex(bp.getIndex() - 1);
    updatePage();
});

// Forward button
forward.addEventListener('click', () => {
    if (forward.classList.contains('icon--inactive')) return;
    saveTabState();
    bp.setIndex(bp.getIndex() + 1);
    updatePage();
});

/**
 * Perform search
 */
const makeSearch = () => {
    if (search.classList.contains('icon--inactive') || !searchBox.value) return;

    if (mode === tabs.GAMES) {
        callApi(endpoints.SEARCH_GAMES, {
            query: searchBox.value,
        }, true);
    }
    // else if (mode === tabs.STREAMS) {
    //     callApi(endpoints.SEARCH_STREAMS, {
    //         query: searchBox.value,
    //     }, true);
    // }
    else if (mode === tabs.SEARCH) {
        callApi(endpoints.SEARCH_CHANNELS, {
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

    callApi(results[index].endpoint, results[index].opts, false, true);
});

// Exit search button
exitSearch.addEventListener('click', () => {
    if (exitSearch.classList.contains('icon--inactive')) return;
    bp.setResults(bp.defaultResults());
    bp.setIndex(0);
    updateTab();
});

// Avatar
avatar.addEventListener('click', () => {
    if (bp.getAuthorizedUser()) {
        utils.openStream(bp.getAuthorizedUser().name);
    }
});

// Login/logout
// login.addEventListener('click', () => {
//     if (bp.getAuthorizedUser()) {
//         bp.deauthorize();
//         initialize();
//         updatePage(true);
//     } else {
//         bp.authorize();
//     }
// });

const handleScrollEvent = (e) => {
    const scrollTop = contentArea.scrollTop;

    if (scrollTop && (contentArea.scrollHeight - scrollTop === contentArea.clientHeight)) {
        const results = bp.getResults();
        const index = bp.getIndex();

        callApi(results[index].endpoint, results[index].opts);
    }
}

contentArea.addEventListener('scroll', debounce(handleScrollEvent, 200, { maxWait: 200 }));

browser.runtime.onMessage.addListener((request) => {
    if (request.content === 'INITIALIZE') {
        initialize();
    }
});

initialize();

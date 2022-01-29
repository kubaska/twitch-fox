/* global browser */

import {endpoints, tabInfo, tabs} from "./contants";
import {makeCard, UI} from "./ui";
import utils from "./utils";
import {debounce} from "lodash";
import './css/popup.sass';

const bp = browser.extension.getBackgroundPage();

const login = document.getElementById('login');
const logout = document.getElementById('logout');

// Navigation
const back = document.getElementById('back');
const forward = document.getElementById('forward');
const searchBar = document.getElementById('navigation');
const search = document.getElementById('search');
const searchBox = document.getElementById('searchBox');
const favorites = document.getElementById('favorite');
const refresh = document.getElementById('refresh');
const exitSearch = document.getElementById('exitSearch');
const avatar = document.getElementById('avatar');

const mainContainer = document.getElementById('main-container');
const loginContainer = document.getElementById('login-container');
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

const filterContent = (noScroll, scrollPos) => {
    const filter = searchBox.value.toLowerCase();

    const tags = document.querySelectorAll('.media-container > .media-object[data-tag]');
    let hidden = 0;
    tags.forEach(element => {
        if (element.dataset['tag'].includes(filter)) {
            element.classList.remove('d-none');
        }
        else {
            element.classList.add('d-none');
            hidden += 1;
        }
    });

    if (! filter && ! noScroll) {
        contentArea.scrollTop = scrollPos;
    }

    // todo display svg or image in css class
    // add it to media-container when there is no results here
    // or results contentLength = 0
    if (tags.length - hidden === 0) {
        // contentArea.classList.add('no-results');
        if (document.getElementById('no-results')) return;
        const index = bp.getIndex();

        let noResults = document.createElement('div');
        noResults.id = 'no-results';
        noResults.classList.add('no-results');
        if (bp.getResultsContentLength()) {
            noResults.textContent = 'No results found.';
        } else if (index === 0 && mode === tabs.SEARCH) {
            noResults.textContent = 'Use the search bar above to search for channels on Twitch.';
        } else if (tabs.isFollowedTab(mode)) {
            noResults.textContent = 'No followed results found. Please wait for potential loading results.';
        } else {
            noResults.textContent = 'No search results found.';
        }

        mediaContainer.appendChild(noResults);
    }
    else {
        // contentArea.classList.remove('no-results');
        document.getElementById('no-results')?.remove();
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

    const favoriteMode = tabInfo[mode].favorites && bp.getStorage('favoritesMode');

    let cards = document.createDocumentFragment();

    for (let i = 0; i < results[index].content.length; i++) {
        const card = makeCard(bp, favoriteMode, results[index].type, results[index].content[i]);
        if (! card) continue;
        card.addEventListener('click', cardClickHandler);
        cards.appendChild(card);
    }

    mediaContainer.appendChild(cards);

    // Add correct content CSS class to size content,
    // but only if there is something to display.
    if (results[index].content.length) {
        mediaContainer.className = 'media-container ' + results[index].type;
    }
    else mediaContainer.className = 'media-container';

    if (tabInfo[mode].apiSearchable) {
        // Adjust placeholder if there is content displayed.
        if (results[index].content.length) {
            searchBox.placeholder =
                `Search Twitch or filter ${utils.delimitNumber(mediaContainer.children.length)} results`;
        } else {
            searchBox.placeholder = 'Search Twitch';
        }

        search.classList.remove('icon--inactive');
    }
    else {
        searchBox.placeholder = `Filter ${utils.delimitNumber(mediaContainer.children.length)} results`;

        search.classList.add('icon--inactive');
    }

    back.classList[index > 0 ? 'remove' : 'add']('icon--inactive');
    forward.classList[(index < (results.length - 1)) ? 'remove' : 'add']('icon--inactive');
    exitSearch.classList[(index > 0 || index < (results.length - 1)) ? 'remove' : 'add']('icon--inactive');

    if (tabInfo[mode].favorites) {
        favorites.classList[bp.getStorage('favoritesMode') ? 'remove' : 'add']('icon--faded');
    }

    if (tabInfo[mode].refreshable) {
        refresh.classList.remove('icon--inactive');
    } else {
        refresh.classList.add('icon--inactive');
    }

    filterContent(noScroll, results[index].scroll);
};

const callApi = (endpoint, opts = {}, newIndex, reset) => {
    // we dont have endpoint when we change popup mode and all content gets removed
    // scroll handler fires and results is reset to default values
    if (! endpoint) return;

    refresh.classList.add('thinking');
    searchBox.placeholder = 'Loading... please wait';
    saveTabState();
    // todo: lock navigation for the duration of api call

    bp.callApi(endpoint, opts, newIndex, reset)
        .then(() => {
            // console.log('done popup');
        })
        .catch(error => {
            // console.log('popup callApi error', error);
            // show error screen
        })
        .finally(() => {
            refresh.classList.remove('thinking');
            searchBox.value = '';
            updatePage();
        });
}

const saveTabState = () => {
    bp.saveTabState(searchBox.value, contentArea.scrollTop);
}

const cardClickHandler = (e) => {
    const trigger = e.target.dataset['trigger'];

    if (! trigger) return;
    if (e.target.classList.contains('icon--inactive')) return;

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
            bp.follow(meta.streamerId)
                .then(() => { updatePage(true); });
            break;
        case 'unfollow':
            bp.unfollow(meta.streamerId)
                .then(() => { updatePage(true); });
            break;
        case 'favorite':
            bp.favorite(meta.streamerId)
                .then(() => { updatePage(true); });
            break;
        case 'unfavorite':
            bp.unfavorite(meta.streamerId)
                .then(() => { updatePage(true); });
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
            callApi(endpoints.GET_VIDEOS, { game_id: meta.gameId, period: 'month', sort: 'views' }, true);
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
    mode = bp.getMode();

    let index = bp.getIndex();

    if (newMode) {
        document.getElementById(mode).classList.remove('tab--selected');
        setMode(newMode);
        document.getElementById(newMode).classList.add('tab--selected');
    }

    while (mediaContainer.hasChildNodes()) {
        mediaContainer.removeChild(mediaContainer.firstChild);
    }

    if (tabInfo[mode].staticContent) {
        const content = document.getElementById(tabInfo[mode].staticContent).cloneNode(true);
        content.id = '';
        mediaContainer.appendChild(content);
        mediaContainer.className = 'media-container';
        searchBar.classList.add('invisible');
        return;
    } else {
        contentArea.classList.remove('d-none');
        searchBar.classList.remove('invisible');
    }

    if (tabInfo[mode].favorites) {
        refresh.classList.add('d-none');
        favorites.classList.remove('d-none');
    } else {
        refresh.classList.remove('d-none');
        favorites.classList.add('d-none');
    }

    if (index !== 0) {
        return updatePage();
    }

    const endpoint = tabInfo[mode].endpoint;
    if (endpoint) {
        if (! bp.getResultsContentLength()) {
            callApi(endpoint);
        }
        else updatePage();
    }
    else {
        if (mode === tabs.SEARCH) {
            updatePage();
        }
        else if (mode === tabs.FOLLOWED_STREAMS) {
            bp.setResultsToFollowedStreams();
            updatePage();
        }
        else if (mode === tabs.FOLLOWED_CHANNELS) {
            bp.setResultsToFollowedChannels();
            updatePage();
        }
    }
};

/**
 * Initializes the popup interface, essentially ensuring that all non-dynamic
 * content (streams, games, etc.) is properly displayed.
 */
const initialize = () => {
    mode = bp.getMode();
    const user = bp.getAuthorizedUser();

    if (bp.getStorage('darkMode')) {
        document.documentElement.classList.add('__theme-dark');
    }

    if (! user) {
        loginContainer.classList.remove('d-none');
        mainContainer.classList.add('overflow-hidden');
        login.addEventListener('click', () => {
            bp.authorize();
            window.close();
        });
        return;
    }

    // Tooltips & avatar specific
    if (bp.getStorage('tooltips')) {
        document.getElementById('tooltips-stylesheet').href = 'tooltips.css';
        UI.fillTooltip(avatar, user.display_name);
    } else {
        avatar.title = user.display_name;
    }

    // Avatar
    avatar.style.backgroundImage = `url("${user.profile_image_url}")`;

    // Select current tab
    document.getElementById(mode).classList.add('tab--selected');

    updateTab();

    if (! document.body.classList.contains('__initialized')) {
        initializeEvents();
        document.body.classList.add('__initialized');
    }
};

const selectTab = (e) => {
    if (e.target.classList.contains('tab') && e.target.id !== mode) {
        bp.resetResults();
        updateTab(e.target.id);
    }
}

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
    else if (mode === tabs.SEARCH) {
        callApi(endpoints.SEARCH_CHANNELS, {
            query: searchBox.value,
        }, true);
    }
};

const handleScrollEvent = (e) => {
    const scrollTop = contentArea.scrollTop;

    if (scrollTop && (contentArea.scrollHeight - scrollTop === contentArea.clientHeight)) {
        const results = bp.getResults();
        const index = bp.getIndex();

        callApi(results[index].endpoint, results[index].opts);
    }
}

/*
  Click events
*/
const initializeEvents = () => {
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

    // Search button
    search.addEventListener('click', makeSearch);

    // Enter key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') makeSearch();
    });

    // Search box
    searchBox.addEventListener('input', filterContent);

    // Favorites switch
    favorites.addEventListener('click', () => {
        bp.setStorage('favoritesMode', ! bp.getStorage('favoritesMode'))
            .then(() => { updatePage(); });
    });

    // Refresh button
    refresh.addEventListener('click', () => {
        const results = bp.getResults();
        const index = bp.getIndex();

        callApi(results[index].endpoint, results[index].opts, false, true);
    });

    // Exit search button
    exitSearch.addEventListener('click', () => {
        if (exitSearch.classList.contains('icon--inactive')) return;
        bp.resetResults();
        updateTab();
    });

    // Avatar
    avatar.addEventListener('click', () => {
        utils.openStream(bp.getAuthorizedUser().login);
    });

    logout.addEventListener('click', () => {
        bp.deauthorize();
        initialize();
    })

    contentArea.addEventListener('scroll', debounce(handleScrollEvent, 200, { maxWait: 200 }));

    browser.runtime.onMessage.addListener((request) => {
        if (request.content === 'INITIALIZE') {
            initialize();
        }
    });
}

initialize();

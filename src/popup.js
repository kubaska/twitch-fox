/* global browser */

import {endpointList, endpoints, EResultState, ERuntimeMessage, tabInfo, tabs} from "./constants";
import {makeCardTemplate, makeNoResultsMessageTemplate, makeStaticContent, UI} from "./ui";
import utils from "./utils";
import {html, render} from "lit-html";
import {debounce} from "lodash-es";
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

const getSearchBoxPlaceholderText = (currentIndex) => {
    if (currentIndex === 0 && tabInfo[mode].apiSearchable) {
        if (mediaContainer.children.length) {
            return `Search Twitch or filter ${utils.delimitNumber(mediaContainer.querySelectorAll('.media-object').length)} results`;
        }
        else return 'Search Twitch';
    }
    else {
        return `Filter ${utils.delimitNumber(mediaContainer.querySelectorAll('.media-object').length)} results`;
    }
}

const callApi = (endpoint, opts = {}, newIndex, reset) => {
    // we dont have endpoint when we change popup mode and all content gets removed
    // scroll handler fires and results is reset to default values
    if (! endpoint) return;

    saveTabState();

    bp.callApi(endpoint, opts, newIndex, reset)
        .then(() => {
            // console.log('done popup');
            renderPage();
        })
        .catch(error => {
            // console.log('popup callApi error', error);
            if (error.message === 'cancelled') return;
            // TODO show error screen
        });

    renderPage(true);
}

const handleFollowedVideosTab = (forceRefresh = false) => {
    bp.setResultsToFollowedTab(tabs.FOLLOWED_VIDEOS);

    if (forceRefresh || ! bp.getResultsContentLength()) {
        // No results cached, update immediately
        renderLoading(true, true);
        bp.fetchFollowedVideos().then(() => {
            bp.setResultsToFollowedTab(tabs.FOLLOWED_VIDEOS);
            renderPage();
        });
    } else {
        renderPage(true);
    }
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
        gameId: parseInt(topElem.dataset['gameId']),
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
        case 'openPopout':
            if (meta.type === 'video') {
                utils.openPopout('video', meta.id);
            }
            else if (meta.type === 'clip') {
                utils.openPopout('clip', meta.id);
            }
            else {
                utils.openPopout('channel', meta.name);
            }
            break;
        case 'openChat':
            utils.openChatPopout(meta.name);
            break;
        case 'enlarge':
            enlarge(topElem);
            break;
        case 'followGame':
            bp.followGame(meta.gameId)
                .then(() => { renderPage(); });
            break;
        case 'unfollowGame':
            bp.unfollowGame(meta.gameId)
                .then(() => { renderPage(); });
            break;
        case 'follow':
            bp.follow(meta.streamerId)
                .then(() => { renderPage(); });
            break;
        case 'unfollow':
            bp.unfollow(meta.streamerId)
                .then(() => { renderPage(); });
            break;
        case 'favorite':
            bp.favorite(meta.streamerId)
                .then(() => { renderPage(); });
            break;
        case 'unfavorite':
            bp.unfavorite(meta.streamerId)
                .then(() => { renderPage(); });
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

const renderLoading = (state = false, shouldRerender = false) => {
    if (state) {
        refresh.classList.add('thinking');
        searchBox.placeholder = 'Loading... please wait';
        if (shouldRerender) render(html`<div class="media-object__message"><h2>Loading!</h2></div>`, mediaContainer);
    } else {
        refresh.classList.remove('thinking');
    }
}

const renderPage = (firstPaint = false) => {
    mediaContainer.className = 'media-container';

    if (tabInfo[mode].staticContent) {
        render(makeStaticContent(mode), mediaContainer);
        searchBar.classList.add('invisible');
        return;
    }
    else {
        contentArea.classList.remove('d-none');
        searchBar.classList.remove('invisible');
    }

    const index = bp.getIndex();
    const results = bp.getResults();

    if (tabInfo[mode].favorites && index === 0) {
        refresh.classList.add('d-none');
        favorites.classList.remove('d-none');
    } else {
        refresh.classList.remove('d-none');
        favorites.classList.add('d-none');
    }

    const favoriteMode = tabInfo[mode].favorites && index === 0 && results[index].type !== 'game' && bp.getStorage('favoritesMode');

    // Add correct content CSS class to size content, but only if there is something to display.
    if (results[index].content.length)
        mediaContainer.classList.add(results[index].type);

    if (index === 0 && tabInfo[mode].apiSearchable) {
        search.classList.remove('icon--inactive');
    }
    else {
        search.classList.add('icon--inactive');
    }

    back.classList[index > 0 ? 'remove' : 'add']('icon--inactive');
    forward.classList[(index < (results.length - 1)) ? 'remove' : 'add']('icon--inactive');
    if (firstPaint) searchBox.value = results[index].filter;
    exitSearch.classList[searchBox.value !== '' || (index > 0 || index < (results.length - 1)) ? 'remove' : 'add']('icon--inactive');
    exitSearch[(index > 0 || index < (results.length - 1)) ? 'setAttribute' : 'removeAttribute']('exitable', 'exitable');

    if (tabInfo[mode].favorites) {
        favorites.classList[bp.getStorage('favoritesMode') ? 'remove' : 'add']('icon--faded');
    }

    // Disallow refreshing on always empty search tab
    // and allow only when tab is refreshable or results are refreshable
    if (!(mode === tabs.SEARCH && index === 0) &&
        (tabInfo[mode].refreshable || (results[index].endpoint && endpointList[results[index].endpoint].contentType))
    ) {
        refresh.classList.remove('icon--inactive');
    } else {
        refresh.classList.add('icon--inactive');
    }

    if (results[index].state === EResultState.LOADING) {
        return renderLoading(true, results[index].content.length === 0);
    }
    else renderLoading(false);

    const streamerIdKey = results[index].type === 'channel' ? 'id' : (results[index].type === 'clip' ? 'broadcaster_id' : 'user_id');
    const shouldRenderAvatars = (bp.getStorage('showAvatarsFollowed') && mode === tabs.FOLLOWED_STREAMS)
                             || (bp.getStorage('showAvatars') && mode !== tabs.FOLLOWED_STREAMS);
    const previewQuality = bp.getStorage('previewQuality');

    let resultsToRender = results[index].content;
    if (searchBox.value)
        resultsToRender = resultsToRender.filter(result => result.__tag.toLowerCase().includes(searchBox.value.toLowerCase()));
    if (favoriteMode)
        resultsToRender = resultsToRender.filter(result => bp.isFavorite(parseInt(result[streamerIdKey])));

    if (resultsToRender.length) {
        render(
            html`${resultsToRender.map(result => makeCardTemplate(result, results[index].type, shouldRenderAvatars, previewQuality, bp, cardClickHandler))}`,
            mediaContainer
        );
    } else {
        render(makeNoResultsMessageTemplate(mode, index, searchBox.value !== ''), mediaContainer);
    }

    searchBox.placeholder = getSearchBoxPlaceholderText(index);
    if (firstPaint) contentArea.scrollTop = results[index].scroll;
}

/**
 * Update the current selected tab and the mode
 *
 * @param newMode
 */
const updateTab = (newMode) => {
    mode = bp.getMode();

    if (newMode) {
        document.getElementById(mode).classList.remove('tab--selected');
        setMode(newMode);
        document.getElementById(newMode).classList.add('tab--selected');
    }

    if (mode === tabs.FOLLOWED_VIDEOS) {
        return handleFollowedVideosTab();
    }

    if (bp.getIndex() !== 0) {
        return renderPage(true);
    }

    const endpoint = tabInfo[mode].endpoint;
    if (endpoint && ! bp.getResultsContentLength()) {
        return callApi(endpoint);
    }

    renderPage(true);
    mediaContainer.focus();
};

/**
 * Initializes the popup interface, essentially ensuring that all non-dynamic
 * content (streams, games, etc.) is properly displayed.
 */
const initialize = () => {
    mode = bp.getMode();
    bp.setResultsToFollowedTab(mode);
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
        document.getElementById('tooltips-stylesheet').href = 'css/tooltips.css';
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
        if (document.location.href.endsWith('popup=true')) {
            document.body.classList.add('is-popup');

            const size = bp.getStorage('popupSize');
            if (size === 2) document.body.classList.add('size-big');
            if (size === 0) document.body.classList.add('size-small');
        }
    }
};

const selectTab = (e) => {
    if (e.target.classList.contains('tab') && e.target.id !== mode) {
        bp.resetResults();
        searchBox.value = '';
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
        renderPage(true);
    });

    // Forward button
    forward.addEventListener('click', () => {
        if (forward.classList.contains('icon--inactive')) return;
        saveTabState();
        bp.setIndex(bp.getIndex() + 1);
        renderPage(true);
    });

    // Search button
    search.addEventListener('click', makeSearch);

    // Enter key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') makeSearch();
    });

    // Search box
    searchBox.addEventListener('input', () => {
        renderPage();
    });

    // Favorites switch
    favorites.addEventListener('click', () => {
        bp.setStorage('favoritesMode', ! bp.getStorage('favoritesMode'))
            .then(() => { renderPage(); });
    });

    // Refresh button
    refresh.addEventListener('click', () => {
        if (refresh.classList.contains('icon--inactive')) return;

        if (mode === tabs.FOLLOWED_VIDEOS) {
            return handleFollowedVideosTab(true);
        }

        bp.refreshResults().then(() => {
            renderPage();
        });

        renderPage();
    });

    // Exit search button
    exitSearch.addEventListener('click', () => {
        if (exitSearch.classList.contains('icon--inactive')) return;

        if (searchBox.value) {
            searchBox.value = '';

            return renderPage();
        }

        bp.resetResultsToZeroIndex();
        updateTab();
    });

    // Avatar
    avatar.addEventListener('click', () => {
        utils.openStream(bp.getAuthorizedUser().login);
    });

    logout.addEventListener('click', () => {
        bp.deauthorize();
        initialize();
    });

    contentArea.addEventListener('scroll', debounce(handleScrollEvent, 200, { maxWait: 200 }));

    window.addEventListener('blur', () => {
        bp._storage().saveDeferred();
        saveTabState();
    });

    browser.runtime.onMessage.addListener(request => {
        switch (request.content) {
            case ERuntimeMessage.INITIALIZE:
                return initialize();
            case ERuntimeMessage.NEW_FOLLOWED_STREAMS:
                if (mode === tabs.FOLLOWED_STREAMS && bp.getIndex() === 0) {
                    bp.setResultsToFollowedTab(mode);
                    return renderPage(false);
                }
                break;
        }
    });
}

initialize();

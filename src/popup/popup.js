/*
  Build the user interface, including streams, games, clips, videos, and their
  followed equivalents.
  Use the Twitch API to perform searches
  Allow the user to authorize and deauthorize their account with Twitch
*/

// Disable if bp is non-existent
// if (!bp) browser.browserAction.disable();
// Just kidding this also disables it on non-private windows

const bp = browser.extension.getBackgroundPage();

const {
    version,
} = browser.runtime.getManifest();
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
const aboutPage = document.getElementById('aboutPage');
const aboutWhatsNewButton = document.getElementById('aboutWhatsNewButton');
const aboutTellMoreButton = document.getElementById('aboutTellMoreButton');
const addonPage = document.getElementById('addonPage');
const githubPage = document.getElementById('githubPage');
const steamPage = document.getElementById('steamPage');
const screenLock = document.getElementById('screenLock');

let enlargedPreview = document.getElementById('enlargedPreview');
let enlargedContent = '';
let newEnlarged;
let oldEnlarged;

let mode;
let showNewUser;
let showWhatsNew;

const delimitNumber = (num = 0) => num.toString().replace(
    /\B(?=(\d{3})+(?!\d))/g,
    browser.i18n.getMessage('delimiter'),
);

const setMode = (newMode) => {
    /*
      Set the mode in both the script and the storage
    */
    mode = newMode;
    bp.setStorage('mode', newMode);
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
        refresh.classList.remove('refresh');
        refresh.classList.add('favorites');
        refresh.classList[bp.getStorage('favoritesMode') ?
            'add' : 'remove']('possible');
        refresh.firstElementChild.textContent =
            browser.i18n.getMessage(refresh.classList.contains('possible') ?
                'allFollowsTip' : 'favoritesTip');
    } else {
        refresh.classList.remove('favorites');
        refresh.classList.add('refresh');
        refresh.classList.add('possible');
        refresh.firstElementChild.textContent =
            browser.i18n.getMessage('refreshTip');
    }

    if (!noScroll) searchBox.value = results[index].filter;

    filterContent(noScroll);
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

const followApi = (endpoint, channel) => {
    if (bp.getAuthorizedUser()) {
        refresh.classList.add('thinking');
        bp.twitchAPI(endpoint, {
            _id: String(channel._id),
        }, () => {
            // Temporarily follow/unfollow
            refresh.classList.remove('thinking');
            if (endpoint === 'Follow Channel') bp.follow(channel);
            else if (endpoint === 'Unfollow Channel') bp.unfollow(channel);
        });
    } else if (bp.getStorage('nonTwitchFollows')) {
        if (endpoint === 'Follow Channel') bp.follow(channel);
        else if (endpoint === 'Unfollow Channel') bp.unfollow(channel);
    }
};

addCard = (content, type) => {
    if (type === 'game') {
        const game = content.game ? content.game : content;
        const id = `GAME!${game._id}`;
        if (document.getElementById(id)) {
            return;
        }
        const contentDiv = document.createElement('div');
        contentDiv.classList.add('content', 'game');
        contentDiv.id = id;

        const contentBack = document.createElement('div');
        contentBack.classList.add('contentBack', 'game');
        contentBack.style.backgroundImage = `url("${game.box.medium}")`;
        contentDiv.appendChild(contentBack);

        const hoverBack = document.createElement('div');
        hoverBack.classList.add('hoverBack', 'game');
        contentBack.appendChild(hoverBack);

        const hideUntilHover = document.createElement('div');
        hideUntilHover.classList.add('hideUntilHover');
        contentBack.appendChild(hideUntilHover);

        const clickBack = document.createElement('div');
        clickBack.classList.add('clickBack', 'game');

        addTooltip(clickBack).textContent =
            browser.i18n.getMessage('gameStreamsTip', game.name);

        hideUntilHover.appendChild(clickBack);

        contentBack.addEventListener('click', (e) => {
            if (e.target.classList.contains('clickBack') ||
                e.target.parentElement.classList.contains('clickBack')) {
                // Get Live Streams
                getApiResults('Get Live Streams', {
                    game: game.name,
                }, true);
            }
        });

        const twitchButton = document.createElement('div');
        twitchButton.classList.add('contentButton', 'bottom', 'game', 'twitch');
        twitchButton.addEventListener('click', () => {
            const url = `https://www.twitch.tv/directory/game/${game.name}`;
            browser.tabs.create({
                url,
            });
        });
        addTooltip(twitchButton).textContent =
            browser.i18n.getMessage('openTwitchPageTip');
        hideUntilHover.appendChild(twitchButton);

        /* let streamsButton = document.createElement("div");
        streamsButton.classList.add(
          "contentButton", "side", "game", "smallStreams");
        streamsButton.addEventListener("click", () => {
          //Get Live Streams
          getApiResults("Get Live Streams", {
            game: game.name
          }, true);
        })
        addTooltip(streamsButton).textContent = browser.i18n.getMessage(
          "gameStreamsTip", game.name);
        hideUntilHover.appendChild(streamsButton); */

        const videosButton = document.createElement('div');
        videosButton.classList.add('contentButton', 'side', 'game', 'smallVideos');
        videosButton.addEventListener('click', () => {
            // Get Top Videos
            getApiResults('Get Top Videos', {
                game: game.name,
            }, true);
        });
        addTooltip(videosButton).textContent =
            browser.i18n.getMessage('gameVideosTip', game.name);
        hideUntilHover.appendChild(videosButton);

        const clipsButton = document.createElement('div');
        clipsButton.classList.add('contentButton', 'side', 'game', 'smallClips');
        clipsButton.addEventListener('click', () => {
            // Get Top Clips
            getApiResults('Get Top Clips', {
                game: game.name,
            }, true);
        });
        addTooltip(clipsButton).textContent =
            browser.i18n.getMessage('gameClipsTip', game.name);
        hideUntilHover.appendChild(clipsButton);

        const gameTitle = document.createElement('span');
        gameTitle.classList.add('gameTitle');
        contentDiv.appendChild(gameTitle);

        const bottomTextTop = document.createElement('div');
        bottomTextTop.classList.add('bottomText', 'gameTop');
        bottomTextTop.textContent = game.name;
        gameTitle.appendChild(bottomTextTop);
        addTooltip(gameTitle, true).textContent = game.name;

        if (content.viewers) {
            const bottomTextBottom = document.createElement('div');
            bottomTextBottom.classList.add('bottomText', 'gameBottom');
            bottomTextBottom.textContent = browser.i18n.getMessage(
                'viewersOnGame',
                delimitNumber(content.viewers),
            );
            contentDiv.appendChild(bottomTextBottom);
        }

        const tag = document.createElement('span');
        tag.classList.add('tag');
        tag.textContent = game.name;
        contentDiv.appendChild(tag);
        contentArea.appendChild(contentDiv);
    } else if (type === 'stream') {
        const id = `STREAM!${content._id}`;
        if (document.getElementById(id) || (mode === 'followedStreams' &&
            bp.getStorage('favoritesMode') &&
            bp.getStorage('favorites').indexOf(String(content.channel._id)) <
            0)) {
            return;
        }
        const contentDiv = document.createElement('div');
        contentDiv.classList.add('content', 'stream');
        contentDiv.id = id;

        const contentBack = document.createElement('div');
        contentBack.classList.add('contentBack', 'stream');
        contentBack.style.backgroundImage =
            `url("${content.preview.large}")`;
        contentDiv.appendChild(contentBack);

        const hoverBack = document.createElement('div');
        hoverBack.classList.add('hoverBack', 'stream');
        contentBack.appendChild(hoverBack);

        const status = document.createElement('div');
        status.classList.add('status', 'stream');
        status.textContent = content.channel.status;
        contentBack.appendChild(status);

        const hideUntilHover = document.createElement('div');
        hideUntilHover.classList.add('hideUntilHover');
        contentBack.appendChild(hideUntilHover);

        if (bp.getStorage('openTwitchPage') ||
            bp.getStorage('openPopout') || bp.getStorage('openChat')) {
            const clickBack = document.createElement('div');
            clickBack.classList.add('clickBack', 'stream');

            addTooltip(clickBack).textContent =
                browser.i18n.getMessage('performActions');

            hideUntilHover.appendChild(clickBack);

            contentBack.addEventListener('click', (e) => {
                if (e.target.classList.contains('clickBack')) {
                    // Do the stuff
                    if (bp.getStorage('openTwitchPage')) {
                        bp.openTwitchPage(content.channel.url);
                    }
                    if (bp.getStorage('openPopout')) {
                        bp.openPopout(content.channel.name);
                    }
                    if (bp.getStorage('openChat')) {
                        bp.openChat(content.channel.name);
                    }
                }
            });
        }

        const createdAt = new Date(content.created_at);

        const uptimeMs = Date.now() - createdAt;
        let uptimeHr = Math.floor(uptimeMs / 3600000);
        let uptimeMin = Math.floor((uptimeMs - (uptimeHr * 3600000)) / 60000);
        let uptimeS = Math.floor((uptimeMs - (uptimeHr * 3600000) -
            (uptimeMin * 60000)) / 1000);
        uptimeMin = uptimeMin < 10 && uptimeHr > 0 ?
            `0${uptimeMin}` : uptimeMin;
        uptimeHr = uptimeHr > 0 ? `${uptimeHr}:` : uptimeHr;
        uptimeS = uptimeS < 10 ? `:0${uptimeS}` : `:${uptimeS}`;

        const uptime = document.createElement('div');
        uptime.classList.add('uptime');
        uptime.textContent = uptimeHr + uptimeMin + uptimeS;

        let hours = createdAt.getHours();
        let ampm = 'AM';
        if (hours > 12) {
            hours -= 12;
            ampm = 'PM';
        }
        let minutes = createdAt.getMinutes();
        minutes = minutes < 10 ? `0${minutes}` : minutes;
        let seconds = createdAt.getSeconds();
        seconds = seconds < 10 ? `0${seconds}` : seconds;

        const uptimeIcon = document.createElement('div');
        uptimeIcon.classList.add('uptimeIcon');
        addTooltip(uptimeIcon, true).textContent =
            browser.i18n.getMessage('streamUptimeTip', [
                createdAt.getMonth() + 1, createdAt.getDate(),
                createdAt.getFullYear(), hours, minutes, seconds, ampm,
            ]);

        uptime.appendChild(uptimeIcon);
        contentBack.appendChild(uptime);

        const twitchButton = document.createElement('div');
        twitchButton.classList.add('contentButton', 'bottom', 'stream', 'twitch');
        twitchButton.addEventListener('click', () => {
            const {
                url,
            } = content.channel;
            browser.tabs.create({
                url,
            });
        });
        addTooltip(twitchButton).textContent =
            browser.i18n.getMessage('openTwitchPageTip');
        hideUntilHover.appendChild(twitchButton);

        const popoutButton = document.createElement('div');
        popoutButton.classList.add('contentButton', 'bottom', 'stream', 'popout');
        popoutButton.addEventListener('click', () => {
            browser.windows.create({
                url: `http://player.twitch.tv/?channel=${content.channel.name}`,
                height: 500,
                width: 850,
                type: 'popup',
            });
        });

        addTooltip(popoutButton).textContent =
            browser.i18n.getMessage('openPopooutTip');
        hideUntilHover.appendChild(popoutButton);

        const chatButton = document.createElement('div');
        chatButton.classList.add('contentButton', 'bottom', 'stream', 'chat');
        chatButton.addEventListener('click', () => {
            browser.windows.create({
                url: `http:/twitch.tv/${content.channel.name}/chat?popout`,
                height: 600,
                width: 340,
                type: 'popup',
            });
        });
        addTooltip(chatButton).textContent =
            browser.i18n.getMessage('openChatTip', content.channel.display_name);
        hideUntilHover.appendChild(chatButton);

        const enlargeButton = document.createElement('div');
        enlargeButton.classList.add('contentButton', 'bottom', 'stream', 'enlarge');
        enlargeButton.addEventListener(
            'click',
            () => enlarge(contentDiv, contentBack, content.preview.large),
        );
        addTooltip(enlargeButton).textContent =
            browser.i18n.getMessage('enlargeTip');
        hideUntilHover.appendChild(enlargeButton);

        const followed =
            bp.getUserFollowIDs().indexOf(String(content.channel._id)) > -1;

        const favoriteButton = document.createElement('div');
        const favorited =
            bp.getStorage('favorites').indexOf(String(content.channel._id)) >
            -1;
        favoriteButton.classList.add(
            'contentButton', 'bottom', 'stream',
            favorited ? 'unfavorite' : 'favorite',
        );
        if (!followed) favoriteButton.classList.add('noAccess');
        else {
            favoriteButton.addEventListener('click', () => {
                if (favorited) {
                    bp.unfavorite(String(content.channel._id), updatePage);
                } else {
                    bp.favorite(String(content.channel._id), updatePage);
                }
            });
        }
        const favoriteTip = favorited ? 'unfavoriteTip' : 'favoriteTip';
        addTooltip(favoriteButton).textContent = browser.i18n.getMessage(followed ?
            favoriteTip : 'cantFavoriteTip', content.channel.display_name);
        hideUntilHover.appendChild(favoriteButton);

        const followButton = document.createElement('div');
        followButton.classList.add(
            'contentButton', 'bottom', 'stream',
            followed ? 'unfollow' : 'follow',
        );
        if (!bp.getAuthorizedUser() &&
            !bp.getStorage('nonTwitchFollows')) {
            followButton.classList.add('noAccess');
        } else {
            followButton.addEventListener('click', () => {
                if (followed) followApi('Unfollow Channel', content.channel);
                else followApi('Follow Channel', content.channel);
            });
        }
        const followTip = followed ? 'unfollowTip' : 'followTip';
        addTooltip(followButton).textContent =
            browser.i18n.getMessage(followButton.classList.contains('noAccess') ?
                'noAccessTip' : followTip, content.channel.display_name);

        hideUntilHover.appendChild(followButton);

        const videosButton = document.createElement('div');
        videosButton.classList.add(
            'contentButton', 'side',
            'stream', 'smallVideos',
        );
        videosButton.addEventListener('click', () => {
            // Get Channel Videos
            getApiResults('Get Channel Videos', {
                _id: content.channel._id,
            }, true);
        });
        addTooltip(videosButton).textContent =
            browser.i18n.getMessage('channelVideosTip', content.channel.display_name);
        hideUntilHover.appendChild(videosButton);

        const clipsButton = document.createElement('div');
        clipsButton.classList.add('contentButton', 'side', 'stream', 'smallClips');
        clipsButton.addEventListener('click', () => {
            // Get Top Clips in channel
            getApiResults('Get Top Clips', {
                channel: content.channel.name,
            }, true);
        });
        addTooltip(clipsButton).textContent =
            browser.i18n.getMessage('channelClipsTip', content.channel.display_name);
        hideUntilHover.appendChild(clipsButton);

        if (content.game) {
            const cornerGame = document.createElement('div');
            cornerGame.classList.add('cornerGame');
            cornerGame.style.backgroundImage =
                `url("https://static-cdn.jtvnw.net/ttv-boxart/${content.game
                }-52x72.jpg")`;

            addTooltip(cornerGame, true).textContent =
                bp.getStorage('tooltips') ?
                    browser.i18n.getMessage('gameStreamsTip', content.game) :
                    content.game;
            cornerGame.addEventListener('click', () => {
                // Get Live Streams
                getApiResults('Get Live Streams', {
                    game: content.game,
                }, true);
            });

            contentDiv.appendChild(cornerGame);
        }

        if (bp.getStorage('showLogos')) {
            const cornerLogo = document.createElement('div');
            cornerLogo.classList.add('cornerLogo');
            cornerLogo.style.backgroundImage =
                `url("${content.channel.logo}")`;
            addTooltip(cornerLogo).textContent =
                browser.i18n.getMessage('channelLogo', content.channel.display_name);
            contentDiv.appendChild(cornerLogo);
        }

        const displayName = document.createElement('span');
        displayName.classList.add('displayName');
        contentDiv.appendChild(displayName);

        const bottomText = document.createElement('div');
        bottomText.classList.add('bottomText', 'stream');
        bottomText.textContent =
            browser.i18n.getMessage('viewersOn', [
                delimitNumber(content.viewers), content.channel.display_name,
            ]);
        displayName.appendChild(bottomText);

        const name = content.channel.name ===
        content.channel.display_name.toLowerCase() ? '' :
            ` (${content.channel.name})`;
        addTooltip(displayName, true).textContent = content.channel.display_name +
            name;

        const tag = document.createElement('span');
        tag.classList.add('tag');
        tag.textContent = content.game + content.channel.display_name +
            content.channel.name + content.channel.status;
        contentDiv.appendChild(tag);
        contentArea.appendChild(contentDiv);
    } else if (type === 'video' || type === 'clip') {
        let id = type === 'video' ? content._id : content.tracking_id;
        id = type === 'video' ? `VIDEO!${id}` : `CLIP!${id}`;
        if (document.getElementById(id)) {
            return;
        }
        const contentDiv = document.createElement('div');
        contentDiv.classList.add('content', 'stream');
        contentDiv.id = id;

        const contentBack = document.createElement('div');
        contentBack.classList.add('contentBack', 'stream');
        const backImage = type === 'video' ? content.preview.large :
            content.thumbnails.medium;
        contentBack.style.backgroundImage =
            `url("${backImage}")`;
        contentDiv.appendChild(contentBack);

        const hoverBack = document.createElement('div');
        hoverBack.classList.add('hoverBack', 'stream');
        contentBack.appendChild(hoverBack);

        const title = document.createElement('div');
        title.classList.add('status', 'stream');
        title.textContent = content.title;
        contentBack.appendChild(title);

        const hideUntilHover = document.createElement('div');
        hideUntilHover.classList.add('hideUntilHover');
        contentBack.appendChild(hideUntilHover);

        let seconds = type === 'video' ? content.length : content.duration;
        let hours = Math.floor(seconds / 3600);
        let minutes = Math.floor((seconds % 3600) / 60);
        seconds = Math.floor(seconds % 3600 % 60);

        minutes = minutes < 10 && hours > 0 ? `0${minutes}` : minutes;
        seconds = seconds < 10 ? `0${seconds}` : seconds;

        hours = hours < 1 ? '' : `${hours}:`;

        const uptime = document.createElement('div');
        uptime.classList.add('uptime');
        uptime.textContent = `${hours + minutes}:${seconds}`;

        const createdAt = new Date(content.created_at);

        hours = createdAt.getHours();
        let ampm = 'AM';
        if (hours > 12) {
            hours -= 12;
            ampm = 'PM';
        }
        minutes = createdAt.getMinutes();
        minutes = minutes < 10 ? `0${minutes}` : minutes;
        seconds = createdAt.getSeconds();
        seconds = seconds < 10 ? `0${seconds}` : seconds;

        const uptimeIcon = document.createElement('div');
        uptimeIcon.classList.add('uptimeIcon');
        addTooltip(uptimeIcon, true).textContent =
            browser.i18n.getMessage('durationTip', [createdAt.getMonth() + 1,
                createdAt.getDate(), createdAt.getFullYear(), hours, minutes, seconds,
                ampm,
            ]);
        uptime.appendChild(uptimeIcon);

        contentBack.appendChild(uptime);

        const chatButton = document.createElement('div');
        chatButton.classList.add(
            'contentButton', 'bottom', 'stream',
            'chat', 'hidden',
        );
        hideUntilHover.appendChild(chatButton);

        const twitchButton = document.createElement('div');
        twitchButton.classList.add('contentButton', 'bottom', 'stream', 'twitch');
        twitchButton.addEventListener('click', () => {
            const {
                url,
            } = content;
            browser.tabs.create({
                url,
            });
        });
        addTooltip(twitchButton).textContent =
            browser.i18n.getMessage('openTwitchPageTip');
        hideUntilHover.appendChild(twitchButton);

        const popoutButton = document.createElement('div');
        popoutButton.classList.add('contentButton', 'bottom', 'stream', 'popout');
        popoutButton.addEventListener('click', () => {
            browser.windows.create({
                url: type === 'video' ?
                    `http://player.twitch.tv/?video=${content._id}` : content.embed_url,
                height: 500,
                width: 850,
                type: 'popup',
            });
        });

        addTooltip(popoutButton).textContent =
            browser.i18n.getMessage('openPopooutTip');
        hideUntilHover.appendChild(popoutButton);

        const enlargeButton = document.createElement('div');
        enlargeButton.classList.add('contentButton', 'bottom', 'stream', 'enlarge');
        enlargeButton.addEventListener(
            'click',
            () => enlarge(contentDiv, contentBack, backImage),
        );
        addTooltip(enlargeButton).textContent =
            browser.i18n.getMessage('enlargeTip');
        hideUntilHover.appendChild(enlargeButton);

        const thisChannel =
            type === 'video' ? content.channel : content.broadcaster;

        const followed =
            bp.getUserFollowIDs().indexOf(String(thisChannel._id)) > -1;

        const favoriteButton = document.createElement('div');
        const favorited =
            bp.getStorage('favorites').indexOf(String(thisChannel._id)) > -1;
        favoriteButton.classList.add(
            'contentButton', 'bottom', 'stream',
            favorited ? 'unfavorite' : 'favorite',
        );
        if (!followed) favoriteButton.classList.add('noAccess');
        else {
            favoriteButton.addEventListener('click', () => {
                if (favorited) {
                    bp.unfavorite(String(thisChannel._id), updatePage);
                } else bp.favorite(String(thisChannel._id), updatePage);
            });
        }
        const favoriteTip = favorited ? 'unfavoriteTip' : 'favoriteTip';
        addTooltip(favoriteButton).textContent =
            browser.i18n.getMessage(
                followed ? favoriteTip : 'cantFavoriteTip',
                thisChannel.display_name,
            );
        hideUntilHover.appendChild(favoriteButton);

        const followButton = document.createElement('div');
        followButton.classList.add(
            'contentButton', 'bottom', 'stream',
            followed ? 'unfollow' : 'follow',
        );
        if (!bp.getAuthorizedUser() &&
            !bp.getStorage('nonTwitchFollows')) {
            followButton.classList.add('noAccess');
        } else {
            followButton.addEventListener('click', () => {
                if (followed) followApi('Unfollow Channel', thisChannel);
                else followApi('Follow Channel', thisChannel);
            });
        }
        const followTip = followed ? 'unfollowTip' : 'followTip';
        addTooltip(followButton).textContent =
            browser.i18n.getMessage(followButton.classList.contains('noAccess') ?
                'noAccessTip' : followTip, thisChannel.display_name);
        hideUntilHover.appendChild(followButton);

        const videosButton = document.createElement('div');
        videosButton.classList.add(
            'contentButton', 'side',
            'stream', 'smallVideos',
        );
        videosButton.addEventListener('click', () => {
            // Get Channel Videos
            getApiResults('Get Channel Videos', {
                _id: type === 'video' ? thisChannel._id : thisChannel.id,
            }, true);
        });
        addTooltip(videosButton).textContent =
            browser.i18n.getMessage('channelVideosTip', thisChannel.display_name);
        hideUntilHover.appendChild(videosButton);

        const clipsButton = document.createElement('div');
        clipsButton.classList.add('contentButton', 'side', 'stream', 'smallClips');
        clipsButton.addEventListener('click', () => {
            // Get Top Clips in channel
            getApiResults('Get Top Clips', {
                channel: thisChannel.name,
            }, true);
        });
        addTooltip(clipsButton).textContent =
            browser.i18n.getMessage('channelClipsTip', thisChannel.display_name);
        hideUntilHover.appendChild(clipsButton);

        if (content.game) {
            const cornerGame = document.createElement('div');
            cornerGame.classList.add('cornerGame');
            cornerGame.style.backgroundImage =
                `url("https://static-cdn.jtvnw.net/ttv-boxart/${content.game
                }-52x72.jpg")`;
            addTooltip(cornerGame, true).textContent =
                bp.getStorage('tooltips') ?
                    browser.i18n.getMessage('gameStreamsTip', content.game) :
                    content.game;
            cornerGame.addEventListener('click', () => {
                // Get Live Streams
                getApiResults('Get Live Streams', {
                    game: content.game,
                }, true);
            });
            contentDiv.appendChild(cornerGame);
        }

        if (bp.getStorage('showLogos')) {
            const cornerLogo = document.createElement('div');
            cornerLogo.classList.add('cornerLogo');
            cornerLogo.style.backgroundImage =
                `url("${thisChannel.logo}")`;
            addTooltip(cornerLogo).textContent =
                browser.i18n.getMessage('channelLogo', thisChannel.display_name);
            contentDiv.appendChild(cornerLogo);
        }

        const displayName = document.createElement('span');
        displayName.classList.add('displayName');
        contentDiv.appendChild(displayName);

        const bottomText = document.createElement('div');
        bottomText.classList.add('bottomText', 'stream');
        bottomText.textContent = browser.i18n.getMessage('viewsOn', [
            delimitNumber(content.views), thisChannel.display_name,
        ]);
        displayName.appendChild(bottomText);
        const name = thisChannel.name === thisChannel.display_name.toLowerCase() ?
            '' : ` (${thisChannel.name})`;
        addTooltip(displayName, true).textContent = thisChannel.display_name +
            name;

        const tag = document.createElement('span');
        tag.classList.add('tag');
        tag.textContent = content.game + thisChannel.display_name +
            thisChannel.name + content.title;
        contentDiv.appendChild(tag);
        contentArea.appendChild(contentDiv);
    } else if (type === 'channel') {
        const channel = content.channel ? content.channel : content;
        const id = `CHANNEL!${channel._id}`;
        if (document.getElementById(id) || (mode === 'followedChannels' &&
            bp.getStorage('favoritesMode') &&
            bp.getStorage('favorites').indexOf(String(channel._id)) < 0)) {
            return;
        }
        const contentDiv = document.createElement('div');
        contentDiv.classList.add('content', 'channel');
        contentDiv.id = id;

        const contentBack = document.createElement('div');
        contentBack.classList.add('contentBack', 'channel');
        const logo = channel.logo != null ? channel.logo : 'https://' +
            'static-cdn.jtvnw.net/jtv_user_pictures/xarth/404_user_300x300.png';
        contentBack.style.backgroundImage =
            `url("${logo}")`;
        contentDiv.appendChild(contentBack);

        const hoverBack = document.createElement('div');
        hoverBack.classList.add('hoverBack', 'channel');
        contentBack.appendChild(hoverBack);

        const topName = document.createElement('div');
        topName.classList.add('topName');
        topName.textContent = channel.display_name;
        contentBack.appendChild(topName);

        const name = channel.name === channel.display_name.toLowerCase() ? '' :
            ` (${channel.name})`;
        addTooltip(topName, true).textContent = channel.display_name + name;

        const status = document.createElement('div');
        status.classList.add('status', 'channel');
        status.textContent = channel.description;
        contentBack.appendChild(status);

        const hideUntilHover = document.createElement('div');
        hideUntilHover.classList.add('hideUntilHover');
        contentBack.appendChild(hideUntilHover);

        const twitchButton = document.createElement('div');
        twitchButton.classList.add(
            'contentButton', 'bottom', 'channel',
            'twitch',
        );
        twitchButton.addEventListener('click', () => {
            const {
                url,
            } = channel;
            browser.tabs.create({
                url,
            });
        });
        addTooltip(twitchButton).textContent =
            browser.i18n.getMessage('openTwitchPageTip');
        hideUntilHover.appendChild(twitchButton);

        const chatButton = document.createElement('div');
        chatButton.classList.add('contentButton', 'bottom', 'channel', 'chat');
        chatButton.addEventListener('click', () => {
            browser.windows.create({
                url: `http:/twitch.tv/${channel.name}/chat?popout`,
                height: 600,
                width: 340,
                type: 'popup',
            });
        });
        addTooltip(chatButton).textContent =
            browser.i18n.getMessage('openChatTip', channel.display_name);
        hideUntilHover.appendChild(chatButton);

        const followed = bp.getUserFollowIDs().indexOf(String(channel._id)) > -1;

        const favoriteButton = document.createElement('div');
        const favorited =
            bp.getStorage('favorites').indexOf(String(channel._id)) > -1;
        favoriteButton.classList.add(
            'contentButton', 'bottom', 'channel',
            favorited ? 'unfavorite' : 'favorite',
        );
        if (!followed) favoriteButton.classList.add('noAccess');
        else {
            favoriteButton.addEventListener('click', () => {
                if (favorited) {
                    bp.unfavorite(String(channel._id), updatePage);
                } else bp.favorite(String(channel._id), updatePage);
            });
        }
        const favoriteTip = favorited ? 'unfavoriteTip' : 'favoriteTip';
        addTooltip(favoriteButton).textContent =
            browser.i18n.getMessage(followed ? favoriteTip :
                'cantFavoriteTip', channel.display_name);
        hideUntilHover.appendChild(favoriteButton);

        const followButton = document.createElement('div');
        followButton.classList.add(
            'contentButton', 'bottom', 'channel',
            followed ? 'unfollow' : 'follow',
        );
        if (!bp.getAuthorizedUser() &&
            !bp.getStorage('nonTwitchFollows')) {
            followButton.classList.add('noAccess');
        } else {
            followButton.addEventListener('click', () => {
                if (followed) followApi('Unfollow Channel', channel);
                else followApi('Follow Channel', channel);
            });
        }
        const followTip = followed ? 'unfollowTip' : 'followTip';
        addTooltip(followButton).textContent =
            browser.i18n.getMessage(followButton.classList.contains('noAccess') ?
                'noAccessTip' : followTip, channel.display_name);
        hideUntilHover.appendChild(followButton);

        const videosButton = document.createElement('div');
        videosButton.classList.add(
            'contentButton', 'side',
            'channel', 'smallVideos',
        );
        videosButton.addEventListener('click', () => {
            // Get Channel Videos
            getApiResults('Get Channel Videos', {
                _id: channel._id,
            }, true);
        });
        addTooltip(videosButton).textContent =
            browser.i18n.getMessage('channelVideosTip', channel.display_name);
        hideUntilHover.appendChild(videosButton);

        const clipsButton = document.createElement('div');
        clipsButton.classList.add('contentButton', 'side', 'channel', 'smallClips');
        clipsButton.addEventListener('click', () => {
            // Get Top Clips in channel
            getApiResults('Get Top Clips', {
                channel: channel.name,
            }, true);
        });
        addTooltip(clipsButton).textContent =
            browser.i18n.getMessage('channelClipsTip', channel.display_name);
        hideUntilHover.appendChild(clipsButton);

        if (channel.game) {
            const cornerGame = document.createElement('div');
            cornerGame.classList.add('cornerGame', 'channel');
            cornerGame.style.backgroundImage =
                `url("https://static-cdn.jtvnw.net/ttv-boxart/${channel.game
                }-52x72.jpg")`;
            addTooltip(cornerGame, true).textContent =
                bp.getStorage('tooltips') ?
                    browser.i18n.getMessage('gameStreamsTip', channel.game) :
                    channel.game;
            cornerGame.addEventListener('click', () => {
                // Get Live Streams
                getApiResults('Get Live Streams', {
                    game: channel.game,
                }, true);
            });
            contentDiv.appendChild(cornerGame);
        }

        const tag = document.createElement('span');
        tag.classList.add('tag');
        tag.textContent = channel.game + channel.display_name +
            channel.name + channel.status;
        contentDiv.appendChild(tag);
        contentArea.appendChild(contentDiv);
    }
};

const updateTab = (newMode) => {
    /*
      Update the current selected tab and the mode
    */

    // console.log("updateTab");

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
        contentArea.classList.add('hide');
        searchBar.classList.add('hide');
        aboutPage.classList.remove('hide');
    } else {
        // Show the content area
        aboutPage.classList.add('hide');
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

    if (bp.getStorage('lastVersion') !== version) {
        // New update
        if (!version || bp.getStorage('lastVersion').split('.')[1] !==
            version.split('.')[1]) {
            // Significant update. Show what's new
            setMode('about');
            bp.setStorage('showWhatsNew', true);
        }
        bp.setStorage('lastVersion', version);
    }

    mode = bp.getStorage('mode');
    showNewUser = bp.getStorage('showNewUser');
    showWhatsNew = bp.getStorage('showWhatsNew');

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

    // About tab
    const versionSpan = document.getElementById('version');
    versionSpan.textContent = browser.i18n.getMessage(versionSpan.id, version);
    const aboutTextNewUser = document.getElementById('aboutTextNewUser');
    const aboutTextWhatsNew = document.getElementById('aboutTextWhatsNew');
    const aboutTextAbout = document.getElementById('aboutTextAbout');

    if (showNewUser) {
        aboutTextNewUser.classList.remove('hide');
        aboutTextWhatsNew.classList.add('hide');
        aboutTextAbout.classList.add('hide');
    } else if (showWhatsNew) {
        aboutTextNewUser.classList.add('hide');
        aboutTextWhatsNew.classList.remove('hide');
        aboutTextAbout.classList.add('hide');
    } else {
        aboutTextNewUser.classList.add('hide');
        aboutTextWhatsNew.classList.add('hide');
        aboutTextAbout.classList.remove('hide');
    }

    const aboutTexts = document.getElementsByClassName('aboutText');
    for (let i = 0; i < aboutTexts.length; i += 1) {
        const aboutText = aboutTexts[i];
        aboutText.textContent = browser.i18n.getMessage(aboutText.id, version);
        /* aboutText.textContent = aboutText.classList.contains("version") ?
        aboutText.textContent = browser.i18n.getMessage(aboutText.id, version) :
        browser.i18n.getMessage(aboutText.id); */
    }

    const aboutButtons = document.getElementsByClassName('aboutButton');
    for (let i = 0; i < aboutButtons.length; i += 1) {
        const aboutButton = aboutButtons[i];
        if (aboutButton.id === 'aboutWhatsNewButton' && !showWhatsNew) {
            // Special case where we jump straight from new user screen to general
            // about screen
            aboutButton.textContent = browser.i18n.getMessage('aboutTellMoreButton');
        } else {
            aboutButton.textContent = browser.i18n.getMessage(
                aboutButton.id,
                version,
            );
        }
    }

    // let email = document.getElementById("email");
    const discord = document.getElementById('discord');
    // email.textContent = browser.i18n.getMessage(email.id, "email@site.com");
    discord.textContent = browser.i18n.getMessage(discord.id, 'Hunter#3581');

    // Select current tab
    if (document.getElementById(mode).classList.contains('noAccess')) {
        // You don't want people to remain on a tab after it becomes unusable
        document.getElementById(mode).classList.remove('selected');
        bp.setResults(bp.defaultResults());
        setMode('games');
    }
    document.getElementById(mode).classList.add('selected');

    // End alarm if it's on
    if (bp.getAlarmStatus()) {
        bp.endAlarm();
        // And switch to the followed streams tab
        updateTab('followedStreams');
    } else {
        // Show about page if it is the tab, hide otherwise
        updateTab();
    }
};

/*
  Click events
*/

// Big click event for non-specific elements
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('noAccess')) {
        // Do nothing I guess?
    } else if (e.target.classList.contains('tab') && e.target.id !== mode) {
        bp.setResults(bp.defaultResults());
        bp.setIndex(0);
        updateTab(e.target.id);
    }
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
    if (refresh.classList.contains('refresh')) {
        const results = bp.getResults();
        const index = bp.getIndex();
        getApiResults(
            results[index].endpoint,
            JSON.parse(results[index].opts), false, true,
        );
    } else if (refresh.classList.contains('favorites')) {
        bp.setStorage('favoritesMode', !bp.getStorage('favoritesMode'));
        bp.updateBadge();
        updatePage();
    }
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

// About page buttons
aboutWhatsNewButton.addEventListener('click', () => {
    showNewUser = false;
    bp.setStorage('showNewUser', showNewUser);
    initialize();
});

aboutTellMoreButton.addEventListener('click', () => {
    showWhatsNew = false;
    bp.setStorage('showWhatsNew', showWhatsNew);
    initialize();
});

addonPage.addEventListener('click', () => {
    const url = 'https://addons.mozilla.org/en-US/firefox/addon/twitch-fox/';
    browser.tabs.create({
        url,
    });
});

githubPage.addEventListener('click', () => {
    const url = 'https://github.com/Hunter5000/twitch-fox';
    browser.tabs.create({
        url,
    });
});

steamPage.addEventListener('click', () => {
    const url = 'http://steamcommunity.com/id/hunter7500/';
    browser.tabs.create({
        url,
    });
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

window.addEventListener('unload', () => {
    bp.endAlarm();
});

initialize();

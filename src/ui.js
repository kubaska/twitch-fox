import utils from "./utils";
import {html} from "lit-html";
import {tabs, twitch404ThumbnailUrl} from "./constants";
import {when} from "lit-html/directives/when.js";

const UI = {
    getParentElement: (element, klass) => {
        while (element && ! element.classList.contains(klass)) {
            element = element.parentElement;
        }
        return element;
    },

    /**
     * Fill dimension size into image URL template.
     * Supported URL formats:
     *   {width}x{height}
     *   %{width}x%{height}
     *   52x72 (or any other value)
     *
     * @param url {String}
     * @param width {int}
     * @param height {int}
     * @returns {String}
     */
    getImageUrl: (url, width, height) => {
        // For some reason 404 thumbnail is only served in 320x180, despite it being served in template format
        if (url.includes('404_processing')) {
            width = 320;
            height = 180;
        }

        if (url.indexOf('%{width}x%{height}') !== -1)
            return url.replace('%{width}x%{height}', `${width}x${height}`);
        if (url.indexOf('{width}x{height}') !== -1)
            return url.replace('{width}x{height}', `${width}x${height}`);
        // Leave this one last because it can incorrectly match streamer names like T2x2
        if (url.search(/(\d+x\d+)/) !== -1)
            return url.replace(/(\d+x\d+)/, `${width}x${height}`);

        return url;
    },

    fillTooltip: (element, tooltip) => {
        element.dataset['tooltip'] = element.dataset['tooltip'].replace('%MSG%', tooltip);
    }
}

const makeNoResultsMessageTemplate = (mode, index, hasSearch) => {
    let message;

    if (mode === tabs.SEARCH && index === 0) {
        message = 'Use the search bar above to search for channels on Twitch.';
    } else if (mode === tabs.FOLLOWED_GAMES && index === 0) {
        message = "You don't follow any games!";
    } else if (mode === tabs.FOLLOWED_STREAMS && index === 0) {
        message = html`<h2 style="margin: 0;">No followed results found.</h2><h2>Please wait for potential loading results.</h2>`;
    } else if (mode === tabs.FOLLOWED_CHANNELS && index === 0) {
        message = "You don't follow any channels!";
    } else if (hasSearch) {
        message = 'No search results found.';
    } else {
        message = 'No results found.';
    }

    return html`<div class="media-object__message">${typeof message === 'string' ? html`<h2>${message}</h2>` : message}</div>`;
};

const makeCardTemplate = (content, type, bp, cardClickHandler) => {
    if (type === 'game') {
        return html`
<div id="GAME!${content.id}" class="media-object" @click="${cardClickHandler}" data-id="${content.id}" data-game-id="${content.id}" data-game="${content.name}" data-tag="${content.name}">
    <div class="media-object__cover category">
        <div class="media-object__cover-wrap">
            <div>
                <img class="media-object__cover-inner" loading="lazy" decoding="async" src="${UI.getImageUrl(content.box_art_url, 188, 250)}" />
            </div>
        </div>

        <div class="on-top background background--darken"></div>

        <div class="on-top overlay overlay--game">
            <div class="h-50 upper" data-trigger="browseGame">
                <div class="btn icon icon--medium icon__videos tooltipped" data-trigger="browseVideosByGame" data-tooltip="View the top videos from channels playing ${content.name}"></div>
                <div class="btn icon icon--medium icon__clips tooltipped" data-trigger="browseClipsByGame" data-tooltip="View the top clips from streams playing ${content.name}"></div>
            </div>

            <div class="h-50 lower" data-trigger="browseGame">
                <div class="btn icon icon--medium icon__stream tooltipped" data-trigger="openGame" data-tooltip="Open Twitch page"></div>
                ${when(bp.isFollowingGame(parseInt(content.id)),
                    () => html`<span class="btn icon icon--medium icon__unfollow tooltipped tooltip--follow-game" data-trigger="unfollowGame" data-tooltip="Unfollow game locally"></span>`,
                    () => html`<span class="btn icon icon--medium icon__follow tooltipped tooltip--follow-game" data-trigger="followGame" data-tooltip="Follow game locally"></span>`
                )}
            </div>
        </div>
    </div>
    <div class="media-object__info">
        <div class="media-object__name title text-truncate-clamp" title="${content.name}">${content.name}</div>
    </div>
</div>`;
    }
    else if (type === 'stream' || type === 'video' || type === 'clip') {
        const streamerId = parseInt(type === 'clip' ? content.broadcaster_id : content.user_id);
        const streamerName = type === 'clip' ? content.broadcaster_name : content.user_login;
        const streamerDisplayName = type === 'clip'
            ? content.broadcaster_name
            : (content.user_login === content.user_name.toLowerCase()) ? content.user_name : content.user_login;
        const tag = type === 'stream'
            ? content.game_name + content.user_login + content.user_name + content.title
            : streamerName + content.title;
        const thumbnailUrl = type === 'stream' ? UI.getImageUrl(content.thumbnail_url, 640, 360)
            : type === 'video'
                ? (content.thumbnail_url
                    ? UI.getImageUrl(content.thumbnail_url, 640, 360)
                    : twitch404ThumbnailUrl)
                : content.thumbnail_url;
        // No game returned for videos, only ID returned for clips, both ID and name for streams.
        const categoryThumbnail = content.game_thumb
            ? UI.getImageUrl(content.game_thumb, 52, 72)
            : `https://static-cdn.jtvnw.net/ttv-boxart/${content.game_name ?? content.game_id}-52x72.jpg`;
        const createdAt = new Date(type === 'stream' ? content.started_at : content.created_at);
        const formattedTime = type === 'stream' ? utils.timeSince(createdAt, Date.now())
            : (type === 'video' ? utils.formattedTimeToHHMMSS(content.duration)
            : utils.secondsToMMSS(content.duration));
        const viewsOrViewers = utils.delimitNumber(type === 'stream' ? content.viewer_count : content.view_count);

        return html`
<div id="${type.toUpperCase()}!${content.id}" class="media-object" @click="${cardClickHandler}" data-type="${type}" data-id="${content.id}" data-streamer-id="${streamerId}" data-name="${streamerName}" data-game-id="${content.game_id ?? ''}" data-tag="${tag}">
    <div class="media-object__cover stream">
        <div class="media-object__cover-wrap">
            <div>
                <img class="media-object__cover-inner" loading="lazy" decoding="async" src="${thumbnailUrl}" />
            </div>
        </div>

        <div class="on-top background background--slide-down"></div>

        <div class="on-top overlay overlay--stream">
            <div class="title">
                <span class="status text-truncate">${content.title}</span>
            </div>

            <div class="uptime tooltipped" data-tooltip="${type === 'stream' ? 'Stream started' : type === 'video' ? 'Video saved' : 'Clip made'} at ${createdAt.toLocaleString()}">
                <span class="icon icon--small icon__uptime"></span>
                <span class="uptime--time">${formattedTime}</span>
            </div>

            <div class="upper">
                <div class="btn icon icon--medium icon__videos tooltipped" data-trigger="browseVideosByChannel" data-tooltip="View videos uploaded by ${streamerName}"></div>
                <div class="btn icon icon--medium icon__clips tooltipped" data-trigger="browseClipsByChannel" data-tooltip="View clips made from ${streamerName}'s streams"></div>
            </div>

            <div class="lower">
                <!--                    <div class="logo" style="width: 45px; height: 45px; background-color:lightgreen;"></div>-->
                <div class="lower--controls">
                    <span class="btn icon icon--medium icon__stream tooltipped" data-trigger="openStream" data-tooltip="Open Twitch page"></span>
                    <span class="btn icon icon--medium icon__popout tooltipped" data-trigger="openPopout" data-tooltip="Open content in a popout window"></span>
                    <span class="btn icon icon--medium icon__chat tooltipped ${type === 'stream' ? '' : 'd-none'}" data-trigger="openChat" data-tooltip="Open chat in a popout window"></span>
                    <span class="btn icon icon--medium icon__enlarge tooltipped" data-trigger="enlarge" data-tooltip="Enlarge the preview"></span>
                    ${when(bp.isFavorite(streamerId),
                        () => html`<span class="btn icon icon--medium icon__unfavorite tooltipped" data-trigger="unfavorite" data-tooltip="Remove channel from favorites"></span>`,
                        () => html`<span class="btn icon icon--medium icon__favorite tooltipped" data-trigger="favorite" data-tooltip="Add channel to favorites"></span>`
                    )}
                    ${when(bp.isFollowing(streamerId),
                        () => html`<span class="btn icon icon--medium icon__unfollow tooltipped tooltip--follow-stream" data-trigger="unfollow" data-tooltip="Unfollow channel locally"></span>`,
                        () => html`<span class="btn icon icon--medium icon__follow tooltipped tooltip--follow-stream" data-trigger="follow" data-tooltip="Follow channel locally"></span>`
                    )}
                </div>
                <div class="category tooltipped ${content.game_id ? '' : 'd-none'}" data-tooltip="View the top live streams playing ${content.game_name ?? 'this game'}">
                    <img data-trigger="browseGame" class="category-img" src="${categoryThumbnail}" />
                </div>
            </div>
        </div>
    </div>
    <div class="media-object__info">
        <div class="media-object__name text-truncate">
            <span class="viewer-count">${viewsOrViewers}</span>
            <span> ${type === 'stream' ? 'viewers' : 'views'} on </span>
            <span class="streamer-name">${streamerDisplayName}</span>
        </div>
    </div>
</div>
        `;
    }
    else if (type === 'channel') {
        const userId = parseInt(content.id);

        // Endpoint Inconsistencies
        // Follows Endpoint  - Search Endpoint   - Value
        // login             - broadcaster_login - xqcow
        // display_name      - display_name      - xQcOW
        // profile_image_url - thumbnail_url     - (some url)
        // description       - (none)            - xqc desc

        const login = content.login ?? content.broadcaster_login;
        const profile_image = content.profile_image_url ?? content.thumbnail_url;

        return html`
<div id="CHANNEL!${content.id}" class="media-object" @click="${cardClickHandler}" data-id="${content.id}" data-streamer-id="${content.id}" data-name="${login}" data-tag="${login + content.display_name}">
    <div class="media-object__cover channel">
        <div class="media-object__cover-wrap">
            <div>
                <img class="media-object__cover-inner" loading="lazy" decoding="async" src="${profile_image ?? 'https://static-cdn.jtvnw.net/jtv_user_pictures/xarth/404_user_300x300.png'}" />
            </div>
        </div>

        <div class="on-top background background--slide-down"></div>

        <div class="on-top overlay overlay--channel">
            <div class="title">
                <span class="status text-truncate">${login === content.display_name.toLowerCase() ? content.display_name : login}</span>
            </div>

            <div class="description">
                <span class="description--text text-truncate">${content.description ?? ''}</span>
            </div>

            <div class="upper">
                <div class="btn icon icon--medium icon__videos tooltipped" data-trigger="browseVideosByChannel" data-tooltip="View videos uploaded by ${content.display_name}"></div>
                <div class="btn icon icon--medium icon__clips tooltipped" data-trigger="browseClipsByChannel" data-tooltip="View clips made from ${content.display_name}'s streams"></div>
            </div>

            <div class="lower">
                <div class="lower--controls">
                    <span class="btn icon icon--medium icon__stream tooltipped" data-tooltip="Open Twitch page" data-trigger="openStream"></span>
                    <span class="btn icon icon--medium icon__chat tooltipped" data-tooltip="Open chat in a popout window" data-trigger="openChat"></span>
                    ${when(bp.isFavorite(userId),
                        () => html`<span class="btn icon icon--medium icon__unfavorite tooltipped" data-trigger="unfavorite" data-tooltip="Remove channel from favorites"></span>`,
                        () => html`<span class="btn icon icon--medium icon__favorite tooltipped" data-trigger="favorite" data-tooltip="Add channel to favorites"></span>`
                    )}
                    ${when(bp.isFollowing(userId),
                        () => html`<span class="btn icon icon--medium icon__unfollow tooltipped tooltip--follow-stream" data-trigger="unfollow" data-tooltip="Unfollow channel LOCALLY"></span>`,
                        () => html`<span class="btn icon icon--medium icon__follow tooltipped tooltip--follow-stream" data-trigger="follow" data-tooltip="Follow channel LOCALLY"></span>`
                    )}
                </div>
            </div>
        </div>
    </div>
</div>
        `;
    }
    else return html`<h1>Invalid card type: ${type}!</h1>`;
};

const makeStaticContent = (tab) => {
    if (tab === 'about') {
        return html`
<div id="about-page" class="about-page">
    <div class="logo-container" style="height: 120px">
        <div class="logo hw-100 bg-contain">
            <span class="about-version fw-bold">Twitch Fox, version 5.2.2 (fork)</span>
        </div>
    </div>

    <div>
        <p class="fs-5 fw-bold">Welcome to Twitch Fox!</p>
        <p class="fs-6">You can browse Twitch by clicking the tabs on the left, and search Twitch for content relating to the current tab by using the (currently not visible) search bar above. And don't forget to check out the settings by clicking the gear icon in the bottom left corner, where you can disable tooltips and much more.</p>
        <p class="fs-6">Whether you have used Twitch Fox in the past or have downloaded it for the first time, I hope you enjoy my add-on!</p>
    </div>
    <div>
        <p class="fs-5 fw-bold">New update - Twitch Fox 5</p>
        <p class="fs-6">Hey! You are using forked version of Twitch Fox. You might have noticed that a few features are missing. The reason is that Twitch crippled their new API - many features that made this addon so awesome are now missing. I tried my best to port everything I could so Twitch Fox can still live.</p>
        <p class="fs-5 fw-bold">New feature - Extended View</p>
        <p class="fs-6">Now you can use Twitch Fox from a separate tab. To do so, left-click the popup icon and choose the new option.</p>
    </div>
    <div>
        <div class="about-btn-group">
            <a class="twitch-btn" href="https://github.com/kubaska/twitch-fox" target="_blank">Visit GitHub repository</a>
            <a class="twitch-btn" href="https://github.com/kubaska/twitch-fox/issues/new" target="_blank">Report an issue</a>
        </div>
    </div>
</div>
        `;
    }
    else return html`<div><h1>Invalid static tab: ${tab}!</h1></div>`;
}

export { makeNoResultsMessageTemplate, makeCardTemplate, makeStaticContent, UI };

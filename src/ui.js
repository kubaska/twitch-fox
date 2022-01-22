import utils from "./utils";

const UI = {
    insertBackground: (card, url) => {
        card.querySelector('.media-object__cover-inner').src = url;
    },

    getParentElement: (element, klass) => {
        while (element && ! element.classList.contains(klass)) {
            element = element.parentElement;
        }
        return element;
    },

    getImageUrl: (url, width, height) => {
        return url.replace(/%?{width}x%?{height}/, `${width}x${height}`);
    },

    setTooltip: (element, tooltip) => {
        element.dataset['tooltip'] = tooltip;
    },
    fillTooltip: (element, tooltip) => {
        element.dataset['tooltip'] = element.dataset['tooltip'].replace('%MSG%', tooltip);
    }
}

const handleFollowFavoriteBtns = (card, isFollowing, isFavorite) => {
    card.querySelector('.icon__follow').classList[isFollowing ? 'add' : 'remove']('d-none');
    card.querySelector('.icon__unfollow').classList[isFollowing ? 'remove' : 'add']('d-none');

    const favoriteElement = card.querySelector('.icon__favorite');
    if (isFollowing) {
        favoriteElement.classList[isFavorite ? 'add' : 'remove']('d-none');
        card.querySelector('.icon__unfavorite').classList[isFavorite ? 'remove' : 'add']('d-none');
    } else {
        favoriteElement.classList.add('d-none');
        // favoriteElement.classList.add('icon--inactive');
        // UI.setTooltip(favoriteElement, "You can't favorite this channel because you're not following them!");
    }
}

const makeCard = (bp, favoriteMode, type, content) => {
    if (type === 'game') {
        let card = document.getElementById('stub-game').cloneNode(true);

        // fixme do we need this?
        const game = content.game ? content.game : content;

        card.id = `GAME!${game.id}`;
        card.dataset['id'] = game.id;
        card.dataset['gameId'] = game.id;
        card.dataset['game'] = game.name; // todo remove?
        card.dataset['tag'] = game.name;

        card.querySelectorAll('.title').forEach(element => {
            element.textContent = game.name;
        });

        card.querySelector('.media-object__cover-inner').src = UI.getImageUrl(game.box_art_url, 136, 190);

        // TODO Top Games endpoint does not return viewer count anymore. Remove this if they wont add it back.
        // if (content.viewers) {
        //     card.querySelector('.viewer-count').textContent = delimitNumber(content.viewers);
        // } else {
        //     // Searching for game does not return the viewer count, hide it
        //     card.querySelector('.viewer-count').classList.add('d-none');
        // }

        // tooltip stuff
        UI.fillTooltip(card.querySelector('.icon__videos.tooltipped'), game.name);
        UI.fillTooltip(card.querySelector('.icon__clips.tooltipped'), game.name);

        return card;
    }
    else if (type === 'stream') {
        const userId = parseInt(content.user_id);
        const isFavorite = bp.isFavorite(userId);

        if (favoriteMode && ! isFavorite) return;

        let card = document.getElementById('stub-stream').cloneNode(true);

        card.dataset['type'] = type;
        // user_login = xqcow
        // user_name = xQcOW

        card.id = `STREAM!${content.id}`;
        card.dataset['id'] = content.id;
        card.dataset['streamerId'] = userId;
        card.dataset['name'] = content.user_login;
        card.dataset['gameId'] = content.game_id;
        card.dataset['tag'] = content.game_name + content.user_login + content.user_name + content.title;

        card.querySelector('.status').textContent = content.title;

        card.querySelector('.media-object__cover-inner').src = UI.getImageUrl(content.thumbnail_url, 640, 360);
        if (content.game_name) {
            card.querySelector('.category-img').src = `https://static-cdn.jtvnw.net/ttv-boxart/${content.game_name}-52x72.jpg`;
            UI.fillTooltip(card.querySelector('.category.tooltipped'), content.game_name);
        } else {
            card.querySelector('.category').classList.add('d-none');
        }

        const startDate = new Date(content.started_at);
        const now = Date.now();
        card.querySelector('.uptime--time').textContent = utils.timeSince(startDate, now);
        UI.setTooltip(card.querySelector('.uptime'), 'Stream started at ' + startDate.toLocaleString());

        card.querySelector('.viewer-count').textContent = utils.delimitNumber(content.viewer_count);

        card.querySelectorAll('.streamer-name').forEach(element => {
            element.textContent = content.user_login;
        });

        // tooltip stuff
        UI.fillTooltip(card.querySelector('.icon__videos.tooltipped'), content.user_login);
        UI.fillTooltip(card.querySelector('.icon__clips.tooltipped'), content.user_login);

        const following = bp.isFollowing(userId);
        handleFollowFavoriteBtns(card, following, isFavorite);

        // fixme Get channel images from cached follows?
        // UI.insertBackgroundUrl(card.querySelector('.cornerLogo'), content.channel.logo);
        // card.querySelector('.cornerLogo').classList.add('d-none');

        return card;
    }
    else if (type === 'video' || type === 'clip') {
        let card = document.getElementById('stub-stream').cloneNode(true);

        const streamerId = parseInt(type === 'video' ? content.user_id : content.broadcaster_id);
        const streamerName = type === 'video' ? content.user_login : content.broadcaster_name;

        card.dataset['type'] = type;

        card.id = `${type.toUpperCase()}!${content.id}`;
        card.dataset['id'] = content.id;
        card.dataset['streamerId'] = streamerId;
        card.dataset['name'] = streamerName;
        card.dataset['tag'] = streamerName + content.title;
        // card.dataset['game'] = content.game;

        card.querySelector('.status').textContent = content.title;

        card.querySelector('.media-object__cover-inner').src = type === 'video'
            ? UI.getImageUrl(content.thumbnail_url, 640, 360)
            : content.thumbnail_url;

        // No game returned for videos, only ID returned for clips. fixme
        if (content.game) {
            //     card.querySelector('.game-name').textContent = content.game;
            //     UI.insertBackgroundUrl(
            //         card.querySelector('.cornerGame'),
            //         `https://static-cdn.jtvnw.net/ttv-boxart/${content.game}-52x72.jpg`
            //     );
        } else {
            card.querySelector('.category').classList.add('invisible');
        }

        const createdAt = new Date(content.created_at);
        card.querySelector('.uptime--time').textContent = (type === 'video')
            ? utils.formattedTimeToHHMMSS(content.duration)
            : utils.secondsToMMSS(content.duration);
        UI.setTooltip(
            card.querySelector('.uptime'),
            (type === 'video')
                ? 'Video saved at ' + createdAt.toLocaleString()
                : 'Clip made at ' + createdAt.toLocaleString()
        )

        card.querySelector('.viewer-count').textContent = utils.delimitNumber(content.view_count);

        const following = bp.isFollowing(streamerId);
        const isFavorite = bp.isFavorite(streamerId);
        handleFollowFavoriteBtns(card, following, isFavorite);

        card.querySelectorAll('.streamer-name').forEach(element => {
            element.textContent = streamerName;
        });

        // tooltip stuff
        UI.fillTooltip(card.querySelector('.icon__videos.tooltipped'), streamerName);
        UI.fillTooltip(card.querySelector('.icon__clips.tooltipped'), streamerName);

        // Video/Clip specific
        card.querySelector('.icon__chat').classList.add('d-none');
        card.querySelector('.lang__stream').classList.add('d-none');
        card.querySelector('.lang__videos').classList.remove('d-none');

        // UI.insertBackgroundUrl(card.querySelector('.cornerLogo'), channel.logo);
        // card.querySelector('.cornerLogo').classList.add('d-none');

        return card;
    }
    else if (type === 'channel') {
        const userId = parseInt(content.id);
        const isFavorite = bp.isFavorite(userId);

        if (favoriteMode && ! isFavorite) return;

        // Endpoint Inconsistencies
        // Follows Endpoint  - Search Endpoint   - Value
        // login             - broadcaster_login - xqcow
        // display_name      - display_name      - xQcOW
        // profile_image_url - thumbnail_url     - (some url)
        // description       - (none)            - xqc desc

        let card = document.getElementById('stub-channel').cloneNode(true);

        const login = content.login ?? content.broadcaster_login;
        const profile_image = content.profile_image_url ?? content.thumbnail_url;

        card.id = `CHANNEL!${content.id}`;
        card.dataset['id'] = content.id;
        card.dataset['streamerId'] = content.id;
        card.dataset['name'] = login;
        card.dataset['tag'] = login + content.display_name;

        card.querySelector('.status').textContent = login;

        UI.insertBackground(
            card,
            profile_image ?? 'https://static-cdn.jtvnw.net/jtv_user_pictures/xarth/404_user_300x300.png'
        )

        const following = bp.isFollowing(userId);
        handleFollowFavoriteBtns(card, following, isFavorite);

        card.querySelector('.description--text').textContent = content.description ?? '';

        // tooltip stuff
        UI.fillTooltip(card.querySelector('.icon__videos.tooltipped'), content.display_name);
        UI.fillTooltip(card.querySelector('.icon__clips.tooltipped'), content.display_name);

        return card;
    }
};

export { makeCard, UI };

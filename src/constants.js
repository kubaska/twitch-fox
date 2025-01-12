export const twitchClientId = 'dzawctbciav48ou6hyv0sxbgflvfdpp';

export const EResultState = {
    IDLE: 0,
    LOADING: 1,
};

export const ENotificationFlag = {
    textNotification: 1 << 0,
    audioNotification: 1 << 1,
    favoritesTextNotification: 1 << 2,
    favoritesAudioNotification: 1 << 3
}

export const ENotificationClickFlag = {
    openStreamNewTab: 1 << 0,
    openStreamPopout: 1 << 1,
    openChatPopout: 1 << 2
}

export const ERuntimeMessage = {
    INITIALIZE: 'initialize',
    NEW_FOLLOWED_STREAMS: 'newFollowedStreams',
    OPTIONS_CHANGED: 'optionsChanged'
}

export const twitch404ThumbnailUrl = 'https://vod-secure.twitch.tv/_404/404_processing_320x180.png'

export const tabs = {
    GAMES: 'games',
    STREAMS: 'streams',
    SEARCH: 'channels',

    FOLLOWED_GAMES: 'followedGames',
    FOLLOWED_STREAMS: 'followedStreams',
    FOLLOWED_VIDEOS: 'followedVideos',
    FOLLOWED_CHANNELS: 'followedChannels',

    ABOUT: 'about',

    isFollowedTab: (name) => name.includes('followed')
};

export const sortingType = {
    ALPHABETICAL: 'alphabetical',
    ALPHABETICAL_ASC: 'alphabetical_asc',
    FOLLOWED_DATE: 'followed_date',
    FOLLOWED_DATE_ASC: 'followed_date_asc',
    NEWEST: 'newest',
    OLDEST: 'oldest_asc',
    VIEWERS: 'viewers',
    VIEWERS_ASC: 'viewers_asc',
    VIEWS: 'views',
    VIEWS_ASC: 'views_asc'
};

/**
 * Get available sorting options for provided content type.
 * 'doNotSort' key means that results are already ordered that way by Twitch and we should skip sorting again.
 *
 * @param contentType {string}
 * @returns {Object}
 */
export const getSortingTypesForContentType = (contentType) => {
    switch (contentType) {
        case 'game':
            return {
                [sortingType.FOLLOWED_DATE]: { name: 'Follow date', doNotSort: true },
                [sortingType.FOLLOWED_DATE_ASC]: { name: 'Follow date (asc)', sortKey: 'followed_at' },
                [sortingType.ALPHABETICAL_ASC]: { name: 'Alphabetical', sortFn: (e) => e.name.toLowerCase() },
                [sortingType.ALPHABETICAL]: { name: 'Alphabetical (desc)', sortFn: (e) => e.name.toLowerCase() },
            };
        case 'stream':
            return {
                [sortingType.VIEWERS]: { name: 'Viewers', doNotSort: true },
                [sortingType.VIEWERS_ASC]: { name: 'Viewers (asc)', sortKey: 'viewer_count' },
                [sortingType.ALPHABETICAL_ASC]: { name: 'Alphabetical', sortFn: (e) => e.user_name ?? e.user_login },
                [sortingType.ALPHABETICAL]: { name: 'Alphabetical (desc)', sortFn: (e) => e.user_name ?? e.user_login },
            };
        case 'video':
            return {
                [sortingType.NEWEST]: { name: 'Newest', doNotSort: true },
                [sortingType.OLDEST]: { name: 'Oldest', sortKey: 'published_at' },
                [sortingType.VIEWS]: { name: 'Most views', sortKey: 'view_count' },
                [sortingType.VIEWS_ASC]: { name: 'Least views', sortKey: 'view_count' },
                // [sortingType.ALPHABETICAL_ASC]: { name: 'Alphabetical', sortFn: (e) => e.user_name ?? e.user_login },
                // [sortingType.ALPHABETICAL]: { name: 'Alphabetical (desc)', sortFn: (e) => e.user_name ?? e.user_login },
            };
        case 'channel':
            return {
                [sortingType.FOLLOWED_DATE]: { name: 'Follow date', doNotSort: true },
                [sortingType.FOLLOWED_DATE_ASC]: { name: 'Follow date (asc)', sortKey: 'followed_at' },
                [sortingType.ALPHABETICAL]: { name: 'Alphabetical', sortFn: (e) => e.display_name.toLowerCase() },
                [sortingType.ALPHABETICAL_ASC]: { name: 'Alphabetical (asc)', sortFn: (e) => e.display_name.toLowerCase() },
            };
        default:
            return {};
    }
}

const endpoints = {
    GET_TOP_GAMES: 'Get Top Games',

    GET_GAMES: 'Get Games',
    GET_STREAMS: 'Get Live Streams',
    GET_VIDEOS: 'Get Videos',
    GET_CLIPS: 'Get Clips',

    GET_FOLLOWED_STREAMS: 'Get Followed Streams',

    SEARCH_GAMES: 'Search Games',
    SEARCH_CHANNELS: 'Search Channels',

    GET_USERS: 'Get Users',
    GET_USER_FOLLOWS: 'Get User Follows',
}

export const endpointList = {
    [endpoints.GET_TOP_GAMES]: {
        url: 'games/top',
        contentType: 'game'
    },

    [endpoints.GET_GAMES]: {
        url: 'games',
        contentType: 'game'
    },
    [endpoints.GET_STREAMS]: {
        url: 'streams',
        langCodesAllowed: true,
        contentType: 'stream'
    },
    [endpoints.GET_VIDEOS]: {
        url: 'videos',
        // Apparently only one is allowed but passing multiple works as well
        langCodesAllowed: true,
        contentType: 'video'
    },
    [endpoints.GET_CLIPS]: {
        url: 'clips',
        contentType: 'clip'
    },

    [endpoints.GET_FOLLOWED_STREAMS]: {
        url: 'streams/followed',
        contentType: 'stream'
    },

    [endpoints.SEARCH_GAMES]: {
        url: 'search/categories',
        contentType: 'game'
    },
    [endpoints.SEARCH_CHANNELS]: {
        url: 'search/channels',
        contentType: 'channel'
    },

    [endpoints.GET_USERS]: {
        url: 'users'
    },

    [endpoints.GET_USER_FOLLOWS]: {
        url: `channels/followed`
    }
};

/**
 * Describe tab features.
 *
 * apiSearchable - Ability to search API instead of displayed results.
 * endpoint      - What endpoint should we call when user selects the tab
 * favorites     - Can user filter by favorites?
 * refreshable   - Is tab refreshable?
 * staticContent - Contains ID of HTML element to copy and display.
 */
export const tabInfo = {
    [tabs.GAMES]: {
        apiSearchable: true,
        endpoint: endpoints.GET_TOP_GAMES,
        refreshable: true,
    },
    [tabs.STREAMS]: {
        endpoint: endpoints.GET_STREAMS,
        refreshable: true,
    },
    [tabs.SEARCH]: {
        apiSearchable: true,
        refreshable: true,
    },
    [tabs.FOLLOWED_GAMES]: {},
    [tabs.FOLLOWED_STREAMS]: {
        favorites: true
    },
    [tabs.FOLLOWED_VIDEOS]: {
        refreshable: true
    },
    [tabs.FOLLOWED_CHANNELS]: {
        favorites: true
    },
    [tabs.ABOUT]: {
        hideNavigation: true,
        staticContent: 'about-page'
    }
};

export { endpoints };

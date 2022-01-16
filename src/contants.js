export const tabs = {
    GAMES: 'games',
    STREAMS: 'streams',
    VIDEOS: 'videos',
    CLIPS: 'clips',
    SEARCH: 'channels',

    FOLLOWED_STREAMS: 'followedStreams',
    FOLLOWED_VIDEOS: 'followedVideos',
    FOLLOWED_CLIPS: 'followedClips', // Clips from followed games
    FOLLOWED_CHANNELS: 'followedChannels',

    ABOUT: 'about',

    isFollowedTab: (name) => name.includes('followed')
};

const endpoints = {
    GET_TOP_GAMES: 'Get Top Games',

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
        url: () => 'games/top',
        method: 'GET',
        contentType: 'game'
    },

    [endpoints.GET_STREAMS]: {
        url: () => 'streams',
        method: 'GET',
        langCodesAllowed: true,
        contentType: 'stream'
    },
    [endpoints.GET_VIDEOS]: {
        url: () => 'videos',
        method: 'GET',
        // langCodesAllowed: true, // Allowed, but only one
        contentType: 'video'
    },
    [endpoints.GET_CLIPS]: {
        url: () => 'clips',
        method: 'GET',
        contentType: 'clip'
    },

    [endpoints.GET_FOLLOWED_STREAMS]: {
        url: () => 'streams/followed',
        method: 'GET',
        contentType: 'stream'
    },

    [endpoints.SEARCH_GAMES]: {
        url: () => 'search/categories',
        method: 'GET',
        contentType: 'game'
    },
    [endpoints.SEARCH_CHANNELS]: {
        url: () => 'search/channels',
        method: 'GET',
        contentType: 'channel'
    },

    [endpoints.GET_USERS]: {
        url: () => 'users',
        method: 'GET',
    },

    [endpoints.GET_USER_FOLLOWS]: {
        url: () => `users/follows`,
        method: 'GET',
    }
};

/**
 * Describe tab features.
 *
 * apiSearchable - Ability to search API instead of displayed results.
 * endpoint      - What endpoint should we call when user selects the tab
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
    [tabs.FOLLOWED_STREAMS]: {

    },
    [tabs.FOLLOWED_CHANNELS]: {

    },
    [tabs.ABOUT]: {
        hideNavigation: true,
        staticContent: 'about-page'
    }
};

export { endpoints };

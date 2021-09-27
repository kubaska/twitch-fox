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
    GET_TOP_VIDEOS: 'Get Top Videos',
    GET_TOP_CLIPS: 'Get Top Clips',
    GET_STREAMS: 'Get Live Streams',

    GET_FOLLOWED_STREAMS: 'Get Followed Streams',
    GET_FOLLOWED_VIDEOS: 'Get Followed Videos',
    GET_FOLLOWED_CLIPS: 'Get Followed Clips',

    GET_CHANNEL_VIDEOS: 'Get Channel Videos',

    SEARCH_GAMES: 'Search Games',
    SEARCH_CHANNELS: 'Search Channels',
    SEARCH_STREAMS: 'Search Streams',

    GET_CHANNEL_BY_ID: 'Get Channel by ID',

    GET_USER: 'Get User',
    GET_USER_FOLLOWS: 'Get User Follows',
}

export const endpointList = {
    [endpoints.GET_TOP_GAMES]: {
        url: () => 'games/top',
        method: 'GET',
        requireAuth: false,
        responseKey: 'top',
        contentType: 'game'
    },
    [endpoints.GET_TOP_VIDEOS]: {
        url: () => 'videos/top',
        method: 'GET',
        requireAuth: false,
        responseKey: 'vods',
        contentType: 'video'
    },
    [endpoints.GET_TOP_CLIPS]: {
        url: () => 'clips/top',
        method: 'GET',
        requireAuth: false,
        responseKey: 'clips',
        contentType: 'clip'
    },
    [endpoints.GET_STREAMS]: {
        url: () => 'streams',
        method: 'GET',
        requireAuth: false,
        responseKey: 'streams',
        contentType: 'stream'
    },

    [endpoints.GET_FOLLOWED_STREAMS]: {
        url: () => 'streams/followed',
        method: 'GET',
        requireAuth: true,
        responseKey: 'streams',
        contentType: 'stream'
    },
    [endpoints.GET_FOLLOWED_VIDEOS]: {
        url: () => 'videos/followed',
        method: 'GET',
        requireAuth: true,
        responseKey: 'videos',
        contentType: 'video'
    },
    [endpoints.GET_FOLLOWED_CLIPS]: {
        url: () => 'clips/followed',
        method: 'GET',
        requireAuth: true,
        responseKey: 'clips',
        contentType: 'clip'
    },

    [endpoints.GET_CHANNEL_VIDEOS]: {
        url: (id) => `channels/${id}/videos`,
        method: 'GET',
        requireAuth: false,
        responseKey: 'videos',
        contentType: 'video'
    },

    [endpoints.SEARCH_GAMES]: {
        url: () => 'search/games',
        method: 'GET',
        requireAuth: false,
        responseKey: 'games',
        contentType: 'game'
    },
    [endpoints.SEARCH_CHANNELS]: {
        url: () => 'search/channels',
        method: 'GET',
        requireAuth: false,
        responseKey: 'channels',
        contentType: 'channel'
    },
    [endpoints.SEARCH_STREAMS]: {
        url: () => 'search/streams',
        method: 'GET',
        requireAuth: false,
        responseKey: 'streams',
        contentType: 'stream'
    },

    [endpoints.GET_CHANNEL_BY_ID]: {
        url: (id) => `channels/${id}`,
        method: 'GET',
        requireAuth: false,
    },

    [endpoints.GET_USER]: {
        url: () => 'user',
        method: 'GET',
        requireAuth: true
    },
    [endpoints.GET_USER_FOLLOWS]: {
        url: (id) => `users/${id}/follows/channels`,
        method: 'GET',
        requireAuth: true,
        responseKey: 'follows'
    }
};

export { endpoints };

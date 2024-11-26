import {twitchClientId, endpointList, endpoints} from "../constants";
import axios from "axios";
import storage from "../storage";
import {uniq} from "lodash/array";

const _axios = axios.create({
    baseURL: 'https://api.twitch.tv/helix/',
    headers: {
        'Client-ID': twitchClientId
    }
});

_axios.interceptors.request.use(function (request) {
    const token = storage.get('token');

    // todo maybe compare request.url with endpoints and fail immediately if requires auth?

    if (token) {
        request.headers.Authorization = `Bearer ${token}`;
    }

    // This prevents Twitch from returning results for user region.
    request.headers['Accept-Language'] = undefined;

    return request;
});

const request = (endpoint, options = {}, abortSignal) => {
    const url = endpointList[endpoint].url;

    return _axios.request({ url, method: 'GET', params: options, signal: abortSignal })
        .then(response => {
            return response.data;
        })
        // .catch(error => {
        //     console.log('Helix API error', error);
        //     return { __error: true, message: error.message, name: error.name };
        // });
};

const categoryCache = new Map();

export default {
    request(endpoint, options = {}, abortSignal = null) {
        switch (endpoint) {
            case endpoints.GET_TOP_GAMES:
                return this.getTopGames(options, abortSignal);
            case endpoints.GET_GAMES:
                return this.getGames(options, abortSignal);
            case endpoints.GET_STREAMS:
                return this.getStreams(options, abortSignal);
            case endpoints.GET_VIDEOS:
                return this.getVideos(options, abortSignal);
            case endpoints.GET_CLIPS:
                return this.getClips(options, abortSignal);
            case endpoints.GET_FOLLOWED_STREAMS:
                return this.getFollowedStreams(options);
            case endpoints.SEARCH_GAMES:
                return this.searchGames(options);
            case endpoints.SEARCH_CHANNELS:
                return this.searchChannels(options);
            case endpoints.GET_USERS:
                return this.getUsers(options);
            case endpoints.GET_USER_FOLLOWS:
                return this.getUserFollows(options);
            default:
                console.error('Not Implemented!', endpoint, options);
        }
    },

    async _addCategories(data, gameIdKey) {
        if (! data || ! data.length) return [];

        const categoryIds = uniq(data.map(entity => entity[gameIdKey])).filter(v => v);
        const needsFetching = categoryIds.filter(id => ! categoryCache.has(id));
        if (needsFetching.length) {
            const games = await this.getGames({ id: needsFetching });
            games.data?.forEach(game => categoryCache.set(game.id, { n: game.name, u: game.box_art_url }));
        }

        return data.map(entity => {
            const cat = categoryCache.get(entity[gameIdKey]);
            return { game_name: cat?.n, game_thumb: cat?.u, ...entity }
        });
    },

    _addTags(data, keys) {
        if (! data || ! data.length) return [];

        return data.map(entity => {
            return { __tag: keys.reduce((acc, current) => acc + entity[current], ''), ...entity }
        });
    },

    async getTopGames(options, abortSignal = null) {
        const games = await request(endpoints.GET_TOP_GAMES, options, abortSignal);
        const data = this._addTags(games?.data, ['name']);
        return { data, pagination: games.pagination };
    },

    getGames(options, abortSignal = null) {
        return request(endpoints.GET_GAMES, options, abortSignal);
    },

    async getStreams(options, abortSignal = null) {
        const streams = await request(endpoints.GET_STREAMS, options, abortSignal);
        const data = await this._addCategories(streams.data, 'game_id');
        return { data: this._addTags(data, ['title', 'user_name', 'user_login', 'game_name']), pagination: streams.pagination };
    },

    async getVideos(options, abortSignal = null) {
        const videos = await request(endpoints.GET_VIDEOS, options, abortSignal);
        return { data: this._addTags(videos?.data, ['user_login', 'title']), pagination: videos.pagination };
    },

    async getClips(options, abortSignal = null) {
        const clips = await request(endpoints.GET_CLIPS, options, abortSignal);
        const data = await this._addCategories(clips.data, 'game_id');
        return { data: this._addTags(data, ['broadcaster_name', 'title']), pagination: clips.pagination };
    },

    async getFollowedStreams(options) {
        const streams = await request(endpoints.GET_FOLLOWED_STREAMS, options);
        const data = await this._addCategories(streams.data, 'game_id');
        return { data: this._addTags(data, ['title', 'user_name', 'user_login', 'game_name']), pagination: streams.pagination };
    },

    async searchGames(options) {
        const games = await request(endpoints.SEARCH_GAMES, options);
        return { data: this._addTags(games?.data, ['name']), pagination: games.pagination };
    },
    async searchChannels(options) {
        const channels = await request(endpoints.SEARCH_CHANNELS, options);
        return { data: this._addTags(channels?.data, ['broadcaster_login', 'display_name']), pagination: channels.pagination };
    },

    async getUserFollows(options) {
        const users = await request(endpoints.GET_USER_FOLLOWS, options);
        return { data: this._addTags(users?.data, ['login', 'display_name']) };
    },

    async getUsers(options) {
        const users = await request(endpoints.GET_USERS, options);
        return { data: this._addTags(users?.data, ['login', 'display_name']) };
    },
}

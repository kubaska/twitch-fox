/* global browser */

export default {
    sendBrowserMessage: (content) => browser.runtime.sendMessage({ content }).catch(err => {}),

    delimitNumber: (number = 0) => {
        return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },

    // Used by stream cards.
    // Returns difference in HH:MM:SS format between supplied and current time.
    timeSince: (date, now) => {
        const secs = Math.floor((now - date.getTime()) / 1000);
        const hr = Math.floor(secs/3600);
        return (hr?`${hr}:`:'')+('0'+Math.floor(secs/60)%60).slice(-2)+':'+('0'+(secs%60)).slice(-2)
    },
    // Used by video cards.
    // Converts "13h23m42s" format to 13:23:42, "1h9m1s" to 1:09:01 and "44s" to 0:44.
    formattedTimeToHHMMSS: (time) => {
        const parts = time.split(/[a-zA-Z]/g).filter(_=>_);
        if (parts.length === 1) parts.unshift('0');
        return parts.map((part, index) => {
            if (index) return part.padStart(2, '0');
            else return part;
        }).join(':');
    },
    // Used by clip cards. Formats seconds to MM:SS format.
    // Eg. 43 => 0:43, 43,7 => 0:43
    secondsToMMSS: (seconds) => {
        seconds = Math.round(seconds);
        return ('0'+Math.floor(seconds/60)%60).slice(-2)+':'+('0'+(seconds%60)).slice(-2);
    },
    // Same as (new Date()).toISOString() but without ms part.
    getISODateStringNoMs: (date) => {
        if (date) return (new Date(date)).toISOString().replace(/\.\d{3}/, '');
        else return (new Date()).toISOString().replace(/\.\d{3}/, '');
    },
    // A cheap way to solve JS DeadObject issues when communicating
    // between background and UI tabs
    cloneObj: (obj) => {
        return JSON.parse(JSON.stringify(obj));
    },

    getClipDateRange: (time) => {
        switch (time) {
            case 'day':
                return { started_at: (new Date(Date.now() - 24 * 60 * 60 * 1000)).toISOString() };
            case 'week':
                return { started_at: (new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).toISOString() };
            case 'month':
                return {
                    started_at: (new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).toISOString(),
                    ended_at: (new Date(Date.now())).toISOString()
                };
            case 'year':
                return {
                    started_at: (new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)).toISOString(),
                    ended_at: (new Date(Date.now())).toISOString()
                };
            case 'all':
                return {
                    started_at: (new Date(2010, 0, 1, 0, 0, 0)).toISOString(),
                    ended_at: (new Date(Date.now())).toISOString()
                };
        }
    },

    // Twitch stuff
    openStream: (streamer) => {
        browser.tabs.create({
            url: 'https://twitch.tv/'+streamer
        });
    },
    openPopout: (type, id) => {
        browser.windows.create({
            url: type === 'clip'
                ? 'https://clips.twitch.tv/embed?parent=localhost&clip=' + id
                : `https://player.twitch.tv/?parent=localhost&${type}=${id}`,
            width: 1280,
            height: 740,
            type: 'popup'
        });
    },
    openChatPopout: (streamer) => {
        browser.windows.create({
            url: `https:/twitch.tv/${streamer}/chat?popout`,
            height: 600,
            width: 340,
            type: 'popup'
        });
    },
    openGameDirectory: (game) => {
        browser.tabs.create({
            url: 'https://www.twitch.tv/directory/game/'+game
        });
    },
    openClip: (id) => {
        browser.tabs.create({
            url: 'https://clips.twitch.tv/'+id
        });
    },
    openVideo: (id) => {
        browser.tabs.create({
            url: 'https://twitch.tv/videos/'+id
        });
    }
}

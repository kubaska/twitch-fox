/* global browser */

export default {
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
    cloneObj: (obj) => {
        return JSON.parse(JSON.stringify(obj));
    },

    // Twitch stuff
    openStream: (streamer) => {
        browser.tabs.create({
            url: 'https://twitch.tv/'+streamer
        });
    },
    openStreamPopout: (streamer) => {
        browser.windows.create({
            url: 'https://player.twitch.tv/?parent=localhost&channel='+streamer,
            width: 1280,
            height: 720,
            type: 'popup'
        });
    },
    openChatPopout: (streamer) => {
        browser.windows.create({
            url: `https:/twitch.tv/${streamer}/chat?popout`,
            height: 600,
            width: 340,
            type: 'popup',
        });
    },
    openGameDirectory: (game) => {
        browser.tabs.create({
            url: 'https://www.twitch.tv/directory/game/'+game
        });
    },
    openClip: (id) => {
        browser.tabs.create({
            url: 'https://clips.twitch.tv/'+id,
        });
    },
    openVideo: (id) => {
        browser.tabs.create({
            url: 'https://twitch.tv/videos/'+id,
        });
    }
}

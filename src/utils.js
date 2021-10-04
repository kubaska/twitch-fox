/* global browser */

export default {
    delimitNumber: () => {

    },
    timeSince: (date, now) => {
        const secs = Math.floor((now - date.getTime()) / 1000);
        const hr = Math.floor(secs/3600);
        return (hr?`${hr}:`:'')+('0'+Math.floor(secs/60)%60).slice(-2)+':'+('0'+(secs%60)).slice(-2)
    },
    secondsToHHMMSS: (seconds) => {
        const hr = Math.floor(seconds/3600);
        return (hr?`${hr}:`:'')+('0'+Math.floor(seconds/60)%60).slice(-2)+':'+('0'+(seconds%60)).slice(-2);
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

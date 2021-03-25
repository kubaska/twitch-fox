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
        return (hr?`${hr}:`:'')+('0'+Math.floor(seconds/60)%60).slice(-2)+':'+('0'+(seconds%60)).slice(-2)
    }
}

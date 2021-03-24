const bp = browser.extension.getBackgroundPage();

const nonTwitch = document.getElementById('nonTwitch');
const notification = document.getElementById('notification');
const audioNotification = document.getElementById('audioNotification');
const unfavoriteAll = document.getElementById('unfavoriteAll');
const unfollowAll = document.getElementById('unfollowAll');
const alarmLimit = document.getElementById('alarmLimit');
const testAudioNotification = document.getElementById('testAudioNotification');
const importButton = document.getElementById('importButton');
const exportFollows = document.getElementById('exportFollows');

nonTwitch.style.display = bp.getStorage('nonTwitchFollows') &&
!bp.getAuthorizedUser() ? 'inline' : 'none';
notification.style.display = bp.getAuthorizedUser() ||
bp.getStorage('nonTwitchFollows') ? 'inline' : 'none';
audioNotification.style.display =
    bp.getStorage('favoritesAudioNotifications') ||
    bp.getStorage('nonfavoritesAudioNotifications') ? 'inline' : 'none';
unfavoriteAll.style.display = bp.getStorage('favorites').length ? 'inline' :
    'none';
unfollowAll.style.display = bp.getStorage('follows').length ? 'inline' :
    'none';

alarmLimit.style.display = bp.getStorage('limitAlarm') ? 'inline' : 'none';

const i18ns = document.getElementsByClassName('i18n');
for (let i = 0; i < i18ns.length; i += 1) {
    const i18n = i18ns[i];
    if (i18n.id === 'unfavoriteAll') {
        i18n.value = browser.i18n.getMessage(
            i18n.id,
            bp.getStorage('favorites').length,
        );
    } else if (i18n.id === 'unfollowAll') {
        i18n.value = browser.i18n.getMessage(
            i18n.id,
            bp.getStorage('follows').length,
        );
    } else if (i18n.classList.contains('button')) {
        i18n.value = browser.i18n.getMessage(i18n.id);
    } else {
        i18n.textContent = browser.i18n.getMessage(i18n.id);
    }
}

const checkboxes = document.getElementsByClassName('checkbox');
for (let i = 0; i < checkboxes.length; i += 1) {
    let checkbox = checkboxes[i];
    checkbox.checked = bp.getStorage(checkbox.id);
    checkbox.addEventListener('change', (e) => {
        checkbox = e.target;
        bp.setStorage(checkbox.id, checkbox.checked);
        if (checkbox.id === 'nonTwitchFollows') bp.initFollows();
    });
}

const numbers = document.getElementsByClassName('number');
for (let i = 0; i < numbers.length; i += 1) {
    let number = numbers[i];
    number.value = bp.getStorage(number.id);
    number.addEventListener('change', (e) => {
        number = e.target;
        let val = Number(number.value);
        const {
            min,
            max,
        } = number;
        val = Number.isNaN(val) ? bp.getStorage(number.id) : val;
        if (min !== '') val = val < Number(min) ? Number(min) : val;
        if (max !== '') val = val > Number(max) ? Number(max) : val;
        number.value = val;
        bp.setStorage(number.id, val);
    });
}

const texts = document.getElementsByClassName('text');
for (let i = 0; i < texts.length; i += 1) {
    let text = texts[i];
    text.value = bp.getStorage(text.id);
    text.addEventListener('change', (e) => {
        text = e.target;
        bp.setStorage(text.id, text.value);
    });
}

unfavoriteAll.addEventListener('click', () => {
    if (unfavoriteAll.value === browser.i18n.getMessage('areYouSure')) {
        bp.unfavoriteAll();
    } else {
        unfavoriteAll.value = browser.i18n.getMessage('areYouSure');
        window.setTimeout(() => {
            unfavoriteAll.value = browser.i18n.getMessage(
                'unfavoriteAll',
                bp.getStorage('favorites').length,
            );
        }, 2000);
    }
});

unfollowAll.addEventListener('click', () => {
    if (unfollowAll.value === browser.i18n.getMessage('areYouSure')) {
        bp.unfollowAll();
    } else {
        unfollowAll.value = browser.i18n.getMessage('areYouSure');
        window.setTimeout(() => {
            unfollowAll.value = browser.i18n.getMessage(
                'unfollowAll',
                bp.getStorage('follow').length,
            );
        }, 2000);
    }
});

importButton.addEventListener('change', () => {
    const file = importButton.files[0];
    const reader = new FileReader();
    reader.onload = () => bp.importFollows(reader.result);
    reader.readAsText(file);
});

exportFollows.addEventListener('click', () => {
    const textToWrite = JSON.stringify(bp.getStorage('follows'));
    const textFileAsBlob = new Blob([textToWrite], {
        type: 'text/plain',
    });
    const fileName = `Twitch_Fox_${new Date().toJSON().slice(0, 10)}.txt`;
    const downloadLink = document.createElement('a');
    downloadLink.download = fileName;
    downloadLink.textContent = 'Save follows';
    downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
    downloadLink.style.display = 'none';
    document.body.appendChild(downloadLink);
    downloadLink.click();
});

testAudioNotification.addEventListener('click', () => bp.playAlarm(true));

browser.runtime.onMessage.addListener(() => window.location.reload());

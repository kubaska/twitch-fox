/* global browser */

const bp = browser.extension.getBackgroundPage();

function getInputType(element) {
    return { tagName: element.tagName.toLowerCase(), type: element.type.toLowerCase() };
}

function saveOption(event) {
    const { tagName, type } = getInputType(event.target);

    if (tagName === 'input') {
        if (type === 'text') {
            bp.setStorage(event.target.dataset['internal'], event.target.value);
        }
        else if (type === 'number') {
            if (! event.target.checkValidity()) return;

            bp.setStorage(event.target.dataset['internal'], parseInt(event.target.value));
        }
        else if (type === 'checkbox') {
            bp.setStorage(event.target.dataset['internal'], event.target.checked);
        }
    }
}

// fill settings
document.querySelectorAll('[data-internal]').forEach(control => {
    const { tagName, type } = getInputType(control);

    if (tagName === 'input') {
        if (type === 'text' || type === 'number') {
            control.value = bp.getStorage(control.dataset['internal']);
        }
        else if (type === 'checkbox') {
            control.checked = !!bp.getStorage(control.dataset['internal']);
        }
    }

    control.addEventListener('change', saveOption);
});

// fill follow list
document.getElementById('localFollowsList').innerHTML = bp.getStorage('localFollows').map(follow => {
    return `<div class="follow">
<span>[${follow.id}] ${follow.name || '(name unknown)'}</span>
<span class="follow-remove" data-follow-id="${follow.id}" data-stream-name="${follow.name}">remove</span>
</div>`;
}).join('');

document.querySelectorAll('.follow-remove').forEach(btn => {
    btn.addEventListener('click', removeFollow);
})

function removeFollow(e) {
    bp.unfollow(parseInt(e.target.dataset['followId']), e.target.dataset['streamName']);
    document.removeEventListener(e.target, removeFollow);
    e.target.parentElement.remove();
}

// import & export
document.getElementById('importFollows').addEventListener('change', (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
        bp.importFollows(reader.result);
    }
    reader.readAsText(file);
});

document.getElementById('exportFollows').addEventListener('click', () => {
    const textToWrite = JSON.stringify(bp.getStorage('localFollows'));
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

document.getElementById('testAudioNotification').addEventListener('click', () => bp.playAlarm(true));

// browser.runtime.onMessage.addListener(() => window.location.reload());

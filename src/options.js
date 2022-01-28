/* global browser */

const bp = browser.extension.getBackgroundPage();
let resetSettingsCounter = 3;

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
            if (event.target.dataset['flag']) {
                bp.setStorage(event.target.dataset['internal'], event.target.dataset['flag'], event.target.checked);
            } else {
                bp.setStorage(event.target.dataset['internal'], event.target.checked);
            }
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
            if (control.dataset['flag']) {
                control.checked = bp.getStorage(control.dataset['internal'], parseInt(control.dataset['flag']));
            } else {
                control.checked = !!bp.getStorage(control.dataset['internal']);
            }
        }
    }

    control.addEventListener('change', saveOption);
});
document.getElementById('switchStorageEngine').checked = bp.getStorage('engine') === 'sync';

function showImportError(message) {
    const err = document.getElementById('importFollowsMessage');
    err.textContent = 'Import error: ' + message;
    err.classList.remove('d-none');
}

// import & export
document.getElementById('importFollowsHandle').addEventListener('change', (e) => {
    const message = document.getElementById('importFollowsMessage');
    message.classList.add('d-none');

    const file = e.target.files[0];

    if (! file) return;
    if (! file.name.endsWith('.txt')) return showImportError('Invalid file');

    const reader = new FileReader();

    reader.onload = () => {
        let parsed = null;
        try {
            parsed = JSON.parse(reader.result);
        } catch (e) {
            return showImportError('Error parsing file: invalid file');
        }

        // check if file structure is correct
        if (! Array.isArray(parsed)) return showImportError('Invalid file structure');
        if (parsed.length < 1) return showImportError('Invalid file structure: missing entries');

        const entryType = typeof parsed[0]; // string for legacy, object for v4.3.0+

        if (! (entryType === 'string' || entryType === 'object')) return showImportError('Invalid entry structure');

        // check if structure is consistent
        let result = parsed.every(element => {
            const type = typeof element;

            // check if all entries have the correct type
            if (type !== entryType) return false;

            // check if object type contains ID - required field
            if (type === 'object' && ! element.id) return false;

            return true;
        });

        if (! result) return showImportError('Inconsistent file structure: is the file corrupted?');

        const onError = (err) => {
            message.textContent = `Error importing follows. Try turning off synchronization below and try again. (${err?.message ?? err})`;
            message.classList.remove('d-none');
        }

        if (entryType === 'string') {
            bp.importFollowsLegacy(reader.result)
                .catch(onError);
        }
        else if (entryType === 'object') {
            bp.importFollows(reader.result)
                .catch(onError);
        }

        document.getElementById('importFollows').value = '';
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

document.getElementById('switchStorageEngine').addEventListener('change', (e) => {
    e.target.disabled = 'disabled';
    const message = document.getElementById('switchStorageEngineMessage');

    bp._storage().switchEngine(e.target.checked ? 'sync' : 'local')
        .then(result => {
            if (result === true) {
                message.classList.add('success-message');
                message.textContent = 'Success!';
                message.classList.remove('d-none');
            } else {
                message.classList.add('error-message');
                message.textContent = result ? `There was an error moving data. (${result})` : 'Something went wrong.';
                message.classList.remove('d-none');
            }
        })
});

document.getElementById('resetSettings').addEventListener('click', (e) => {
    switch (resetSettingsCounter) {
        case 3:
            e.target.textContent = 'Are you sure?';
            break;
        case 2:
            e.target.textContent = 'This action is permanent!';
            break;
        case 1:
            e.target.textContent = 'Remove all settings';
            break;
        case 0:
            e.target.disabled = 'disabled';

            bp._storage().resetSettings()
                .then(() => {
                    bp.deauthorize();
                    window.location.reload();
                });
            break;
    }

    resetSettingsCounter--;
});

document.getElementById('testAudioNotification').addEventListener('click', () => bp.playAlarm(true));
document.getElementById('importFollows').addEventListener('click', () => {
    document.getElementById('importFollowsHandle').click();
});

// browser.runtime.onMessage.addListener(() => window.location.reload());

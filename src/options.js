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

function showImportError(message) {
    const err = document.querySelector('.error-message');
    err.innerText = 'Import error: ' + message;
    err.classList.remove('d-none');
}

// import & export
document.getElementById('importFollows').addEventListener('change', (e) => {
    document.querySelector('.error-message').classList.add('d-none');

    const file = e.target.files[0];

    if (! file) return;
    if (! file.name.endsWith('.txt')) return showImportError('Invalid file');

    const reader = new FileReader();

    reader.onload = () => {
        let parsed = null;
        try {
            parsed = JSON.parse(reader.result);
        } catch (e) {
            console.log(e);
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

        if (entryType === 'string') {
            bp.importFollowsLegacy(reader.result);
        }
        else if (entryType === 'object') {
            bp.importFollows(reader.result);
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

document.getElementById('testAudioNotification').addEventListener('click', () => bp.playAlarm(true));

// browser.runtime.onMessage.addListener(() => window.location.reload());

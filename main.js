(function () {
  const infoEl = document.getElementById('info');
  const controlsEl = document.getElementById('controls');
  const selectedEl = document.getElementById('selected-entry');
  const createBtn = document.getElementById('create-entry');

  function setInfo(text) {
    infoEl.textContent = text;
  }

  // Defensive initialization: support different SDKs / versions
  function initExtension(initFn) {
    if (window.ContentstackUI && typeof window.ContentstackUI.init === 'function') {
      return window.ContentstackUI.init().then(initFn);
    }
    if (window.Contentstack && typeof window.Contentstack.init === 'function') {
      return window.Contentstack.init().then(initFn);
    }
    if (window.contentstack && typeof window.contentstack.init === 'function') {
      return window.contentstack.init().then(initFn);
    }
    if (window.ContentstackUIExtensions && typeof window.ContentstackUIExtensions.init === 'function') {
      return window.ContentstackUIExtensions.init().then(initFn);
    }
    if (window.ContentstackUIExtensions) {
      try {
        return Promise.resolve(window.ContentstackUIExtensions.init()).then(initFn);
      } catch (e) {
        return Promise.reject(e);
      }
    }
    return Promise.reject(new Error('Contentstack UI Extensions SDK not found. Check your script include in index.html'));
  }

  initExtension(function (extension) {
    setInfo('Extension ready');
    controlsEl.style.display = 'flex';

    function getFieldValue() {
      if (extension.field && typeof extension.field.getValue === 'function') {
        return Promise.resolve(extension.field.getValue());
      }
      if (extension.field && typeof extension.field.get === 'function') {
        return Promise.resolve(extension.field.get()).then(f => f.value || null);
      }
      try {
        return Promise.resolve(extension.field.getValueSync());
      } catch (e) {
        return Promise.resolve(null);
      }
    }

    function setFieldValue(value) {
      if (extension.field && typeof extension.field.setValue === 'function') {
        return Promise.resolve(extension.field.setValue(value));
      }
      if (extension.field && typeof extension.field.set === 'function') {
        return Promise.resolve(extension.field.set(value));
      }
      return Promise.reject(new Error('No set API available on extension.field'));
    }

    getFieldValue().then(val => {
      if (val && (typeof val === 'object' || typeof val === 'string')) {
        selectedEl.textContent = 'Selected: ' + (val.uid || JSON.stringify(val));
      } else {
        selectedEl.textContent = 'No entry selected yet.';
      }
    }).catch(() => {
      selectedEl.textContent = 'Unable to read current field value.';
    });

    createBtn.addEventListener('click', function () {
      setInfo('Opening create-entry popup...');

      const createOptions = {
        contentTypeUid: extension.field && extension.field.config && extension.field.config.content_type_uid || null,
        locale: extension.locale && extension.locale.code || extension.local || 'en-us'
      };

      function openNativePopup() {
        if (typeof extension.openEntry === 'function') {
          return Promise.resolve(extension.openEntry(createOptions));
        }
        if (typeof extension.createEntry === 'function') {
          return Promise.resolve(extension.createEntry(createOptions));
        }
        if (extension.stack && typeof extension.stack.createEntry === 'function') {
          return Promise.resolve(extension.stack.createEntry(createOptions));
        }
        return Promise.reject(new Error('Native create popup API not available on this SDK instance'));
      }

      openNativePopup().then(result => {
        setInfo('Entry created — saving to field.');
        const createdUid = (result && (result.uid || result.data && result.data.uid)) || result;
        const valueToSave = createdUid ? { uid: createdUid } : result;
        setFieldValue(valueToSave).then(() => {
          selectedEl.textContent = 'Selected: ' + (createdUid || JSON.stringify(valueToSave));
          setInfo('Saved created entry to the field.');
        }).catch(err => {
          setInfo('Could not save created entry to the field: ' + (err && err.message));
        });
      }).catch(err => {
        console.warn('Native popup failed or not available:', err);
        setInfo('Native popup not available — opening new tab to create entry.');
        const stackUrl = extension && extension.stack && extension.stack.url ? extension.stack.url : 'https://app.contentstack.com';
        const ct = (extension.field && extension.field.config && extension.field.config.content_type_uid) || '';
        const createUrl = `${stackUrl}/stacks/${encodeURIComponent(extension.stack ? extension.stack.name : '')}/content-types/${ct}/entries/new`;
        window.open(createUrl, '_blank');
      });
    });

    if (extension.field && typeof extension.field.onChanged === 'function') {
      extension.field.onChanged(() => {
        getFieldValue().then(val => {
          selectedEl.textContent = 'Selected: ' + (val && (val.uid || JSON.stringify(val)));
        });
      });
    }

  }).catch(err => {
    setInfo('Initialization failed: ' + (err && err.message));
    console.error(err);
  });
})();
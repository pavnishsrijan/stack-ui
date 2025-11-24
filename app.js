// Wait for DOM to be fully loaded before initializing
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initExtension);
} else {
  initExtension();
}

async function initExtension() {
  const extension = await window.ContentstackUIExtension.init();
  const field = extension.field;
  const btn = document.getElementById("createEntryBtn");
  const valueBox = document.getElementById("selectedValue");

  // Load existing stored data
  const initValue = await field.getData();
  if (initValue) {
    showValue(initValue);
  }

  btn.onclick = async () => {
    const stack = extension.stack;

    // Read content type uid from extension config
    const refCtUid = extension.config.content_type_uid;

    if (!refCtUid) {
      alert("ERROR: Missing content_type_uid in extension configuration.");
      return;
    }

    // Open "Create Entry" popup
    const res = await stack.createEntry(refCtUid, {
      locale: extension.locale
    });

    if (!res || !res.data || !res.data.entry) {
      alert("Entry creation failed.");
      return;
    }

    const entryUid = res.data.entry.uid;

    // Save reference value
    await field.setData([
      {
        uid: entryUid,
        _content_type: refCtUid
      }
    ]);

    showValue(entryUid);
  };

  function showValue(val) {
    valueBox.style.display = "block";
    valueBox.innerHTML = "<b>Selected Entry UID:</b><br>" + JSON.stringify(val);
  }

  // Adjust height after content is loaded
  setTimeout(() => {
    extension.window.updateHeight();
  }, 100);
}

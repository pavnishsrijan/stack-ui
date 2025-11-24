var extensionField;

ContentstackUIExtension.init().then(function(extension) {
  extensionField = extension;
  var field = extension.field;
  var btn = document.getElementById("createEntryBtn");
  var valueBox = document.getElementById("selectedValue");

  // Load existing data
  var initValue = field.getData();
  if (initValue) {
    valueBox.style.display = "block";
    valueBox.innerHTML = "<b>Selected Entry UID:</b><br>" + JSON.stringify(initValue);
  }

  // Update height
  extension.window.updateHeight();

  // Button handler
  btn.onclick = function() {
    var refCtUid = extension.config.content_type_uid;

    if (!refCtUid) {
      alert("ERROR: Missing content_type_uid in extension configuration.");
      return;
    }

    extension.stack.createEntry(refCtUid, {
      locale: extension.locale
    }).then(function(res) {
      if (!res || !res.data || !res.data.entry) {
        alert("Entry creation failed.");
        return;
      }

      var entryUid = res.data.entry.uid;

      field.setData([{
        uid: entryUid,
        _content_type: refCtUid
      }]).then(function() {
        valueBox.style.display = "block";
        valueBox.innerHTML = "<b>Selected Entry UID:</b><br>" + entryUid;
        extension.window.updateHeight();
      });
    }).catch(function(error) {
      console.error("Error:", error);
      alert("Failed to create entry.");
    });
  };
}).catch(function(error) {
  console.error('Init failed:', error);
});

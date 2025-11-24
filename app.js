// Global extension object
var extensionField;

// Initialize extension IMMEDIATELY to register post-robot handlers
ContentstackUIExtension.init().then(function(extension) {
  // Make extension globally available
  extensionField = extension;

  var field = extension.field;

  // Wait for DOM if needed
  function initUI() {
    var btn = document.getElementById("createEntryBtn");
    var valueBox = document.getElementById("selectedValue");

    if (!btn || !valueBox) {
      // DOM not ready yet, wait a bit
      setTimeout(initUI, 50);
      return;
    }

    // Load existing stored data
    var initValue = field.getData();
    if (initValue) {
      showValue(initValue);
    }

    // Update height after initialization
    extension.window.updateHeight();

    // Button click handler
    btn.onclick = function() {
      var stack = extension.stack;
      var refCtUid = extension.config.content_type_uid;

      if (!refCtUid) {
        alert("ERROR: Missing content_type_uid in extension configuration.");
        return;
      }

      // Open "Create Entry" popup
      stack.createEntry(refCtUid, {
        locale: extension.locale
      }).then(function(res) {
        if (!res || !res.data || !res.data.entry) {
          alert("Entry creation failed.");
          return;
        }

        var entryUid = res.data.entry.uid;

        // Save reference value
        field.setData([
          {
            uid: entryUid,
            _content_type: refCtUid
          }
        ]).then(function() {
          showValue(entryUid);
          extension.window.updateHeight();
        });
      }).catch(function(error) {
        console.error("Error creating entry:", error);
        alert("Failed to create entry. Please try again.");
      });
    };

    function showValue(val) {
      valueBox.style.display = "block";
      valueBox.innerHTML = "<b>Selected Entry UID:</b><br>" + JSON.stringify(val);
    }
  }

  // Start UI initialization
  initUI();

}).catch(function(error) {
  console.error('Extension initialization failed:', error);
});

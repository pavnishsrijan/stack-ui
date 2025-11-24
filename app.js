var extensionField;

ContentstackUIExtension.init().then(function(extension) {
  extensionField = extension;
  var field = extension.field;
  var btn = document.getElementById("createEntryBtn");
  var entryList = document.getElementById("entryList");
  var emptyState = document.getElementById("emptyState");

  // Debug: Log available methods and data
  console.log("Extension object:", extension);
  console.log("Available stack methods:", extension.stack);
  console.log("Stack getData:", extension.stack ? extension.stack.getData() : null);
  console.log("Content type:", extension.contentType);
  console.log("Entry:", extension.entry);

  // Get stack API key from extension
  var stackData = extension.stack ? extension.stack.getData() : null;
  var STACK_API_KEY = stackData ? stackData.api_key : null;

  console.log("Stack API Key:", STACK_API_KEY);
  console.log("Stack Data:", stackData);

  // Get referenced content types from field schema
  var fieldSchema = field.schema;
  var referenceTo = fieldSchema.reference_to || [];
  var isMultiple = fieldSchema.multiple || false;

  console.log("Field Schema:", fieldSchema);
  console.log("Reference To:", referenceTo);
  console.log("Multiple:", isMultiple);

  // Load existing data and display
  var currentData = field.getData() || [];
  if (!Array.isArray(currentData)) {
    currentData = [];
  }

  // Check if we're returning from entry creation
  checkForNewlyCreatedEntry();

  renderEntries();
  extension.window.updateHeight();

  // Button handler - Create new entry
  btn.onclick = function() {
    // If only one content type referenced, use it directly
    if (referenceTo.length === 1) {
      createEntry(referenceTo[0]);
    } else if (referenceTo.length > 1) {
      // Multiple content types - show selection
      showContentTypeSelector(referenceTo);
    } else {
      alert("ERROR: No content types configured for this reference field.");
    }
  };

  // Listen for messages from Contentstack about created entries
  window.addEventListener('message', function(event) {
    // Verify it's from Contentstack
    if (event.origin !== 'https://app.contentstack.com') {
      return;
    }

    console.log("Received message:", event.data);

    // Check if it's an entry save event
    if (event.data && event.data.type === 'entry-save' && event.data.entry) {
      var savedEntry = event.data.entry;
      console.log("Entry saved:", savedEntry);

      var newEntry = {
        uid: savedEntry.uid,
        _content_type_uid: savedEntry._content_type_uid || savedEntry.content_type_uid
      };

      // Add to current data
      if (isMultiple) {
        currentData.push(newEntry);
      } else {
        currentData = [newEntry];
      }

      // Save to field
      field.setData(currentData).then(function() {
        renderEntries();
        extension.window.updateHeight();
        console.log("Entry added to field:", newEntry);
      });
    }
  });

  // Check if we're returning from entry creation
  function checkForNewlyCreatedEntry() {
    try {
      var savedState = sessionStorage.getItem('cs_ref_field_creating');
      if (savedState) {
        var state = JSON.parse(savedState);
        console.log("Detected return from entry creation:", state);

        // Clear the state
        sessionStorage.removeItem('cs_ref_field_creating');

        // Check if we're in the right entry and field
        var currentEntry = extension.entry.getData();
        if (currentEntry && currentEntry.uid) {
          // Query for the latest entry from the content type
          queryLatestEntryAndAdd(state.contentType);
        }
      }
    } catch(e) {
      console.warn("Could not check session state:", e);
    }
  }

  // Query latest entry and add to field
  function queryLatestEntryAndAdd(contentTypeUid) {
    console.log("Querying latest entry from:", contentTypeUid);

    extension.stack.ContentType(contentTypeUid).Entry.Query()
      .limit(1)
      .descending('created_at')
      .find()
      .then(function(result) {
        if (result && result[0] && result[0][0]) {
          var latestEntry = result[0][0];
          console.log("Latest entry found:", latestEntry);

          var newEntry = {
            uid: latestEntry.uid,
            _content_type_uid: contentTypeUid
          };

          // Add to field
          if (isMultiple) {
            // Check if already exists
            var exists = currentData.some(function(e) {
              return e.uid === latestEntry.uid;
            });
            if (!exists) {
              currentData.push(newEntry);
            }
          } else {
            currentData = [newEntry];
          }

          field.setData(currentData).then(function() {
            renderEntries();
            extension.window.updateHeight();

            // Show success notification
            var success = document.createElement('div');
            success.innerHTML = '✓ Entry added to field successfully';
            success.style.cssText = 'position: fixed; top: 16px; right: 16px; background: #10b981; color: white; padding: 12px 20px; border-radius: 4px; font-weight: 500; font-size: 13px; z-index: 100000; box-shadow: 0 4px 12px rgba(0,0,0,0.15);';
            document.body.appendChild(success);
            setTimeout(function() {
              if (document.body.contains(success)) {
                document.body.removeChild(success);
              }
            }, 2500);
          });
        }
      })
      .catch(function(error) {
        console.error("Error querying entries:", error);
      });
  }

  // Create entry - Navigate to Contentstack's native entry creation page
  function createEntry(contentTypeUid) {
    console.log("Creating entry for:", contentTypeUid);

    var stackData = extensionField.stack.getData();
    var apiKey = stackData.api_key;
    var locale = extensionField.locale || 'en-us';

    // Build Contentstack entry creation URL
    var baseUrl = "https://app.contentstack.com";
    var createUrl = baseUrl + "/#!/stack/" + apiKey + "/content-type/" + contentTypeUid + "/" + locale + "/entry/create";

    console.log("Navigating to entry creation:", createUrl);

    // Store state to identify we're creating from this extension
    try {
      sessionStorage.setItem('cs_ref_field_creating', JSON.stringify({
        contentType: contentTypeUid,
        timestamp: Date.now(),
        fieldUid: extensionField.field.uid
      }));
    } catch(e) {
      console.warn("Could not save session state:", e);
    }

    // Navigate to entry creation page in same window
    window.top.location.href = createUrl;
  }

  // Query for the latest entry and add to field
  function queryLatestEntry(contentTypeUid) {
    if (!extension.stack || !extension.stack.ContentType) {
      console.log("Cannot query entries - method not available");
      return;
    }

    console.log("Querying latest entry from:", contentTypeUid);

    extension.stack.ContentType(contentTypeUid).Entry.Query()
      .limit(1)
      .descending('created_at')
      .find()
      .then(function(result) {
        if (result && result[0] && result[0][0]) {
          var latestEntry = result[0][0];
          console.log("Latest entry found:", latestEntry);

          // Ask user if they want to add this entry
          var message = "Add this entry to the field?\n\n" +
                        "UID: " + latestEntry.uid + "\n" +
                        "Title: " + (latestEntry.title || 'Untitled');

          if (confirm(message)) {
            var newEntry = {
              uid: latestEntry.uid,
              _content_type_uid: contentTypeUid
            };

            if (isMultiple) {
              currentData.push(newEntry);
            } else {
              currentData = [newEntry];
            }

            field.setData(currentData).then(function() {
              renderEntries();
              extension.window.updateHeight();
              alert("Entry added successfully!");
            });
          }
        } else {
          console.log("No entries found");
        }
      })
      .catch(function(error) {
        console.error("Error querying entries:", error);
      });
  }


  // Show content type selector if multiple types
  function showContentTypeSelector(contentTypes) {
    var ctList = document.createElement("div");
    ctList.className = "ct-selector";
    ctList.innerHTML = "<h4>Select Content Type:</h4>";

    contentTypes.forEach(function(ct) {
      var ctBtn = document.createElement("button");
      ctBtn.textContent = ct;
      ctBtn.className = "ct-option";
      ctBtn.onclick = function() {
        document.body.removeChild(ctList);
        createEntry(ct);
      };
      ctList.appendChild(ctBtn);
    });

    var cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.className = "ct-cancel";
    cancelBtn.onclick = function() {
      document.body.removeChild(ctList);
    };
    ctList.appendChild(cancelBtn);

    document.body.appendChild(ctList);
  }

  // Remove entry from list
  function removeEntry(index) {
    currentData.splice(index, 1);
    field.setData(currentData).then(function() {
      renderEntries();
      extension.window.updateHeight();
    });
  }

  // Open entry for editing
  function openEntry(contentTypeUid, entryUid) {
    if (!STACK_API_KEY) {
      alert("Could not determine stack API key.");
      return;
    }

    var locale = extension.locale || 'en-us';

    // Build Contentstack entry edit URL
    var baseUrl = "https://app.contentstack.com";
    var editUrl = baseUrl + "#!/stack/" + STACK_API_KEY + "/content-type/" + contentTypeUid + "/" + locale + "/entry/" + entryUid + "/edit";

    console.log("Opening edit URL:", editUrl);

    // Open in popup
    var width = 1200;
    var height = 800;
    var left = (screen.width - width) / 2;
    var top = (screen.height - height) / 2;

    var popup = window.open(
      editUrl,
      'editEntry_' + entryUid,
      'width=' + width + ',height=' + height + ',left=' + left + ',top=' + top + ',toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes'
    );

    if (!popup) {
      alert("Please allow popups for this site to edit entries.");
    }
  }

  // Render entry list
  function renderEntries() {
    entryList.innerHTML = "";

    if (currentData.length === 0) {
      emptyState.style.display = "block";
      entryList.style.display = "none";
    } else {
      emptyState.style.display = "none";
      entryList.style.display = "block";

      currentData.forEach(function(entry, index) {
        var entryDiv = document.createElement("div");
        entryDiv.className = "entry-item";

        var entryInfo = document.createElement("div");
        entryInfo.className = "entry-info";
        entryInfo.innerHTML = "<strong>UID:</strong> " + entry.uid +
                              "<br><strong>Content Type:</strong> " + entry._content_type_uid;

        // Make entry info clickable to open/edit
        entryInfo.style.cursor = "pointer";
        entryInfo.onclick = function() {
          openEntry(entry._content_type_uid, entry.uid);
        };
        entryInfo.title = "Click to edit entry";

        var buttonGroup = document.createElement("div");
        buttonGroup.className = "button-group";

        var editBtn = document.createElement("button");
        editBtn.innerHTML = "✏️ Edit";
        editBtn.className = "cs-btn cs-btn-secondary cs-btn-sm";
        editBtn.onclick = function() {
          openEntry(entry._content_type_uid, entry.uid);
        };

        var removeBtn = document.createElement("button");
        removeBtn.innerHTML = "🗑️ Remove";
        removeBtn.className = "cs-btn cs-btn-danger cs-btn-sm";
        removeBtn.onclick = function() {
          removeEntry(index);
        };

        buttonGroup.appendChild(editBtn);
        buttonGroup.appendChild(removeBtn);

        entryDiv.appendChild(entryInfo);
        entryDiv.appendChild(buttonGroup);
        entryList.appendChild(entryDiv);
      });
    }

    // Hide button if single select and already has entry
    if (!isMultiple && currentData.length > 0) {
      btn.style.display = "none";
    } else {
      btn.style.display = "inline-block";
    }
  }

}).catch(function(error) {
  console.error('Extension initialization failed:', error);
  document.body.innerHTML = '<div style="color: red; padding: 20px;">Failed to initialize. Ensure this is running within Contentstack.</div>';
});

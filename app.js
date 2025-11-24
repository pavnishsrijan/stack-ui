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

  // Create entry - Open Contentstack's native entry creation form
  function createEntry(contentTypeUid) {
    console.log("Opening Contentstack entry form for:", contentTypeUid);

    if (!STACK_API_KEY) {
      alert("Could not determine stack API key.");
      return;
    }

    var locale = extension.locale || 'en-us';

    // Build Contentstack entry creation URL
    var baseUrl = "https://app.contentstack.com";
    var createUrl = baseUrl + "#!/stack/" + STACK_API_KEY + "/content-type/" + contentTypeUid + "/" + locale + "/entry/create";

    console.log("Opening URL:", createUrl);

    // Open in popup window
    var width = 1400;
    var height = 900;
    var left = (screen.width - width) / 2;
    var top = (screen.height - height) / 2;

    var windowFeatures = 'width=' + width +
                         ',height=' + height +
                         ',left=' + left +
                         ',top=' + top +
                         ',resizable=yes' +
                         ',scrollbars=yes' +
                         ',status=yes' +
                         ',toolbar=no' +
                         ',menubar=no' +
                         ',location=yes';

    var popupWindow = window.open(createUrl, 'createEntry_' + Date.now(), windowFeatures);

    if (!popupWindow) {
      alert("Please allow popups for this site.\n\nClick 'Create New Entry' again after allowing popups.");
      return;
    }

    popupWindow.focus();

    // Monitor popup and query for latest entry when closed
    var checkInterval = setInterval(function() {
      if (popupWindow.closed) {
        clearInterval(checkInterval);
        console.log("Popup closed - querying for latest entry");

        setTimeout(function() {
          queryLatestEntry(contentTypeUid);
        }, 1000);
      }
    }, 500);
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
        editBtn.textContent = "Edit";
        editBtn.className = "edit-btn";
        editBtn.onclick = function() {
          openEntry(entry._content_type_uid, entry.uid);
        };

        var removeBtn = document.createElement("button");
        removeBtn.textContent = "Remove";
        removeBtn.className = "remove-btn";
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

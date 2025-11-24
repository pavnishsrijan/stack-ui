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

  // Check immediately on load
  console.log("Extension initialized, checking for pending entry creation...");
  setTimeout(function() {
    checkForNewlyCreatedEntry();
  }, 1000);

  // Listen for popstate event (back button)
  window.addEventListener('popstate', function(event) {
    console.log("Popstate event detected (back button)");
    setTimeout(function() {
      checkForNewlyCreatedEntry();
    }, 500);
  });

  // Listen for visibility change (tab becomes visible again)
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
      console.log("Tab became visible, checking for new entries");
      setTimeout(function() {
        checkForNewlyCreatedEntry();
      }, 500);
    }
  });

  // Listen for focus event
  window.addEventListener('focus', function() {
    console.log("Window focused, checking for new entries");
    setTimeout(function() {
      checkForNewlyCreatedEntry();
    }, 500);
  });

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

  // Debug button
  var checkStateBtn = document.getElementById('checkStateBtn');
  if (checkStateBtn) {
    checkStateBtn.onclick = function() {
      var state = localStorage.getItem('cs_ref_field_creating');
      console.log("Current localStorage state:", state);
      document.getElementById('debugText').textContent = state ? 'State found: ' + state : 'No state';
      if (state) {
        checkForNewlyCreatedEntry();
      }
    };
  }

  // Show debug info in development
  var debugInfo = document.getElementById('debugInfo');
  if (debugInfo) {
    debugInfo.style.display = 'block';
  }

  // Check if we're returning from entry creation
  function checkForNewlyCreatedEntry() {
    try {
      var savedState = localStorage.getItem('cs_ref_field_creating');
      if (!savedState) {
        console.log("No pending entry creation state found");
        return;
      }

      var state = JSON.parse(savedState);
      console.log("Found entry creation state:", state);

      // Check if it's recent (within last 30 minutes)
      var timeDiff = Date.now() - state.timestamp;
      if (timeDiff > 30 * 60 * 1000) {
        console.log("State is too old, removing");
        localStorage.removeItem('cs_ref_field_creating');
        return;
      }

      // Check if we're in the same parent entry
      var currentEntryUid = extension.entry.getData().uid || 'new';
      if (state.parentEntryUid !== currentEntryUid) {
        console.log("Different parent entry, skipping");
        return;
      }

      console.log("Returning from entry creation - querying latest entry");

      // Clear the state immediately to prevent duplicate processing
      localStorage.removeItem('cs_ref_field_creating');

      // Query for the latest entry from the content type
      queryLatestEntryAndAdd(state.contentType);
    } catch(e) {
      console.error("Error checking state:", e);
    }
  }

  // Query latest entry and add to field
  function queryLatestEntryAndAdd(contentTypeUid) {
    console.log("Querying latest entry from content type:", contentTypeUid);

    // Show loading indicator
    var loading = document.createElement('div');
    loading.innerHTML = '⏳ Loading created entry...';
    loading.id = 'loadingIndicator';
    loading.style.cssText = 'position: fixed; top: 16px; right: 16px; background: #647de8; color: white; padding: 12px 20px; border-radius: 4px; font-weight: 500; font-size: 13px; z-index: 100000; box-shadow: 0 4px 12px rgba(0,0,0,0.15);';
    document.body.appendChild(loading);

    extension.stack.ContentType(contentTypeUid).Entry.Query()
      .limit(1)
      .descending('created_at')
      .find()
      .then(function(result) {
        // Remove loading indicator
        if (document.getElementById('loadingIndicator')) {
          document.body.removeChild(loading);
        }

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
              console.log("Added new entry to multiple reference field");
            } else {
              console.log("Entry already exists in field");
            }
          } else {
            currentData = [newEntry];
            console.log("Set single reference field");
          }

          field.setData(currentData).then(function() {
            console.log("Field data saved successfully");
            renderEntries();
            extension.window.updateHeight();

            // Show success notification
            var success = document.createElement('div');
            success.innerHTML = '✓ Entry "' + (latestEntry.title || latestEntry.uid) + '" added successfully!';
            success.style.cssText = 'position: fixed; top: 16px; right: 16px; background: #10b981; color: white; padding: 12px 20px; border-radius: 4px; font-weight: 500; font-size: 13px; z-index: 100000; box-shadow: 0 4px 12px rgba(0,0,0,0.15);';
            document.body.appendChild(success);
            setTimeout(function() {
              if (document.body.contains(success)) {
                document.body.removeChild(success);
              }
            }, 3500);
          }).catch(function(err) {
            console.error("Error saving field data:", err);
            alert("Error: Could not save entry to field - " + err.message);
          });
        } else {
          console.log("No entries found for content type:", contentTypeUid);
          alert("No entry found. Please make sure you saved the entry before navigating back.");
        }
      })
      .catch(function(error) {
        // Remove loading indicator
        if (document.getElementById('loadingIndicator')) {
          document.body.removeChild(loading);
        }
        console.error("Error querying entries:", error);
        alert("Error querying entries: " + (error.error_message || error.message));
      });
  }

  // Create entry - Navigate to Contentstack's native entry creation page in parent window
  function createEntry(contentTypeUid) {
    console.log("Creating entry for:", contentTypeUid);

    var stackData = extensionField.stack.getData();
    var apiKey = stackData.api_key;
    var locale = extensionField.locale || 'en-us';
    var currentEntryData = extension.entry.getData();
    var currentEntryUid = currentEntryData.uid;
    var parentContentType = extension.contentType;

    // Build return URL - back to parent entry edit page
    var baseUrl = "https://app.contentstack.com";
    var returnUrl;

    if (currentEntryUid) {
      // Existing entry - return to edit page
      returnUrl = baseUrl + "/#!/stack/" + apiKey + "/content-type/" + parentContentType + "/" + locale + "/entry/" + currentEntryUid + "/edit";
    } else {
      // New entry - return to create page
      returnUrl = baseUrl + "/#!/stack/" + apiKey + "/content-type/" + parentContentType + "/" + locale + "/entry/create";
    }

    // Build entry creation URL with return URL parameter
    var createUrl = baseUrl + "/#!/stack/" + apiKey + "/content-type/" + contentTypeUid + "/" + locale + "/entry/create?return_to=" + encodeURIComponent(returnUrl);

    console.log("Parent entry URL:", returnUrl);
    console.log("Create URL with return:", createUrl);

    // Store state to identify we're creating from this extension
    try {
      localStorage.setItem('cs_ref_field_creating', JSON.stringify({
        contentType: contentTypeUid,
        timestamp: Date.now(),
        fieldUid: field.uid,
        parentEntryUid: currentEntryUid || 'new',
        parentContentType: parentContentType,
        locale: locale,
        returnUrl: returnUrl
      }));
      console.log("Saved state to localStorage");
    } catch(e) {
      console.error("Could not save state:", e);
    }

    // Try to navigate parent window
    try {
      if (window.parent && window.parent !== window) {
        console.log("Attempting to navigate parent window");

        // Try direct assignment
        try {
          window.parent.location.href = createUrl;
          console.log("Parent window navigation successful");
        } catch(ex) {
          console.log("Parent location assignment blocked:", ex);
          // Fallback: open in same window (will still be in full context)
          window.top.location.href = createUrl;
        }
      } else {
        window.location.href = createUrl;
      }
    } catch(e) {
      console.error("Navigation error:", e);
      // Final fallback - try window.top
      try {
        window.top.location.href = createUrl;
      } catch(ex) {
        console.error("All navigation methods failed");
        alert("Unable to navigate. Please allow navigation or disable popup blockers.");
      }
    }
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

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

  // Create entry - Show form modal with common fields
  function createEntry(contentTypeUid) {
    console.log("Creating entry for:", contentTypeUid);
    showEntryCreationForm(contentTypeUid);
  }

  // Show entry creation form with common fields
  function showEntryCreationForm(contentTypeUid) {
    console.log("Showing entry creation form for:", contentTypeUid);

    // Create modal
    var modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.7); z-index: 99999; display: flex; align-items: center; justify-content: center; overflow: auto;';

    var container = document.createElement('div');
    container.style.cssText = 'background: white; width: 90%; max-width: 700px; max-height: 90vh; display: flex; flex-direction: column; border-radius: 6px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);';

    // Header
    var header = document.createElement('div');
    header.style.cssText = 'padding: 20px 24px; border-bottom: 1px solid #e4e8ed; display: flex; justify-content: space-between; align-items: center; background: #fff;';

    var title = document.createElement('h2');
    title.textContent = 'Create New Entry';
    title.style.cssText = 'margin: 0; font-size: 18px; font-weight: 600; color: #1f2937;';

    var badge = document.createElement('span');
    badge.textContent = contentTypeUid;
    badge.style.cssText = 'padding: 4px 10px; background: #f0f3ff; color: #647de8; border-radius: 4px; font-size: 12px; font-weight: 500; margin-left: 12px;';
    title.appendChild(badge);

    var closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    closeBtn.style.cssText = 'background: none; border: none; font-size: 24px; cursor: pointer; color: #647696; padding: 0; width: 32px; height: 32px;';
    closeBtn.onclick = function() { document.body.removeChild(modal); };

    header.appendChild(title);
    header.appendChild(closeBtn);

    // Form container
    var formContainer = document.createElement('div');
    formContainer.style.cssText = 'padding: 24px; overflow-y: auto; flex: 1;';

    var form = document.createElement('form');
    form.id = 'entryCreationForm';

    // Common fields that most content types have
    var commonFields = [
      { label: 'Title *', name: 'title', type: 'text', required: true, placeholder: 'Enter title' },
      { label: 'URL', name: 'url', type: 'text', placeholder: 'e.g., /my-page' },
      { label: 'Description', name: 'description', type: 'textarea', rows: 3, placeholder: 'Enter description' }
    ];

    commonFields.forEach(function(fieldConfig) {
      var fieldGroup = createSimpleField(fieldConfig);
      form.appendChild(fieldGroup);
    });

    formContainer.appendChild(form);

    // Footer
    var footer = document.createElement('div');
    footer.style.cssText = 'padding: 16px 24px; border-top: 1px solid #e4e8ed; display: flex; justify-content: space-between; align-items: center; gap: 12px; background: #f7f9fc;';

    var infoText = document.createElement('div');
    infoText.textContent = '* Required fields';
    infoText.style.cssText = 'font-size: 12px; color: #647696;';

    var buttonGroup = document.createElement('div');
    buttonGroup.style.cssText = 'display: flex; gap: 10px;';

    var cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.type = 'button';
    cancelBtn.className = 'cs-btn cs-btn-secondary';
    cancelBtn.onclick = function() { document.body.removeChild(modal); };

    var saveBtn = document.createElement('button');
    saveBtn.innerHTML = '💾 Save & Add to Field';
    saveBtn.type = 'button';
    saveBtn.className = 'cs-btn cs-btn-primary';
    saveBtn.onclick = function() { submitEntry(contentTypeUid, form, modal, saveBtn); };

    buttonGroup.appendChild(cancelBtn);
    buttonGroup.appendChild(saveBtn);

    footer.appendChild(infoText);
    footer.appendChild(buttonGroup);

    container.appendChild(header);
    container.appendChild(formContainer);
    container.appendChild(footer);
    modal.appendChild(container);
    document.body.appendChild(modal);

    // Focus first input
    setTimeout(function() {
      var firstInput = form.querySelector('input');
      if (firstInput) firstInput.focus();
    }, 100);

    // ESC to close
    var escHandler = function(e) {
      if (e.key === 'Escape') {
        document.body.removeChild(modal);
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  // Create simple form field
  function createSimpleField(config) {
    var group = document.createElement('div');
    group.style.cssText = 'margin-bottom: 20px;';

    var label = document.createElement('label');
    label.textContent = config.label;
    label.style.cssText = 'display: block; margin-bottom: 8px; font-weight: 500; font-size: 13px; color: #475161;';

    var input;
    if (config.type === 'textarea') {
      input = document.createElement('textarea');
      input.rows = config.rows || 4;
    } else {
      input = document.createElement('input');
      input.type = config.type || 'text';
    }

    input.name = config.name;
    input.required = config.required || false;
    input.placeholder = config.placeholder || '';
    input.style.cssText = 'width: 100%; padding: 10px 12px; border: 1px solid #dfe3e8; border-radius: 4px; font-size: 13px; color: #1f2937; font-family: inherit;';

    // Focus effect
    input.onfocus = function() {
      this.style.borderColor = '#647de8';
      this.style.boxShadow = '0 0 0 2px rgba(100, 125, 232, 0.1)';
    };
    input.onblur = function() {
      this.style.borderColor = '#dfe3e8';
      this.style.boxShadow = 'none';
    };

    group.appendChild(label);
    group.appendChild(input);

    return group;
  }

  // Submit entry
  function submitEntry(contentTypeUid, form, modal, saveBtn) {
    var formData = new FormData(form);
    var entryData = { entry: {} };

    for (var pair of formData.entries()) {
      if (pair[1]) entryData.entry[pair[0]] = pair[1];
    }

    if (!entryData.entry.title) {
      alert('Title is required');
      return;
    }

    console.log('Creating entry:', entryData);

    // Show loading
    saveBtn.innerHTML = '⏳ Creating...';
    saveBtn.disabled = true;
    saveBtn.style.opacity = '0.7';

    extension.stack.ContentType(contentTypeUid).Entry.create(entryData)
      .then(function(result) {
        console.log('Entry created:', result);

        var entry = result[0];
        var newEntry = {
          uid: entry.uid,
          _content_type_uid: contentTypeUid
        };

        // Add to field
        if (isMultiple) {
          currentData.push(newEntry);
        } else {
          currentData = [newEntry];
        }

        return field.setData(currentData);
      })
      .then(function() {
        document.body.removeChild(modal);
        renderEntries();
        extension.window.updateHeight();

        // Success notification
        var success = document.createElement('div');
        success.innerHTML = '✓ Entry created and added successfully!';
        success.style.cssText = 'position: fixed; top: 16px; right: 16px; background: #10b981; color: white; padding: 12px 20px; border-radius: 4px; font-weight: 500; font-size: 13px; z-index: 100000; box-shadow: 0 4px 12px rgba(0,0,0,0.15);';
        document.body.appendChild(success);
        setTimeout(function() {
          if (document.body.contains(success)) {
            document.body.removeChild(success);
          }
        }, 3000);
      })
      .catch(function(error) {
        console.error('Error:', error);
        alert('Error: ' + (error.error_message || error.message || 'Failed to create entry'));
        saveBtn.innerHTML = '💾 Save & Add to Field';
        saveBtn.disabled = false;
        saveBtn.style.opacity = '1';
      });
  }

  // Create dynamic field based on schema
  function createDynamicField(fieldSchema) {
    var fieldType = fieldSchema.data_type;
    var fieldUid = fieldSchema.uid;
    var displayName = fieldSchema.display_name || fieldUid;
    var mandatory = fieldSchema.mandatory || false;

    var group = document.createElement('div');
    group.style.cssText = 'margin-bottom: 20px;';

    var label = document.createElement('label');
    label.textContent = displayName + (mandatory ? ' *' : '');
    label.style.cssText = 'display: block; margin-bottom: 8px; font-weight: 500; font-size: 13px; color: #475161;';

    var input;

    // Handle different field types
    switch(fieldType) {
      case 'text':
        input = document.createElement(fieldSchema.field_metadata && fieldSchema.field_metadata.multiline ? 'textarea' : 'input');
        if (input.tagName === 'TEXTAREA') {
          input.rows = 3;
        } else {
          input.type = 'text';
        }
        break;
      case 'number':
        input = document.createElement('input');
        input.type = 'number';
        break;
      case 'boolean':
        input = document.createElement('input');
        input.type = 'checkbox';
        break;
      case 'isodate':
        input = document.createElement('input');
        input.type = 'datetime-local';
        break;
      default:
        input = document.createElement('input');
        input.type = 'text';
    }

    input.name = fieldUid;
    input.required = mandatory;
    input.placeholder = fieldSchema.instruction || '';
    input.style.cssText = 'width: 100%; padding: 10px 12px; border: 1px solid #dfe3e8; border-radius: 4px; font-size: 13px; color: #1f2937;';

    if (fieldType === 'boolean') {
      input.style.cssText = 'width: 18px; height: 18px; cursor: pointer; accent-color: #647de8;';
    }

    group.appendChild(label);
    group.appendChild(input);

    return group;
  }

  // Submit dynamically created entry
  function submitDynamicEntry(contentTypeUid, form, modal, saveBtn) {
    var formData = new FormData(form);
    var entryData = { entry: {} };

    for (var pair of formData.entries()) {
      var value = pair[1];
      var key = pair[0];

      // Skip empty values
      if (value === '' || value === null) continue;

      // Handle checkbox
      var input = form.querySelector('[name="' + key + '"]');
      if (input && input.type === 'checkbox') {
        entryData.entry[key] = input.checked;
      } else {
        entryData.entry[key] = value;
      }
    }

    console.log('Creating entry with data:', entryData);

    // Show loading
    saveBtn.innerHTML = '⏳ Creating...';
    saveBtn.disabled = true;
    saveBtn.style.opacity = '0.7';

    extension.stack.ContentType(contentTypeUid).Entry.create(entryData)
      .then(function(result) {
        console.log('Entry created successfully:', result);

        var entry = result[0];
        var newEntry = {
          uid: entry.uid,
          _content_type_uid: contentTypeUid
        };

        // Add to field
        if (isMultiple) {
          currentData.push(newEntry);
        } else {
          currentData = [newEntry];
        }

        return field.setData(currentData);
      })
      .then(function() {
        document.body.removeChild(modal);
        renderEntries();
        extension.window.updateHeight();

        // Success notification
        var success = document.createElement('div');
        success.innerHTML = '✓ Entry created and added successfully!';
        success.style.cssText = 'position: fixed; top: 16px; right: 16px; background: #10b981; color: white; padding: 12px 20px; border-radius: 4px; font-weight: 500; font-size: 13px; z-index: 100000; box-shadow: 0 4px 12px rgba(0,0,0,0.15);';
        document.body.appendChild(success);
        setTimeout(function() {
          if (document.body.contains(success)) {
            document.body.removeChild(success);
          }
        }, 3000);
      })
      .catch(function(error) {
        console.error('Error creating entry:', error);
        alert('Error: ' + (error.error_message || error.message || 'Failed to create entry'));
        saveBtn.innerHTML = '💾 Save & Add to Field';
        saveBtn.disabled = false;
        saveBtn.style.opacity = '1';
      });
  }

  // Fallback: Show basic form if schema fetch fails
  function showBasicEntryForm(contentTypeUid) {
    alert("Note: Using basic form. For full content type fields, ensure proper SDK permissions.");
    // Simple fallback can reuse createDynamicField with a basic schema
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

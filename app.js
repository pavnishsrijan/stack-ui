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

  // Create entry - Show custom form in MAIN WINDOW using Contentstack branding
  function createEntry(contentTypeUid) {
    console.log("Creating entry for:", contentTypeUid);

    // Hide main UI
    document.querySelector('.header').style.display = 'none';
    emptyState.style.display = 'none';
    entryList.style.display = 'none';

    // Create form container in main window
    var formWrapper = document.createElement('div');
    formWrapper.id = 'formWrapper';
    formWrapper.style.cssText = 'background: #fff; padding: 0;';

    // Header with Contentstack branding
    var header = document.createElement('div');
    header.style.cssText = 'padding: 16px 20px; border-bottom: 1px solid #e4e8ed; display: flex; justify-content: space-between; align-items: center; background: #fff;';

    var titleContainer = document.createElement('div');
    titleContainer.style.cssText = 'display: flex; align-items: center; gap: 12px;';

    var backIcon = document.createElement('span');
    backIcon.innerHTML = '← ';
    backIcon.style.cssText = 'font-size: 18px; color: #647de8; cursor: pointer;';
    backIcon.onclick = function() {
      document.body.removeChild(formWrapper);
      document.querySelector('.header').style.display = 'flex';
      renderEntries();
      extension.window.updateHeight();
    };

    var title = document.createElement('h2');
    title.textContent = 'Create New Entry';
    title.style.cssText = 'margin: 0; font-size: 16px; font-weight: 600; color: #1f2937;';

    var contentTypeBadge = document.createElement('span');
    contentTypeBadge.textContent = contentTypeUid;
    contentTypeBadge.style.cssText = 'padding: 4px 10px; background: #f0f3ff; color: #647de8; border-radius: 4px; font-size: 12px; font-weight: 500;';

    titleContainer.appendChild(backIcon);
    titleContainer.appendChild(title);
    titleContainer.appendChild(contentTypeBadge);
    header.appendChild(titleContainer);

    // Form container - COMPACT 2-COLUMN GRID (no scrolling)
    var formContainer = document.createElement('div');
    formContainer.style.cssText = 'padding: 24px 20px; background: #fff;';

    var form = document.createElement('form');
    form.id = 'entryForm';
    form.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 16px 20px; max-width: 100%;';

    // Compact fields with Contentstack styling
    var fields = [
      { label: 'Title *', name: 'title', type: 'text', required: true, placeholder: 'Enter title', span: 2 },
      { label: 'URL', name: 'url', type: 'text', placeholder: 'e.g., /my-page', span: 2 },
      { label: 'Description', name: 'description', type: 'textarea', placeholder: 'Enter description', span: 2, rows: 2 },
      { label: 'Tags', name: 'tags', type: 'text', placeholder: 'Comma separated', span: 1 },
      { label: 'Author', name: 'author', type: 'text', placeholder: 'Author name', span: 1 },
      { label: 'Publish Date', name: 'publish_date', type: 'date', span: 1 },
      { label: 'Priority', name: 'priority', type: 'number', placeholder: '0-10', span: 1 },
      { label: 'Featured', name: 'featured', type: 'checkbox', span: 2 }
    ];

    fields.forEach(function(fieldConfig) {
      var fieldGroup = createFormField(fieldConfig);
      if (fieldConfig.span === 2) {
        fieldGroup.style.gridColumn = 'span 2';
      }
      form.appendChild(fieldGroup);
    });

    formContainer.appendChild(form);

    // Footer with Contentstack button styles
    var footer = document.createElement('div');
    footer.style.cssText = 'padding: 16px 20px; border-top: 1px solid #e4e8ed; display: flex; justify-content: space-between; align-items: center; background: #f7f9fc;';

    var leftInfo = document.createElement('div');
    leftInfo.style.cssText = 'color: #647696; font-size: 12px;';
    leftInfo.textContent = '* Required fields';

    var rightButtons = document.createElement('div');
    rightButtons.style.cssText = 'display: flex; gap: 10px;';

    var cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.type = 'button';
    cancelBtn.style.cssText = 'padding: 8px 20px; background: #fff; border: 1px solid #dfe3e8; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 500; color: #475161; transition: all 0.2s;';
    cancelBtn.onmouseover = function() { this.style.borderColor = '#647de8'; this.style.color = '#647de8'; };
    cancelBtn.onmouseout = function() { this.style.borderColor = '#dfe3e8'; this.style.color = '#475161'; };
    cancelBtn.onclick = function() {
      document.body.removeChild(formWrapper);
      document.querySelector('.header').style.display = 'flex';
      renderEntries();
      extension.window.updateHeight();
    };

    var saveBtn = document.createElement('button');
    saveBtn.innerHTML = '💾 Save & Add';
    saveBtn.type = 'button';
    saveBtn.style.cssText = 'padding: 8px 20px; background: #647de8; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 600; transition: background 0.2s;';
    saveBtn.onmouseover = function() { this.style.background = '#4f62d1'; };
    saveBtn.onmouseout = function() { this.style.background = '#647de8'; };
    saveBtn.onclick = function() { submitEntry(contentTypeUid, form, formWrapper, saveBtn); };

    rightButtons.appendChild(cancelBtn);
    rightButtons.appendChild(saveBtn);

    footer.appendChild(leftInfo);
    footer.appendChild(rightButtons);

    // Assemble
    formWrapper.appendChild(header);
    formWrapper.appendChild(formContainer);
    formWrapper.appendChild(footer);
    document.body.appendChild(formWrapper);

    // Update height to fit content
    setTimeout(function() {
      extension.window.updateHeight();
      form.querySelector('input').focus();
    }, 100);
  }

  // Create form field with Contentstack styling
  function createFormField(config) {
    var group = document.createElement('div');
    group.style.cssText = 'display: flex; flex-direction: column;';

    var labelEl = document.createElement('label');
    labelEl.textContent = config.label;
    labelEl.style.cssText = 'display: block; margin-bottom: 6px; font-weight: 500; font-size: 13px; color: #475161;';

    var input;

    if (config.type === 'textarea') {
      input = document.createElement('textarea');
      input.rows = config.rows || 3;
      input.style.cssText = 'width: 100%; padding: 8px 12px; border: 1px solid #dfe3e8; border-radius: 4px; font-size: 13px; font-family: inherit; transition: all 0.2s; resize: vertical; color: #1f2937;';
    } else if (config.type === 'checkbox') {
      var checkboxContainer = document.createElement('div');
      checkboxContainer.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-top: 4px;';

      input = document.createElement('input');
      input.type = 'checkbox';
      input.style.cssText = 'width: 16px; height: 16px; cursor: pointer; accent-color: #647de8;';

      var checkLabel = document.createElement('span');
      checkLabel.textContent = 'Enable';
      checkLabel.style.cssText = 'font-size: 13px; color: #475161;';

      checkboxContainer.appendChild(input);
      checkboxContainer.appendChild(checkLabel);

      group.appendChild(labelEl);
      group.appendChild(checkboxContainer);

      input.name = config.name;
      return group;
    } else {
      input = document.createElement('input');
      input.type = config.type;
      input.style.cssText = 'width: 100%; padding: 8px 12px; border: 1px solid #dfe3e8; border-radius: 4px; font-size: 13px; transition: all 0.2s; color: #1f2937;';
    }

    input.name = config.name;
    input.required = config.required || false;
    input.placeholder = config.placeholder || '';

    // Contentstack focus effects
    input.onfocus = function() {
      this.style.borderColor = '#647de8';
      this.style.boxShadow = '0 0 0 2px rgba(100, 125, 232, 0.1)';
    };
    input.onblur = function() {
      this.style.borderColor = '#dfe3e8';
      this.style.boxShadow = 'none';
    };

    // Hover effects
    input.onmouseover = function() {
      if (document.activeElement !== this) {
        this.style.borderColor = '#c1c7d0';
      }
    };
    input.onmouseout = function() {
      if (document.activeElement !== this) {
        this.style.borderColor = '#dfe3e8';
      }
    };

    group.appendChild(labelEl);
    group.appendChild(input);
    return group;
  }

  // Submit entry
  function submitEntry(contentTypeUid, form, formWrapper, saveBtn) {
    var formData = new FormData(form);
    var entryData = { entry: {} };

    for (var pair of formData.entries()) {
      if (pair[1]) entryData.entry[pair[0]] = pair[1];
    }

    if (!entryData.entry.title) {
      alert('Title is required');
      return;
    }

    // Show loading
    saveBtn.innerHTML = '⏳ Creating...';
    saveBtn.disabled = true;
    saveBtn.style.opacity = '0.7';

    console.log('Creating entry:', entryData);

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
        // Success - close form and update UI
        document.body.removeChild(formWrapper);
        document.querySelector('.header').style.display = 'flex';
        renderEntries();
        extension.window.updateHeight();

        // Show Contentstack-style success notification
        var success = document.createElement('div');
        success.innerHTML = '✓ Entry created successfully';
        success.style.cssText = 'position: fixed; top: 16px; right: 16px; background: #10b981; color: white; padding: 12px 20px; border-radius: 4px; font-weight: 500; font-size: 13px; z-index: 100000; box-shadow: 0 4px 12px rgba(0,0,0,0.15);';
        document.body.appendChild(success);
        setTimeout(function() {
          if (document.body.contains(success)) {
            document.body.removeChild(success);
          }
        }, 2500);
      })
      .catch(function(error) {
        console.error('Error:', error);
        alert('Error: ' + (error.error_message || error.message || 'Failed to create entry'));
        saveBtn.innerHTML = '💾 Save & Add';
        saveBtn.disabled = false;
        saveBtn.style.opacity = '1';
      });
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

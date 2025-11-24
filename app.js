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

  // Create entry - Show custom form in FULL HEIGHT modal with all fields
  function createEntry(contentTypeUid) {
    console.log("Creating entry for:", contentTypeUid);

    // Create fullscreen modal (full height)
    var modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.85); z-index: 99999; display: flex; align-items: stretch; justify-content: center;';

    // Modal container - FULL HEIGHT
    var container = document.createElement('div');
    container.style.cssText = 'background: white; width: 100%; max-width: 900px; height: 100vh; display: flex; flex-direction: column; box-shadow: 0 0 60px rgba(0,0,0,0.5);';

    // Header
    var header = document.createElement('div');
    header.style.cssText = 'padding: 24px 32px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; background: #f9fafb;';

    var title = document.createElement('h2');
    title.textContent = 'Create New Entry: ' + contentTypeUid;
    title.style.cssText = 'margin: 0; font-size: 22px; font-weight: 700; color: #111;';

    var closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    closeBtn.style.cssText = 'background: #ef4444; color: white; border: none; font-size: 22px; cursor: pointer; padding: 8px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 8px; transition: background 0.2s;';
    closeBtn.onmouseover = function() { this.style.background = '#dc2626'; };
    closeBtn.onmouseout = function() { this.style.background = '#ef4444'; };
    closeBtn.onclick = function() { document.body.removeChild(modal); };

    header.appendChild(title);
    header.appendChild(closeBtn);

    // Form container - scrollable, takes all available space
    var formContainer = document.createElement('div');
    formContainer.style.cssText = 'padding: 32px; overflow-y: auto; flex: 1; background: #fff;';

    var form = document.createElement('form');
    form.id = 'entryForm';

    // All common fields with beautiful UI
    var fields = [
      { label: 'Title *', name: 'title', type: 'text', required: true, placeholder: 'Enter entry title' },
      { label: 'URL', name: 'url', type: 'text', required: false, placeholder: 'e.g., /my-page' },
      { label: 'Description', name: 'description', type: 'textarea', required: false, placeholder: 'Enter description' },
      { label: 'Tags', name: 'tags', type: 'text', required: false, placeholder: 'Comma separated tags' },
      { label: 'Author', name: 'author', type: 'text', required: false, placeholder: 'Author name' },
      { label: 'Publish Date', name: 'publish_date', type: 'date', required: false },
      { label: 'Featured', name: 'featured', type: 'checkbox', required: false },
      { label: 'Priority', name: 'priority', type: 'number', required: false, placeholder: 'Enter priority (0-10)' }
    ];

    fields.forEach(function(fieldConfig) {
      var fieldGroup = createFormField(fieldConfig);
      form.appendChild(fieldGroup);
    });

    formContainer.appendChild(form);

    // Footer - sticky at bottom
    var footer = document.createElement('div');
    footer.style.cssText = 'padding: 24px 32px; border-top: 2px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; background: #f9fafb;';

    var leftInfo = document.createElement('div');
    leftInfo.style.cssText = 'color: #6b7280; font-size: 13px;';
    leftInfo.textContent = '* Required fields';

    var rightButtons = document.createElement('div');
    rightButtons.style.cssText = 'display: flex; gap: 12px;';

    var cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.type = 'button';
    cancelBtn.style.cssText = 'padding: 12px 28px; background: #e5e7eb; border: none; border-radius: 8px; cursor: pointer; font-size: 15px; font-weight: 600; color: #374151; transition: background 0.2s;';
    cancelBtn.onmouseover = function() { this.style.background = '#d1d5db'; };
    cancelBtn.onmouseout = function() { this.style.background = '#e5e7eb'; };
    cancelBtn.onclick = function() { document.body.removeChild(modal); };

    var saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save & Add to Field';
    saveBtn.type = 'button';
    saveBtn.style.cssText = 'padding: 12px 32px; background: #2563eb; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 15px; font-weight: 700; transition: background 0.2s; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);';
    saveBtn.onmouseover = function() { this.style.background = '#1d4ed8'; };
    saveBtn.onmouseout = function() { this.style.background = '#2563eb'; };
    saveBtn.onclick = function() { submitEntry(contentTypeUid, form, modal, saveBtn); };

    rightButtons.appendChild(cancelBtn);
    rightButtons.appendChild(saveBtn);

    footer.appendChild(leftInfo);
    footer.appendChild(rightButtons);

    // Assemble
    container.appendChild(header);
    container.appendChild(formContainer);
    container.appendChild(footer);
    modal.appendChild(container);
    document.body.appendChild(modal);

    // Focus first input
    setTimeout(function() {
      form.querySelector('input').focus();
    }, 100);

    // ESC to close
    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') {
        document.body.removeChild(modal);
        document.removeEventListener('keydown', escHandler);
      }
    });
  }

  // Create form field with all types support
  function createFormField(config) {
    var group = document.createElement('div');
    group.style.cssText = 'margin-bottom: 24px;';

    var labelEl = document.createElement('label');
    labelEl.textContent = config.label;
    labelEl.style.cssText = 'display: block; margin-bottom: 10px; font-weight: 600; font-size: 15px; color: #1f2937;';

    var input;

    if (config.type === 'textarea') {
      input = document.createElement('textarea');
      input.rows = 4;
      input.style.cssText = 'width: 100%; padding: 12px 16px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 15px; font-family: inherit; transition: all 0.2s; resize: vertical;';
    } else if (config.type === 'checkbox') {
      var checkboxContainer = document.createElement('div');
      checkboxContainer.style.cssText = 'display: flex; align-items: center; gap: 10px;';

      input = document.createElement('input');
      input.type = 'checkbox';
      input.style.cssText = 'width: 20px; height: 20px; cursor: pointer;';

      var checkLabel = document.createElement('span');
      checkLabel.textContent = 'Yes';
      checkLabel.style.cssText = 'font-size: 15px; color: #4b5563;';

      checkboxContainer.appendChild(input);
      checkboxContainer.appendChild(checkLabel);

      group.appendChild(labelEl);
      group.appendChild(checkboxContainer);

      input.name = config.name;
      return group;
    } else {
      input = document.createElement('input');
      input.type = config.type;
      input.style.cssText = 'width: 100%; padding: 12px 16px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 15px; transition: all 0.2s;';
    }

    input.name = config.name;
    input.required = config.required || false;
    input.placeholder = config.placeholder || '';

    // Focus effects
    input.onfocus = function() {
      this.style.borderColor = '#2563eb';
      this.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
    };
    input.onblur = function() {
      this.style.borderColor = '#e5e7eb';
      this.style.boxShadow = 'none';
    };

    // Hover effects
    input.onmouseover = function() {
      if (document.activeElement !== this) {
        this.style.borderColor = '#d1d5db';
      }
    };
    input.onmouseout = function() {
      if (document.activeElement !== this) {
        this.style.borderColor = '#e5e7eb';
      }
    };

    group.appendChild(labelEl);
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

    // Show loading
    saveBtn.textContent = 'Creating...';
    saveBtn.disabled = true;
    saveBtn.style.opacity = '0.6';

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
        // Success - close modal and update UI
        document.body.removeChild(modal);
        renderEntries();
        extension.window.updateHeight();

        // Show success briefly
        var success = document.createElement('div');
        success.textContent = '✓ Entry created and added!';
        success.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 16px 24px; border-radius: 8px; font-weight: 600; z-index: 100000; box-shadow: 0 10px 40px rgba(0,0,0,0.2);';
        document.body.appendChild(success);
        setTimeout(function() { document.body.removeChild(success); }, 3000);
      })
      .catch(function(error) {
        console.error('Error:', error);
        alert('Error: ' + (error.error_message || error.message || 'Failed to create entry'));
        saveBtn.textContent = 'Save & Add to Field';
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

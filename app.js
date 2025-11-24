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

  // Create entry in specified content type - Show custom entry form modal
  function createEntry(contentTypeUid) {
    console.log("Opening create form for:", contentTypeUid);
    console.log("Using Stack API Key:", STACK_API_KEY);

    if (!STACK_API_KEY) {
      alert("Could not determine stack API key. Please check console.");
      console.error("Stack data:", stackData);
      return;
    }

    // First, fetch the content type schema to build the form
    console.log("Fetching schema for:", contentTypeUid);

    extension.stack.ContentType(contentTypeUid).fetch()
      .then(function(contentType) {
        console.log("Content Type fetched:", contentType);
        showEntryFormModal(contentTypeUid, contentType);
      })
      .catch(function(error) {
        console.error("Error fetching content type:", error);
        alert("Could not load content type schema. Please try again.");
      });
  }

  // Show modal with custom entry creation form
  function showEntryFormModal(contentTypeUid, contentType) {
    var schema = contentType[0] ? contentType[0].schema : contentType.schema;
    console.log("Schema:", schema);

    // Create modal overlay
    var modal = document.createElement('div');
    modal.className = 'entry-form-modal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 10000; display: flex; align-items: center; justify-content: center; overflow: auto; padding: 20px;';

    // Create modal content
    var modalContent = document.createElement('div');
    modalContent.style.cssText = 'background: white; border-radius: 8px; width: 100%; max-width: 800px; max-height: 90vh; overflow: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3);';

    // Create modal header
    var modalHeader = document.createElement('div');
    modalHeader.style.cssText = 'padding: 20px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: white; z-index: 10;';

    var title = document.createElement('h2');
    title.textContent = 'Create New ' + (contentType[0] ? contentType[0].title : contentTypeUid);
    title.style.cssText = 'margin: 0; font-size: 20px; font-weight: 600;';

    var closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'background: none; border: none; font-size: 24px; cursor: pointer; color: #666; padding: 0; width: 32px; height: 32px;';
    closeBtn.onclick = function() {
      document.body.removeChild(modal);
    };

    modalHeader.appendChild(title);
    modalHeader.appendChild(closeBtn);

    // Create form
    var form = document.createElement('form');
    form.style.cssText = 'padding: 20px;';
    form.onsubmit = function(e) {
      e.preventDefault();
      saveEntry(contentTypeUid, form, modal);
    };

    // Build form fields from schema
    if (schema && schema.length > 0) {
      schema.forEach(function(field) {
        if (field.uid === 'title' || field.data_type === 'text' || field.data_type === 'number') {
          var fieldGroup = createFormField(field);
          form.appendChild(fieldGroup);
        }
      });
    } else {
      // Minimal form with just title
      var titleField = createFormField({
        uid: 'title',
        display_name: 'Title',
        data_type: 'text',
        mandatory: true
      });
      form.appendChild(titleField);
    }

    // Create modal footer with buttons
    var modalFooter = document.createElement('div');
    modalFooter.style.cssText = 'padding: 20px; border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end; gap: 12px; position: sticky; bottom: 0; background: white;';

    var cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.type = 'button';
    cancelBtn.style.cssText = 'padding: 10px 20px; background: #f3f4f6; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;';
    cancelBtn.onclick = function() {
      document.body.removeChild(modal);
    };

    var saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save & Add to Field';
    saveBtn.type = 'submit';
    saveBtn.style.cssText = 'padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;';

    modalFooter.appendChild(cancelBtn);
    modalFooter.appendChild(saveBtn);

    // Assemble modal
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(form);
    modalContent.appendChild(modalFooter);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Close on background click
    modal.onclick = function(e) {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    };
    modalContent.onclick = function(e) {
      e.stopPropagation();
    };
  }

  // Create form field HTML
  function createFormField(field) {
    var fieldGroup = document.createElement('div');
    fieldGroup.style.cssText = 'margin-bottom: 20px;';

    var label = document.createElement('label');
    label.textContent = field.display_name || field.uid;
    if (field.mandatory) {
      label.textContent += ' *';
    }
    label.style.cssText = 'display: block; margin-bottom: 8px; font-weight: 500; font-size: 14px;';

    var input;
    if (field.data_type === 'number') {
      input = document.createElement('input');
      input.type = 'number';
    } else {
      input = document.createElement('input');
      input.type = 'text';
    }

    input.name = field.uid;
    input.required = field.mandatory || false;
    input.style.cssText = 'width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;';
    input.placeholder = 'Enter ' + (field.display_name || field.uid);

    fieldGroup.appendChild(label);
    fieldGroup.appendChild(input);

    return fieldGroup;
  }

  // Save entry via API
  function saveEntry(contentTypeUid, form, modal) {
    var formData = new FormData(form);
    var entryData = {
      entry: {}
    };

    // Build entry data from form
    for (var pair of formData.entries()) {
      entryData.entry[pair[0]] = pair[1];
    }

    console.log("Creating entry:", entryData);

    // Show loading state
    var saveBtn = form.querySelector('button[type="submit"]');
    var originalText = saveBtn.textContent;
    saveBtn.textContent = 'Saving...';
    saveBtn.disabled = true;

    // Create entry via API
    extension.stack.ContentType(contentTypeUid).Entry.create(entryData)
      .then(function(result) {
        console.log("Entry created successfully:", result);

        var createdEntry = result[0];
        var newEntry = {
          uid: createdEntry.uid,
          _content_type_uid: contentTypeUid
        };

        // Add to current data
        if (isMultiple) {
          currentData.push(newEntry);
        } else {
          currentData = [newEntry];
        }

        // Save to field
        return field.setData(currentData);
      })
      .then(function() {
        console.log("Entry added to field successfully");

        // Close modal
        document.body.removeChild(modal);

        // Update UI
        renderEntries();
        extension.window.updateHeight();

        // Show success message
        alert("Entry created and added successfully!");
      })
      .catch(function(error) {
        console.error("Error creating entry:", error);
        alert("Error creating entry: " + (error.error_message || error.message || "Unknown error"));

        // Reset button
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
      });
  }

  // Query for the latest entry created in a content type
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
          var message = "Add the latest entry created?\n\n" +
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
            });
          }
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

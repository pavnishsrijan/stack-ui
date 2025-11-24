var extensionField;

ContentstackUIExtension.init().then(function(extension) {
  extensionField = extension;
  var field = extension.field;
  var btn = document.getElementById("createEntryBtn");
  var entryList = document.getElementById("entryList");
  var emptyState = document.getElementById("emptyState");

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

  // Create entry in specified content type
  function createEntry(contentTypeUid) {
    extension.stack.createEntry(contentTypeUid, {
      locale: extension.locale
    }).then(function(res) {
      if (!res || !res.data || !res.data.entry) {
        console.log("Entry creation cancelled or failed");
        return;
      }

      var newEntry = {
        uid: res.data.entry.uid,
        _content_type_uid: contentTypeUid
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
      });
    }).catch(function(error) {
      console.error("Error creating entry:", error);
      alert("Failed to create entry.");
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
    extension.stack.openEntry({
      content_type_uid: contentTypeUid,
      uid: entryUid,
      locale: extension.locale
    }).then(function(result) {
      console.log("Entry opened:", result);
      // Entry form was opened, no action needed on close
    }).catch(function(error) {
      console.error("Error opening entry:", error);
    });
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

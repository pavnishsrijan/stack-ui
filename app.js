window.ContentstackUIExtension.init().then(function (extension) {
  const btn = document.getElementById("createEntryBtn");
  const selectedBox = document.getElementById("selectedValue");

  // Resize extension height
  extension.window.updateHeight(300);

  // Show already saved value
  const saved = extension.field.getValue();
  if (saved) {
    selectedBox.style.display = "block";
    selectedBox.innerHTML = "Selected Entry UID: " + saved;
  }

  btn.addEventListener("click", async () => {
    try {
      // Open the Contentstack create-entry popup
      const result = await extension.stack.OpenCreateEntry({
        contentTypeUid: "blog" // TODO: change to your content type
      });

      if (result && result.data && result.data.entry && result.data.entry.uid) {
        const uid = result.data.entry.uid;

        // Save value to field
        extension.field.setValue(uid);

        // Update UI
        selectedBox.style.display = "block";
        selectedBox.innerHTML = "Selected Entry UID: " + uid;
      }
    } catch (err) {
      console.error("Failed to open popup:", err);
    }
  });
});

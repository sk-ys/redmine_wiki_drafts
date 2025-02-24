(() => {
  if (typeof jsToolBar === "undefined") return;
  if (!window.WikiDrafts) {
    console.warn("WikiDrafts is not loaded.");
    return;
  }

  const t = WikiDrafts.resources.t;

  /**
   * Add buttons to the jsToolBar.
   */
  function addButtonsToJsToolBar() {
    const draftButton = {
      type: "draft",
      title: t.label.draft,
      fn: {
        wiki: function () {
          // do nothing
        },
      },
    };

    const jstbElements = {};
    // Insert button to open draft menu to first of the toolbar
    jstbElements["draft"] = draftButton;
    for (const e in jsToolBar.prototype.elements) {
      jstbElements[e] = jsToolBar.prototype.elements[e];
    }
    jsToolBar.prototype.elements = jstbElements;

    jsToolBar.prototype.draft = function (toolName) {
      const b = jsToolBar.prototype.button.call(this, toolName);
      const bDrawOrg = b.draw;
      b.draw = () => {
        const jsToolBar = b.scope;

        // Start auto-save draft
        setupAutoSaveDraft(jsToolBar, jsToolBar.textarea.value);

        const button = bDrawOrg.call(b);
        // On click or mouseover of the draft button, load and show the menu.
        $(button)
          .on("mouseover click", () => {
            loadDrafts(jsToolBar);
          })
          .on("mouseleave", () => {
            if (!$menuBox.is(":hover")) {
              closeMenu();
            }
          });
        return button;
      };
      return b;
    };
  }
  addButtonsToJsToolBar();

  // Create the container for the draft menu.
  const $menuBox = $("<div>").attr("id", "draftMenuBox").hide();
  const $menu = $("<div>").attr("id", "draftMenu").appendTo($menuBox);

  function createMenuItem(jsToolBar, draft, slot) {
    const textArea = jsToolBar.textarea;
    const textAreaIsEmpty = textArea.value.trim() === "";
    const slotLabel =
      slot === 0 ? t.label.autoSave : `${t.label.slot}: ${slot}`;

    const $draftItem = $("<div>")
      .addClass("draft-item")
      .data("draft", draft)
      .data("slot", slot);

    const $label = $("<span>")
      .addClass("draft-label")
      .text(slotLabel)
      .appendTo($draftItem);

    if (draft) {
      const updatedAt = new Date(draft.updated_at);
      $label.attr(
        "title",
        `${t.label.path}: ${draft.pathname}\n` +
          `${t.label.updatedAt}: ${updatedAt.toLocaleString()}\n` +
          `${t.label.content}:\n${draft.content}`
      );
    } else {
      $draftItem.addClass("empty").attr("title", t.label.empty);
    }

    // Add Save button for manual drafts (exclude auto-save slot).
    const $saveBtn = $("<button>", {
      type: "button",
      class: "draft-save",
      title: t.label.save,
      disabled: slot === 0 || textAreaIsEmpty,
    })
      .click(function (e) {
        e.stopPropagation();
        const updated_at = $(e.currentTarget)
          .parent()
          .find(".draft-updated_at")
          .text();
        if (
          updated_at === "" ||
          (updated_at !== "" && confirm(t.message.confirmOverwriteDraft))
        ) {
          saveDraft(slot, jsToolBar.textarea.value);
        }
        closeMenu();
      })
      .appendTo($draftItem);

    // Add Restore button.
    const $restoreBtn = $("<button>", {
      type: "button",
      class: "draft-restore",
      title: t.label.restore,
      disabled: !draft,
    })
      .click(function (e) {
        e.stopPropagation();
        const text = jsToolBar.textarea.value;
        if (
          text.trim() === "" ||
          (text.trim() !== "" && confirm(t.message.confirmOverwriteWiki))
        ) {
          restoreDraft(jsToolBar, slot, draft?.content);
        }
        closeMenu();
      })
      .appendTo($draftItem);

    // Add Delete button.
    const $deleteBtn = $("<button>", {
      type: "button",
      class: "draft-delete",
      title: t.label.delete,
      disabled: !draft,
    })
      .click(function (e) {
        e.stopPropagation();
        if (confirm(t.message.confirmDelete)) {
          deleteDraft(slot);
        }
        closeMenu();
      })
      .appendTo($draftItem);

    return $draftItem;
  }

  function setupAutoSaveDraft(jsToolBar, storedContent) {
    const autoSaveIntervalSeconds = WikiDrafts.settings.autoSaveIntervalSeconds;
    if (autoSaveIntervalSeconds <= 0) {
      console.warn(
        `Wrong autoSaveIntervalSeconds setting: ${autoSaveIntervalSeconds} sec.` +
          "Auto-save draft is disabled."
      );
      return;
    }

    // Start auto-save draft
    const timerId = setInterval(() => {
      storedContent = autoSaveDraft(jsToolBar, storedContent);
      if (!jsToolBar.textarea) clearInterval(timerId);
    }, autoSaveIntervalSeconds * 1000);

    // Save draft when the textarea content changes.
    jsToolBar.textarea.addEventListener("change", function () {
      storedContent = autoSaveDraft(jsToolBar, storedContent);
    });

    // Save draft when the window is closed.
    window.addEventListener("beforeunload", function (e) {
      storedContent = autoSaveDraft(jsToolBar, storedContent);
    });
  }

  async function autoSaveDraft(jsToolBar, storedContent = null) {
    const textarea = jsToolBar.textarea;
    if (!textarea) return storedContent;
    const text = textarea.value;

    try {
      if (storedContent === null) {
        storedContent = await loadDraft(0);
      }
    } catch (e) {
      // If not found, set storedContent to empty string.
      storedContent = "";
    }

    if (text.trim() !== "" && text !== storedContent) {
      saveDraft(0, text);
    }

    return text;
  }

  async function loadDraft(slot) {
    const response = await $.ajax({
      url: "/wiki_drafts/" + slot,
      dataType: "json",
    });

    if (response.status === "ok") {
      return response.content;
    } else {
      throw new Error(`${t.label.error}: ${response.message}`);
    }
  }

  // Function to load drafts and build the menu.
  async function loadDrafts(jsToolBar, background = false) {
    const response = await $.ajax({
      url: "/wiki_drafts",
      dataType: "json",
    });

    if (response.status === "ok") {
      $menu.empty();
      // Create menu items for slots 0 to 10.
      for (let slot = 0; slot <= WikiDrafts.settings.maxStoredSlots; slot++) {
        const draft = response.drafts[slot];
        const $menuItem = createMenuItem(jsToolBar, draft, slot);
        $menu.append($menuItem);
      }

      if (!background) showMenu(jsToolBar.toolNodes.draft);
    }
  }

  // Function to display the menu near the draft button.
  function showMenu(draftButton) {
    const $draftButton = $(draftButton);
    const offset = $draftButton.offset();
    $menuBox
      .css({
        top: offset.top + $draftButton.outerHeight(),
        left: offset.left,
      })
      .show();
  }

  function closeMenu() {
    $menuBox.hide();
  }

  // Hide the menu when the mouse leaves it.
  $menuBox.mouseleave(function () {
    $menuBox.hide();
  });

  // Function to handle manual draft save.
  function saveDraft(slot, text = "") {
    if (text.trim() === "") return;

    $.ajax({
      url: "/wiki_drafts/" + slot,
      type: "POST",
      data: { pathname: location.pathname, content: text },
      dataType: "json",
      success: function (response) {
        if (response.status !== "ok") {
          alert(`${t.message.errorSave}: ${response.message}`);
        }
      },
    });
  }

  // Function to handle draft restoration.
  async function restoreDraft(jsToolBar, slot, content = null) {
    if (content) {
      jsToolBar.textarea.value = content;
    } else {
      const response = await $.ajax({
        url: "/wiki_drafts/" + slot,
        dataType: "json",
      });

      if (response.status === "ok") {
        jsToolBar.textarea.value = response.content;
      } else {
        alert(`${t.message.errorRestore}: ${response.message}`);
      }
    }
    deleteDraft(slot);
  }

  // Function to handle draft deletion.
  function deleteDraft(slot) {
    $.ajax({
      url: "/wiki_drafts/" + slot,
      type: "DELETE",
      dataType: "json",
      success: function (response) {
        if (response.status !== "ok") {
          alert(`${t.message.errorDelete}: ${response.message}`);
        }
      },
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    $menuBox.appendTo("body");
  });
})();

/* SPLC Springfield — CyberPet Flipped Classroom — shared behaviour
   - Autosaves every [data-autosave] field (textarea / text input / checkbox) to
     localStorage, scoped per page, so a student's answers survive closing the
     browser tab and coming back later on the same computer.
   - Provides downloadResponsePDF() which turns the on-page response section
     into a downloadable PDF the student can save into their personal OneNote
     page (see the "Save this to OneNote" instructions on every page).
   This file runs entirely in the student's browser — nothing is uploaded
   anywhere, so it works with or without internet once the page is loaded
   (PDF export needs internet the first time, to load the html2pdf library
   from the CDN).
*/

(function () {
  var STORE_PREFIX = "cyberpet-flipped-";

  function pageKey() {
    var path = window.location.pathname.split("/").pop() || "page";
    return STORE_PREFIX + path;
  }

  function loadStore() {
    try {
      return JSON.parse(localStorage.getItem(pageKey()) || "{}");
    } catch (e) {
      return {};
    }
  }

  function saveStore(store) {
    try {
      localStorage.setItem(pageKey(), JSON.stringify(store));
    } catch (e) {
      /* localStorage unavailable (e.g. private browsing) — fail quietly */
    }
  }

  function flashSaved() {
    var status = document.getElementById("save-status");
    if (!status) return;
    status.textContent = "Saved on this device ✓";
    status.style.opacity = "1";
    clearTimeout(flashSaved._t);
    flashSaved._t = setTimeout(function () {
      status.style.opacity = "0.55";
    }, 1200);
  }

  function initAutosave() {
    var store = loadStore();
    var fields = document.querySelectorAll("[data-autosave]");
    fields.forEach(function (el) {
      var key = el.getAttribute("data-autosave");
      if (!key) return;
      // Restore
      if (Object.prototype.hasOwnProperty.call(store, key)) {
        if (el.type === "checkbox") {
          el.checked = !!store[key];
        } else {
          el.value = store[key];
        }
      }
      var handler = function () {
        var s = loadStore();
        s[key] = el.type === "checkbox" ? el.checked : el.value;
        saveStore(s);
        flashSaved();
      };
      el.addEventListener("input", handler);
      el.addEventListener("change", handler);
    });
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  window.downloadResponsePDF = function (sectionId, filenameBase) {
    var el = document.getElementById(sectionId);
    if (!el) {
      alert("Could not find the response section to export.");
      return;
    }
    var btn = document.getElementById("pdf-btn");
    var originalText = btn ? btn.textContent : "";
    if (btn) { btn.textContent = "Preparing PDF…"; btn.disabled = true; }

    var finish = function () {
      if (btn) { btn.textContent = originalText; btn.disabled = false; }
    };

    var studentName = (document.getElementById("student-name") || {}).value || "";
    var safeName = studentName.trim() ? studentName.trim().replace(/[^a-z0-9]+/gi, "-") : "Student";
    var filename = safeName + "_" + filenameBase + ".pdf";

    function runExport() {
      var opt = {
        margin: 0.4,
        filename: filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
      };
      window.html2pdf().set(opt).from(el).save().then(finish).catch(function (err) {
        console.error(err);
        alert("PDF export failed. You can also use your browser's Print > Save as PDF option on this page.");
        finish();
      });
    }

    if (window.html2pdf) {
      runExport();
    } else {
      loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.12.1/html2pdf.bundle.min.js")
        .then(runExport)
        .catch(function () {
          alert("Could not load the PDF export tool (no internet connection?). Use your browser's Print > Save as PDF option instead.");
          finish();
        });
    }
  };

  window.printPage = function () {
    window.print();
  };

  document.addEventListener("DOMContentLoaded", initAutosave);
})();

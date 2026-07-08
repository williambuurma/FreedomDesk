/**
 * FreedomDesk Context Engine — situation-first intelligence for the Coordination Panel.
 * Resolves patient, issue, urgency, recommendation, and filtered related context from mock task data.
 */
(function () {
  "use strict";

  var Utils = window.FreedomDeskUtils;

  function escapeHtml(text) {
    return Utils ? Utils.escapeHtml(text) : String(text);
  }

  function patientNameFromTask(task) {
    if (task.callSummary && task.callSummary.patientName) return task.callSummary.patientName;
    if (task.insurancePanel && task.insurancePanel.subscriber) return task.insurancePanel.subscriber;
    if (task.label) {
      var parts = task.label.split("—");
      if (parts.length > 1) return parts[0].trim();
    }
    return "Patient";
  }

  function issueFromTask(panelType, task) {
    if (panelType === "verify-insurance") {
      return "Insurance verification before appointment";
    }
    if (task.callSummary && task.callSummary.chiefConcern) return task.callSummary.chiefConcern;
    if (task.instruction) return task.instruction;
    return task.label || "Needs attention";
  }

  function urgencyFromTask(task) {
    if (task.priority === "critical") return "urgent";
    if (task.priority === "high") return "attention";
    return "routine";
  }

  function urgencyLabel(ctx) {
    if (ctx.urgencyLabel) return ctx.urgencyLabel;
    if (ctx.urgency === "urgent") return "Urgent";
    if (ctx.urgency === "attention") return "Needs attention";
    return "";
  }

  function recommendationFromTask(panelType, task) {
    if (task.recommendedNextStep) return task.recommendedNextStep;
    if (task.callSummary && task.callSummary.recommendedNextStep) {
      return task.callSummary.recommendedNextStep;
    }
    if (panelType === "verify-insurance") {
      return "Verify benefits before discussing fees with the patient.";
    }
    return task.instruction || "";
  }

  function relatedFromTask(panelType, task) {
    var related = [];
    var patient = patientNameFromTask(task);

    if (task.callSummary) {
      var summary = task.callSummary;
      related.push({
        type: "call",
        label: "Recent call — " + (summary.calledAt || "today"),
        detail: summary.aiSummary || summary.chiefConcern || summary.intent,
      });
    }

    if (panelType === "verify-insurance" && task.insurancePanel) {
      related.push({
        type: "insurance",
        label: task.insurancePanel.company || "Insurance on file",
        detail:
          task.insurancePanel.status === "Not verified"
            ? "Benefits not verified — " + (task.insurancePanel.benefitsNote || "check before presenting fees.")
            : task.insurancePanel.benefitsNote || "Coverage on file.",
      });
    }

    if (task.label && /crown|seat|10:00|appointment/i.test(task.label + " " + (task.instruction || ""))) {
      related.push({
        type: "appointment",
        label: "Today's appointment",
        detail: task.label.indexOf("—") > -1 ? task.label : patient + " — " + (task.instruction || task.label),
      });
    }

    if (task.callSummary && task.callSummary.phone) {
      related.push({
        type: "contact",
        label: "Callback number",
        detail: task.callSummary.phone,
      });
    }

    return related.slice(0, 4);
  }

  function normalizeContext(raw, panelType, task) {
    var patient = raw.patientName || patientNameFromTask(task);
    var ctx = {
      patientName: patient,
      issue: raw.issue || issueFromTask(panelType, task),
      urgency: raw.urgency || urgencyFromTask(task),
      urgencyLabel: raw.urgencyLabel || "",
      recommendation: raw.recommendation || recommendationFromTask(panelType, task),
      related: (raw.related && raw.related.length ? raw.related : relatedFromTask(panelType, task)).slice(0, 4),
      contextKey: raw.contextKey || task.id || patient.toLowerCase().replace(/\s+/g, "_"),
    };
    if (!ctx.urgencyLabel) ctx.urgencyLabel = urgencyLabel(ctx);
    return ctx;
  }

  function resolve(panelType, task) {
    var t = task || {};
    if (t.contextEngine) {
      return normalizeContext(t.contextEngine, panelType, t);
    }
    return normalizeContext({}, panelType, t);
  }

  function renderSituationHeader(ctx) {
    var label = urgencyLabel(ctx);
    var urgencyHtml = "";
    if (label && ctx.urgency !== "routine") {
      urgencyHtml =
        '<span class="fd-ctx-urgency fd-ctx-urgency-' +
        escapeHtml(ctx.urgency) +
        '">' +
        escapeHtml(label) +
        "</span>";
    }

    return (
      '<header class="fd-ctx-situation" aria-label="Current situation">' +
      '<div class="fd-ctx-situation-main">' +
      '<p class="fd-ctx-situation-line">' +
      '<span class="fd-ctx-patient">' +
      escapeHtml(ctx.patientName) +
      "</span>" +
      '<span class="fd-ctx-sep" aria-hidden="true">—</span>' +
      '<span class="fd-ctx-issue">' +
      escapeHtml(ctx.issue) +
      "</span>" +
      "</p>" +
      "</div>" +
      urgencyHtml +
      "</header>"
    );
  }

  function renderRecommendation(ctx) {
    if (!ctx.recommendation) return "";
    return (
      '<div class="fd-ctx-recommendation" role="status">' +
      '<p class="fd-ctx-recommendation-text">' +
      '<span class="fd-ctx-recommendation-label">Recommended:</span> ' +
      escapeHtml(ctx.recommendation) +
      "</p>" +
      "</div>"
    );
  }

  var TYPE_LABELS = {
    call: "Call",
    appointment: "Appointment",
    insurance: "Insurance",
    treatment: "Treatment",
    contact: "Contact",
    note: "Note",
  };

  function renderRelatedItem(item) {
    var typeLabel = TYPE_LABELS[item.type] || "Context";
    return (
      '<li class="fd-coord-related-item">' +
      '<span class="fd-coord-related-type">' +
      escapeHtml(typeLabel) +
      "</span>" +
      '<p class="fd-coord-related-text">' +
      escapeHtml(item.label) +
      "</p>" +
      (item.detail ? '<p class="fd-coord-related-detail">' + escapeHtml(item.detail) + "</p>" : "") +
      "</li>"
    );
  }

  function renderRelatedList(items) {
    if (!items || items.length === 0) {
      return '<p class="fd-coord-related-placeholder">No additional context for this situation.</p>';
    }
    var html = '<ul class="fd-coord-related-list" aria-label="Related context">';
    items.forEach(function (item) {
      html += renderRelatedItem(item);
    });
    html += "</ul>";
    return html;
  }

  function renderContextCapture(ctx, attachedNotes) {
    var notes = attachedNotes || [];
    var notesHtml = "";
    if (notes.length > 0) {
      notesHtml = '<ul class="fd-ctx-attached-list" aria-label="Notes for this situation">';
      notes.forEach(function (note) {
        notesHtml +=
          '<li class="fd-ctx-attached-item">' +
          '<p class="fd-ctx-attached-text">' +
          escapeHtml(note.text) +
          "</p>" +
          "</li>";
      });
      notesHtml += "</ul>";
    }

    return (
      '<div class="fd-ctx-capture">' +
      '<label class="fd-ctx-capture-label" for="fdCtxNoteInput">Add to this situation</label>' +
      '<textarea id="fdCtxNoteInput" class="fd-ctx-capture-input" rows="2" placeholder="Note for ' +
      escapeHtml(ctx.patientName) +
      '…"></textarea>' +
      '<div class="fd-ctx-capture-footer">' +
      '<button type="button" class="fd-ctx-capture-save" id="fdCtxNoteSave" disabled>Save note</button>' +
      "</div>" +
      notesHtml +
      "</div>"
    );
  }

  window.FreedomDeskContextEngine = {
    resolve: resolve,
    renderSituationHeader: renderSituationHeader,
    renderRecommendation: renderRecommendation,
    renderRelatedList: renderRelatedList,
    renderContextCapture: renderContextCapture,
  };
})();

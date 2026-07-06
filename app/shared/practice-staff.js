/**
 * Editable practice staff names — receptionists and doctors.
 * Loaded from data/practice-staff.json (future: Settings module / Office DNA).
 */
(function () {
  "use strict";

  var STAFF_URL = "../data/practice-staff.json";

  var DEFAULT_STAFF = {
    defaultReceptionistId: "receptionist_sarah",
    defaultDoctorId: "doctor_johnson",
    receptionists: [{ id: "receptionist_sarah", firstName: "Sarah", displayName: "Sarah" }],
    doctors: [{ id: "doctor_johnson", displayName: "Dr. Johnson", shortName: "Dr. Johnson" }],
  };

  function findReceptionist(staff, id) {
    return (staff.receptionists || []).find(function (r) {
      return r.id === id;
    });
  }

  function findDoctor(staff, id) {
    return (staff.doctors || []).find(function (d) {
      return d.id === id;
    });
  }

  function load() {
    return fetch(STAFF_URL)
      .then(function (res) {
        if (!res.ok) throw new Error("Failed to load staff settings");
        return res.json();
      })
      .catch(function () {
        return DEFAULT_STAFF;
      });
  }

  function applyToMyDayData(previewData, staff) {
    if (!previewData || !staff) return previewData;

    var rec = findReceptionist(staff, staff.defaultReceptionistId);
    var doc = findDoctor(staff, staff.defaultDoctorId);

    if (previewData.roles && previewData.roles.front_desk && rec) {
      previewData.roles.front_desk.recipientName = rec.firstName;
      if (previewData.roles.front_desk.welcome && previewData.roles.front_desk.welcome.greeting) {
        var greetingPrefix = previewData.roles.front_desk.welcome.greeting.split(",")[0];
        previewData.roles.front_desk.welcome.greeting = greetingPrefix + ", " + rec.firstName + ".";
      }
    }

    if (previewData.roles && previewData.roles.dentist && doc) {
      previewData.roles.dentist.recipientName = doc.displayName;
      if (previewData.roles.dentist.welcome && previewData.roles.dentist.welcome.greeting) {
        var docGreetingPrefix = previewData.roles.dentist.welcome.greeting.split(",")[0];
        previewData.roles.dentist.welcome.greeting =
          docGreetingPrefix + ", " + doc.displayName + ".";
      }
    }

    previewData.staffSettings = staff;
    return previewData;
  }

  function roleSwitcherRoles(staff) {
    var rec = findReceptionist(staff, staff.defaultReceptionistId);
    var doc = findDoctor(staff, staff.defaultDoctorId);
    var roles = {};

    if (window.FreedomDeskLabels && window.FreedomDeskLabels.MY_DAY_ROLES) {
      roles = JSON.parse(JSON.stringify(window.FreedomDeskLabels.MY_DAY_ROLES));
    }

    if (roles.front_desk && rec) {
      roles.front_desk.label = rec.displayName || rec.firstName;
      roles.front_desk.recipientName = rec.firstName;
    }
    if (roles.dentist && doc) {
      roles.dentist.label = doc.displayName || doc.shortName;
      roles.dentist.recipientName = doc.displayName;
    }

    return roles;
  }

  function primaryDoctorName(staff) {
    var doc = findDoctor(staff, staff.defaultDoctorId);
    return doc ? doc.displayName || doc.shortName : "Dr. Johnson";
  }

  window.FreedomDeskPracticeStaff = {
    load: load,
    applyToMyDayData: applyToMyDayData,
    roleSwitcherRoles: roleSwitcherRoles,
    primaryDoctorName: primaryDoctorName,
    findReceptionist: findReceptionist,
    findDoctor: findDoctor,
  };
})();

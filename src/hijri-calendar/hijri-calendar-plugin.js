/* =========================================================================
 * Hijri + Gregorian Calendar Plugin
 * Version: 1.8.1 | Date: 2026-09-04
 * -------------------------------------------------------------------------
 * Drop-in date-picker plugin. Click any input bound to the plugin to open a
 * calendar that lets the user choose between Hijri and Gregorian views.
 *
 * Storage contract:
 *   - The user-visible <input> shows the date in whichever calendar they
 *     last viewed (Hijri or Gregorian).
 *   - A hidden sibling <input type="hidden" name="<name>_gregorian"> is
 *     ALWAYS written with the canonical Gregorian YYYY-MM-DD value, so the
 *     backend always receives a Gregorian date even when the user picked
 *     a Hijri one.
 *   - OPTIONAL "gregorianValue" mode makes the input's OWN name submit the
 *     Gregorian YYYY-MM-DD too, so an existing app can swap in this plugin
 *     without touching any server-side code. Turn it on for everything with
 *     one call:  HijriCalendar.setDefaults({ gregorianValue: true });
 *     or per input with  data-gregorian-value  /  { gregorianValue: true }.
 *     The <name>_gregorian field is still written, for compatibility.
 *     ASP.NET MVC: asp-for's data-val-* attributes are moved onto that hidden
 *     field with the name, so jQuery unobtrusive validation validates the
 *     canonical YYYY-MM-DD value and error styling is mirrored back onto the
 *     visible box. See _moveValidationAttrs / HijriCalendar.wireUnobtrusive().
 *
 * Hijri conversion implements the Misri-Hijri (Fatimid / Isma'ili / Tayyibi /
 * Dawoodi Bohra) fixed arithmetic calendar as used by
 * https://github.com/mygulamali/mumineen_calendar_js — odd months 30 days,
 * even months 29, plus a kabisa day on Zilhajjah in cycle years
 * 2, 5, 8, 10, 13, 16, 19, 21, 24, 27, 29. Validated against the live
 * mumineencalendar.com data; see the GROUNDING note in section 1.
 *
 * Public API:
 *   HijriCalendar.attach(input, options)  — bind to one input
 *   HijriCalendar.attachAll(selector)     — bind to many
 *   HijriCalendar.toHijri(y, m, d)        — { hy, hm, hd }
 *   HijriCalendar.toGregorian(hy, hm, hd) — { gy, gm, gd }
 *
 * Miqaats (optional): also load hijri-calendar-miqaats.js to mark days that
 * carry an occasion — a sun for a day miqaat, a moon for a night one, both
 * when the date has both. Hovering a marked day lists the titles. Hide them
 * with data-show-miqaats="false", { showMiqaats: false }, or globally via
 * HijriCalendar.setDefaults({ showMiqaats: false }).
 *
 * Auto-init: any input matching [data-hijri-picker] is bound on DOMReady.
 * ========================================================================= */
(function (global) {
  'use strict';

  /* -----------------------------------------------------------------------
   * 1. Conversion math — Mumineen / Dawoodi Bohra fixed arithmetic calendar
   *    (matches mygulamali/mumineen_calendar_js)
   *
   *    30-year cycle = 10631 days.
   *    Kabisa (leap) years within the 30-year cycle (Qarn Saghir):
   *      2, 5, 8, 10, 13, 16, 19, 21, 24, 27, 29
   *
   *    GROUNDING — transcribed from hijri_date.js in
   *    mygulamali/mumineen_calendar_js. Verified equivalent to that file's
   *    KABISA_YEAR_REMAINDERS / DAYS_IN_YEAR / DAYS_IN_30_YEARS tables by
   *    diffing both implementations over every day from 1900-2100 (73,050
   *    days): identical on 73,043. The 7 differences are all cases where the
   *    repo returns an invalid day 0 — its `left > DAYS_IN_30_YEARS[i]`
   *    comparison rolls the 30-year cycle over one day early on the final
   *    day of a cycle-closing kabisa year (e.g. it reports 0/1/1440 for
   *    10 Sep 2018, which is really 30 Zilhaj 1439). This plugin returns the
   *    correct 30/12/1439 there and does NOT reproduce that off-by-one.
   *
   *    Corroborating sources for the constants:
   *      - thedawoodibohras.com/the-misri-hijri-calendar/ — "The Qarn Saghir
   *        has 11 kabisa years which are those years that have a remainder
   *        of 2, 5, 8, 10, 13, 16, 19, 21, 24, 27 or 29"; all odd months
   *        complete (30), all even incomplete (29), kabisa day on Zilhaj.
   *      - Wikipedia "Tabular Islamic calendar", variants table: Fatimid /
   *        Isma'ili / Tayyibi / Bohora (Ibn al-Ajdabi).
   *      - 16 date pairs scraped from the live mumineencalendar.com 1435H
   *        grid, all passing.
   *
   *    NOT to be confused with these neighbouring tabular variants, which
   *    also fit a small number of anchors but are different calendars:
   *      Kuwaiti / civil:             2,5,7,10,13,16,18,21,24,26,29
   *      Habash al-Hasib / al-Biruni: 2,5,8,11,13,16,19,21,24,27,30
   *
   *    NOT to be confused with these neighbouring tabular variants, which
   *    also fit a small number of anchors but are different calendars:
   *      Kuwaiti / civil:            2,5,7,10,13,16,18,21,24,26,29
   *      Habash al-Hasib / al-Biruni: 2,5,8,11,13,16,19,21,24,27,30
   *    Odd months = 30 days, even months = 29 days,
   *      Dhu al-Hijjah = 30 in leap years, else 29.
   *    Epoch: 1 Muharram 1 AH = Julian Day 1948440 (Friday 16 Jul 622 CE,
   *      Julian calendar — same epoch used by mumineen_calendar_js).
   * --------------------------------------------------------------------- */

  // Fatimid / Isma'ili / Tayyibi / Bohora kabisa years. See the GROUNDING
  // note above before touching this array or HIJRI_EPOCH_JD.
  var BOHRA_LEAP_YEARS = [2, 5, 8, 10, 13, 16, 19, 21, 24, 27, 29];
  var HIJRI_EPOCH_JD = 1948439; // 1 Muharram 1 AH (Bohra/Mumineen — Thu 15 Jul 622 CE Julian)

  function isBohraLeap(hy) {
    var mod = ((hy - 1) % 30 + 30) % 30 + 1; // year-in-cycle 1..30
    return BOHRA_LEAP_YEARS.indexOf(mod) >= 0;
  }

  function hijriMonthLength(hy, hm) {
    if (hm === 12) return isBohraLeap(hy) ? 30 : 29;
    return (hm % 2 === 1) ? 30 : 29;
  }

  // Days from start of year 1 to start of year hy (cycle-based)
  function daysBeforeHijriYear(hy) {
    var y = hy - 1;
    var fullCycles = Math.floor(y / 30);
    var rem = y - fullCycles * 30;
    var days = fullCycles * 10631;
    for (var i = 1; i <= rem; i++) {
      days += isBohraLeap(i) ? 355 : 354;
    }
    return days;
  }

  function daysBeforeHijriMonth(hy, hm) {
    var d = 0;
    for (var m = 1; m < hm; m++) d += hijriMonthLength(hy, m);
    return d;
  }

  // Hijri -> Julian Day
  function hijriToJD(hy, hm, hd) {
    return HIJRI_EPOCH_JD + daysBeforeHijriYear(hy) + daysBeforeHijriMonth(hy, hm) + (hd - 1);
  }

  // Julian Day -> Hijri
  function jdToHijri(jd) {
    var days = jd - HIJRI_EPOCH_JD;                // 0-based day index from epoch
    var fullCycles = Math.floor(days / 10631);
    var rem = days - fullCycles * 10631;
    var hy = fullCycles * 30 + 1;
    while (true) {
      var ylen = isBohraLeap(hy) ? 355 : 354;
      if (rem < ylen) break;
      rem -= ylen;
      hy += 1;
    }
    var hm = 1;
    while (true) {
      var mlen = hijriMonthLength(hy, hm);
      if (rem < mlen) break;
      rem -= mlen;
      hm += 1;
    }
    return { hy: hy, hm: hm, hd: rem + 1 };
  }

  // Gregorian -> Julian Day Number (proleptic Gregorian)
  function gregToJD(y, m, d) {
    if (m < 3) { y -= 1; m += 12; }
    var a = Math.floor(y / 100);
    var b = 2 - a + Math.floor(a / 4);
    return Math.floor(365.25 * (y + 4716))
         + Math.floor(30.6001 * (m + 1))
         + d + b - 1524;
  }

  // Julian Day Number -> Gregorian
  function jdToGreg(jd) {
    var z = Math.floor(jd + 0.5);
    var a = Math.floor((z - 1867216.25) / 36524.25);
    a = z + 1 + a - Math.floor(a / 4);
    var b = a + 1524;
    var c = Math.floor((b - 122.1) / 365.25);
    var d = Math.floor(365.25 * c);
    var e = Math.floor((b - d) / 30.6001);
    var day = b - d - Math.floor(30.6001 * e);
    var month = e < 14 ? e - 1 : e - 13;
    var year = month > 2 ? c - 4716 : c - 4715;
    return { gy: year, gm: month, gd: day };
  }

  function toHijri(gy, gm, gd)        { return jdToHijri(gregToJD(gy, gm, gd)); }
  function toGregorian(hy, hm, hd)    { return jdToGreg(hijriToJD(hy, hm, hd)); }

  function gregMonthLength(gy, gm) {
    return new Date(gy, gm, 0).getDate();
  }

  /* -----------------------------------------------------------------------
   * 2. Calendar names
   * --------------------------------------------------------------------- */

  // Hijri month names — transcribed verbatim from MONTH_NAMES in
  // mygulamali/mumineen_calendar_js  source/assets/javascripts/hijri_date.js
  var HIJRI_MONTHS = [
    'Moharram al-Haraam',
    'Safar al-Muzaffar',
    'Rabi al-Awwal',
    'Rabi al-Aakhar',
    'Jumada al-Ula',
    'Jumada al-Ukhra',
    'Rajab al-Asab',
    'Shabaan al-Karim',
    'Ramadaan al-Moazzam',
    'Shawwal al-Mukarram',
    'Zilqadah al-Haraam',
    'Zilhaj al-Haraam'
  ];
  var HIJRI_MONTHS_SHORT = [
    'Moharram', 'Safar', 'Rabi I', 'Rabi II', 'Jumada I', 'Jumada II',
    'Rajab', 'Shabaan', 'Ramadaan', 'Shawwal', 'Zilqadah', 'Zilhaj'
  ];
  var GREG_MONTHS = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];
  var WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  /* -----------------------------------------------------------------------
   * 3. Helpers
   * --------------------------------------------------------------------- */

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function formatGreg(g) {
    return pad(g.gd) + ' ' + GREG_MONTHS[g.gm - 1] + ' ' + g.gy;
  }
  function formatHijri(h, names) {
    var arr = names || HIJRI_MONTHS;
    return pad(h.hd) + ' ' + arr[h.hm - 1] + ' ' + h.hy + ' AH';
  }
  function isoGreg(g) {
    return g.gy + '-' + pad(g.gm) + '-' + pad(g.gd);
  }

  // Day-of-week for a Gregorian date (0 = Sunday)
  function dayOfWeek(gy, gm, gd) {
    return new Date(gy, gm - 1, gd).getDay();
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function isMobile() {
    return (typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 480px)').matches)
        || (window.innerWidth && window.innerWidth <= 480);
  }

  /* -----------------------------------------------------------------------
   * Miqaats (optional — populated by hijri-calendar-miqaats.js)
   *
   * Indexed by "month-date" (1-based Hijri) for O(1) lookup per cell.
   * `year` on an entry means the miqaat applies from that Hijri year onward
   * (e.g. the 52nd Dai's urus starts in 1435).
   * --------------------------------------------------------------------- */
  var MIQAAT_INDEX = null;   // null = no data loaded

  function buildMiqaatIndex(list) {
    var idx = {};
    if (!list || !list.length) return null;
    for (var i = 0; i < list.length; i++) {
      var m = list[i];
      var key = m.month + '-' + m.date;
      (idx[key] || (idx[key] = [])).push(m);
    }
    // Major miqaats first within each day
    for (var k in idx) {
      if (Object.prototype.hasOwnProperty.call(idx, k)) {
        idx[k].sort(function (a, b) { return (a.priority || 9) - (b.priority || 9); });
      }
    }
    return idx;
  }

  // Miqaats falling on a given Hijri date, honouring each entry's `year`.
  // Entries with a priority above `maxPriority` are filtered out; the default
  // is DEFAULT_MIQAAT_PRIORITY (2), so minor (priority 3) occasions are hidden
  // unless they are explicitly asked for.
  function miqaatsFor(hy, hm, hd, maxPriority) {
    if (!MIQAAT_INDEX) return [];
    var list = MIQAAT_INDEX[hm + '-' + hd];
    if (!list) return [];
    // undefined = use the default cap; null or 'all' = no cap at all
    var cap = (maxPriority === undefined) ? DEFAULT_MIQAAT_PRIORITY : maxPriority;
    if (cap === 'all') cap = null;
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var m = list[i];
      if (m.year != null && hy < m.year) continue;
      if (cap != null && (m.priority || 9) > cap) continue;
      out.push(m);
    }
    return out;
  }

  var SUN_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="5"/>'
    + '<g stroke-width="2.4" stroke-linecap="round">'
    + '<path d="M12 1v3M12 20v3M1 12h3M20 12h3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M19.8 4.2l-2.1 2.1M6.3 17.7l-2.1 2.1"/>'
    + '</g></svg>';
  var MOON_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true">'
    + '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/></svg>';

  /* -----------------------------------------------------------------------
   * 4. Picker class
   * --------------------------------------------------------------------- */

  // Global option defaults — see HijriCalendar.setDefaults()
  var DEFAULTS = {};

  // Highest miqaat priority number shown by default: 1 (major) and 2 (notable)
  // only. Priority 3 (minor) is opt-in, per input with
  // data-miqaat-priority="3" / { miqaatPriority: 3 }, or globally with
  // HijriCalendar.setDefaults({ miqaatPriority: 3 }).
  var DEFAULT_MIQAAT_PRIORITY = 2;

  function Picker(input, options) {
    this.input = input;
    // Keep the caller's options UN-merged: per-input JS options must outrank
    // data-attributes, which must in turn outrank global setDefaults().
    this._rawOptions = options || {};
    // Merge global defaults (HijriCalendar.setDefaults) under per-input options
    var merged = {};
    for (var dk in DEFAULTS) {
      if (Object.prototype.hasOwnProperty.call(DEFAULTS, dk)) merged[dk] = DEFAULTS[dk];
    }
    if (options) {
      for (var ok in options) {
        if (Object.prototype.hasOwnProperty.call(options, ok)) merged[ok] = options[ok];
      }
    }
    this.options = merged;

    // Resolve an option with explicit precedence:
    //   per-input JS option  >  per-input data-attribute  >  global default
    // `parse` converts the raw attribute string; omit for plain strings.
    this._opt = function (key, attrName, parse) {
      if (this._rawOptions[key] != null) return this._rawOptions[key];
      // setConstraints({ key: null }) is an explicit clear — don't fall back
      if (this._cleared && this._cleared[key]) return null;
      if (attrName) {
        var a = this.input.getAttribute(attrName);
        if (a != null && a !== '') return parse ? parse(a) : a;
      }
      if (DEFAULTS[key] != null) return DEFAULTS[key];
      return null;
    };
    // Same, for booleans, where a bare attribute (no value) means true and
    // "false"/"0" mean an explicit per-input opt-OUT of a global default.
    this._optBool = function (key, attrName) {
      if (this._rawOptions[key] != null) return !!this._rawOptions[key];
      var a = this.input.getAttribute(attrName);
      if (a != null) return (a !== 'false' && a !== '0');
      return !!DEFAULTS[key];
    };
    this.mode = this._opt('defaultMode', 'data-hijri-mode') || 'gregorian';
    this.open = false;
    // Per-picker month-name override (falls back to the global list)
    this.hijriMonths = this.options.hijriMonths || null;
    this.gregMonths  = this.options.gregMonths  || null;

    // Date restrictions (parsed from options + HTML data-attributes)
    this._parseConstraints();

    // hidden field holding canonical Gregorian value (always: <name>_gregorian)
    this.hidden = this._ensureHidden();

    // Optional: also submit the Gregorian date under the input's OWN name,
    // so existing server code needs no changes. Sets up this.hiddenPrimary.
    this._setupGregorianValueMode();

    // `required` outside gregorianValue mode: still dead natively (the visible
    // input is readOnly, and readonly controls are barred from constraint
    // validation), so take it over here too.
    if (!this.required && this.input.hasAttribute('required')) {
      this.required = true;
      this.requiredMessage = this.input.getAttribute('data-val-required')
        || (this._fieldLabel() + ' is required.');
      this.input.removeAttribute('required');
      this.input.setAttribute('aria-required', 'true');
      this._installRequiredFallback();
    }

    // Show miqaat sun/moon markers? Defaults to true when data is loaded.
    // Turn off per input with data-show-miqaats="false" / { showMiqaats:false }
    // or globally with HijriCalendar.setDefaults({ showMiqaats: false }).
    this.showMiqaats = (this._rawOptions.showMiqaats != null)
      ? !!this._rawOptions.showMiqaats
      : (function (self) {
          var a = self.input.getAttribute('data-show-miqaats');
          if (a != null) return (a !== 'false' && a !== '0');
          if (DEFAULTS.showMiqaats != null) return !!DEFAULTS.showMiqaats;
          return true;
        })(this);

    // Highest miqaat priority to show: 1 = major only, 2 = major + notable
    // (default), 3 = include minor occasions. Accepts "all" for everything.
    this.miqaatPriority = (function (self) {
      var raw = self._opt('miqaatPriority', 'data-miqaat-priority');
      if (raw == null || raw === '') return DEFAULT_MIQAAT_PRIORITY;
      if (raw === 'all' || raw === true) return null; // no cap
      var n = parseInt(raw, 10);
      return isNaN(n) ? DEFAULT_MIQAAT_PRIORITY : n;
    })(this);

    // current Gregorian "selected" date (may be null)
    this.selected = this._readInitial();

    // current view month (Gregorian numbers internally even in Hijri mode,
    // we'll convert at render time)
    var today = new Date();
    var base = this.selected || { gy: today.getFullYear(), gm: today.getMonth() + 1, gd: today.getDate() };
    this.viewGY = base.gy;
    this.viewGM = base.gm;
    // In Hijri mode, seed the Hijri view from the base DAY, not from the
    // middle of its Gregorian month — the two disagree whenever the day sits
    // in the earlier of the two Hijri months the Gregorian one straddles.
    if (this.mode === 'hijri') {
      var bh = toHijri(base.gy, base.gm, base.gd);
      this.viewHY = bh.hy; this.viewHM = bh.hm;
    }

    this._buildPanel();
    this._bindInput();
  }

  /* -----------------------------------------------------------------------
   * Date constraints
   *
   * Sources (option key  /  HTML attribute):
   *   minDate          data-min-date          "YYYY-MM-DD"  earliest allowed
   *   maxDate          data-max-date          "YYYY-MM-DD"  latest allowed
   *   disabledWeekdays data-disabled-weekdays "0,6"  0=Sun..6=Sat
   *   disabledDates    data-disabled-dates    "2026-06-10,2026-06-12"
   *   isDisabled(fn)   (JS only) fn({gy,gm,gd, hijri, weekday}) -> true to block
   * --------------------------------------------------------------------- */
  Picker.prototype._parseConstraints = function () {
    var self = this;

    function parseISO(s) {
      if (!s) return null;
      var m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(s).trim());
      return m ? { gy: +m[1], gm: +m[2], gd: +m[3] } : null;
    }
    function csvInts(s) {
      return String(s).split(',').map(function (x) { return parseInt(x, 10); })
        .filter(function (n) { return !isNaN(n); });
    }
    function csvList(s) { return String(s).split(','); }

    // Each resolved with: JS option > data-attribute > global default
    this.minDate = parseISO(this._opt('minDate', 'data-min-date'));
    this.maxDate = parseISO(this._opt('maxDate', 'data-max-date'));
    this.minJD = this.minDate ? gregToJD(this.minDate.gy, this.minDate.gm, this.minDate.gd) : null;
    this.maxJD = this.maxDate ? gregToJD(this.maxDate.gy, this.maxDate.gm, this.maxDate.gd) : null;

    var dw = this._opt('disabledWeekdays', 'data-disabled-weekdays', csvInts);
    this.disabledWeekdays = {};
    if (dw && dw.length) for (var i = 0; i < dw.length; i++) this.disabledWeekdays[dw[i]] = true;

    var dd = this._opt('disabledDates', 'data-disabled-dates', csvList);
    this.disabledDates = {};
    if (dd && dd.length) {
      for (var j = 0; j < dd.length; j++) {
        var p = parseISO(dd[j]);
        if (p) this.disabledDates[p.gy + '-' + pad(p.gm) + '-' + pad(p.gd)] = true;
      }
    }

    var fn = this._opt('isDisabled');
    this.isDisabledFn = (typeof fn === 'function') ? fn : null;
  };

  // Update constraints at runtime, e.g. picker.setConstraints({ minDate: '2026-06-01' }).
  // Accepts the same keys as the options object. Re-renders if open.
  /** Toggle miqaat markers on this picker at runtime. */
  Picker.prototype.setShowMiqaats = function (on) {
    this.showMiqaats = !!on;
    if (!this.showMiqaats) this._hideTip();
    if (this.open) this._render();
    return this.showMiqaats;
  };

  /**
   * Raise or lower this picker's miqaat priority cap at runtime.
   *   1 major only · 2 major + notable (default) · 3 include minor
   *   'all' or null = no cap
   */
  Picker.prototype.setMiqaatPriority = function (p) {
    if (p === 'all' || p === null) this.miqaatPriority = null;
    else {
      var n = parseInt(p, 10);
      this.miqaatPriority = isNaN(n) ? DEFAULT_MIQAAT_PRIORITY : n;
    }
    this._hideTip();
    if (this.open) this._render();
    return this.miqaatPriority;
  };

  Picker.prototype.setConstraints = function (cfg) {
    cfg = cfg || {};
    var keys = ['minDate','maxDate','disabledWeekdays','disabledDates','isDisabled'];
    for (var i = 0; i < keys.length; i++) {
      if (cfg.hasOwnProperty(keys[i])) {
        // Write into the raw options so it outranks attributes and defaults.
        // An explicit null clears the constraint entirely.
        this._rawOptions[keys[i]] = cfg[keys[i]];
        this.options[keys[i]] = cfg[keys[i]];
        if (cfg[keys[i]] == null) {
          delete this._rawOptions[keys[i]];
          delete this.options[keys[i]];
          this._cleared = this._cleared || {};
          this._cleared[keys[i]] = true;
        } else if (this._cleared) {
          delete this._cleared[keys[i]];
        }
      }
    }
    this._parseConstraints();
    if (this.open) this._render();
  };

  // Returns true if the given Gregorian date is NOT selectable.
  Picker.prototype._isDisabled = function (gy, gm, gd) {
    var jd = gregToJD(gy, gm, gd);
    if (this.minJD != null && jd < this.minJD) return true;
    if (this.maxJD != null && jd > this.maxJD) return true;
    var wd = dayOfWeek(gy, gm, gd);
    if (this.disabledWeekdays[wd]) return true;
    var key = gy + '-' + pad(gm) + '-' + pad(gd);
    if (this.disabledDates[key]) return true;
    if (this.isDisabledFn) {
      var h = toHijri(gy, gm, gd);
      if (this.isDisabledFn({ gy: gy, gm: gm, gd: gd, gregorian: key, hijri: h, weekday: wd })) return true;
    }
    return false;
  };

  Picker.prototype._ensureHidden = function () {
    var name = this.input.getAttribute('name') || this.input.id || ('hcp_' + Math.random().toString(36).slice(2, 8));
    var hiddenName = name + '_gregorian';
    var existing = this.input.parentNode && this.input.parentNode.querySelector('input[type=hidden][data-hcp-hidden="' + name + '"]');
    if (existing) return existing;
    var h = document.createElement('input');
    h.type = 'hidden';
    h.name = hiddenName;
    h.setAttribute('data-hcp-hidden', name);
    this.input.parentNode.insertBefore(h, this.input.nextSibling);
    return h;
  };

  /* -----------------------------------------------------------------------
   * jQuery unobtrusive validation wiring (no-op when jQuery isn't present)
   *
   * Called once, after all pickers on the page have been attached, whenever at
   * least one of them moved data-val-* attributes onto its hidden field.
   * --------------------------------------------------------------------- */
  var _wireScheduled = false, _wired = false;
  function scheduleUnobtrusiveWiring() {
    if (_wireScheduled) return;
    _wireScheduled = true;
    // Wait a tick so every picker on the page has finished moving its attrs
    // before we re-parse the form.
    setTimeout(function () { _wireScheduled = false; wireUnobtrusive(); }, 0);
  }

  function validationMirrorTarget(element) {
    if (!element || !element.getAttribute) return null;
    var name = element.getAttribute('data-hcp-primary');
    if (!name || !element.parentNode) return null;
    return element.parentNode.querySelector('[data-hcp-name="' + name + '"]');
  }

  function wireUnobtrusive() {
    var $ = global.jQuery;
    if (!$ || !$.validator) return false;

    if (!_wired) {
      _wired = true;
      var base = $.validator.defaults;
      var prevHighlight = base.highlight, prevUnhighlight = base.unhighlight;
      $.validator.setDefaults({
        // Default is ":hidden", which would skip our hidden field.
        ignore: ':hidden:not(.hcp-validated)',
        highlight: function (element, errorClass, validClass) {
          if (prevHighlight) prevHighlight.call(this, element, errorClass, validClass);
          else $(element).addClass(errorClass).removeClass(validClass);
          var vis = validationMirrorTarget(element);
          if (vis) $(vis).addClass(errorClass).removeClass(validClass);
        },
        unhighlight: function (element, errorClass, validClass) {
          if (prevUnhighlight) prevUnhighlight.call(this, element, errorClass, validClass);
          else $(element).removeClass(errorClass).addClass(validClass);
          var vis = validationMirrorTarget(element);
          if (vis) $(vis).removeClass(errorClass).addClass(validClass);
        }
      });
    }

    // Any form the page already parsed holds rules built from the OLD attribute
    // positions, so drop the cached validator and let unobtrusive re-read the
    // DOM as it stands now.
    if ($.validator.unobtrusive && $.validator.unobtrusive.parse) {
      var seen = [];
      $('input.hcp-validated').each(function () {
        var form = this.form;
        if (!form || seen.indexOf(form) !== -1) return;
        seen.push(form);
        var $f = $(form);
        if (!$f.data('validator') && !$f.data('unobtrusiveValidation')) return;
        $f.removeData('validator').removeData('unobtrusiveValidation');
        $.validator.unobtrusive.parse($f);
      });
    }
    return true;
  }

  /* -----------------------------------------------------------------------
   * "Gregorian value" mode  (option: gregorianValue / attr:
   * data-gregorian-value, or globally via HijriCalendar.setDefaults)
   *
   * OFF (default, unchanged behaviour):
   *   <input name="dob">  submits the DISPLAY string ("20 Zilqadah al-Haraam
   *                       1447 AH" or "06 May 2026")
   *   dob_gregorian       submits "2026-05-06"
   *
   * ON:
   *   dob                 submits "2026-05-06"   <-- your existing code works
   *   dob_gregorian       submits "2026-05-06"   <-- kept for compatibility
   *   the visible box still SHOWS the Hijri/Gregorian display string.
   *
   * Implementation: the name is moved off the visible input onto a hidden
   * field, because a form submits an input's value, and we need the value
   * shown to the user to differ from the value sent to the server.
   * --------------------------------------------------------------------- */
  Picker.prototype._setupGregorianValueMode = function () {
    // Precedence: JS option > data-gregorian-value > setDefaults().
    // data-gregorian-value="false" (or "0") is the documented per-field
    // opt-OUT when the app has been flipped on globally.
    this.gregorianValue = this._optBool('gregorianValue', 'data-gregorian-value');
    this.hiddenPrimary = null;
    if (!this.gregorianValue) return;

    var name = this.input.getAttribute('name');
    if (!name) return; // nothing to submit under

    // Move the submitting name off the visible input
    this.input.removeAttribute('name');
    this.input.setAttribute('data-hcp-name', name);

    var existing = this.input.parentNode.querySelector(
      'input[type=hidden][data-hcp-primary="' + name + '"]');
    if (existing) {
      // Re-attach onto a surviving hidden sibling (AJAX partial re-rendered
      // into the same container, modal reopened, double attach()). The move is
      // idempotent, so run it here too — otherwise the data-val-* attributes
      // stay stranded on the now-nameless visible input and the field silently
      // validates as nothing.
      this.hiddenPrimary = existing;
      this._moveValidationAttrs(existing);
      return;
    }

    var h = document.createElement('input');
    h.type = 'hidden';
    h.name = name;
    h.setAttribute('data-hcp-primary', name);
    this.input.parentNode.insertBefore(h, this.input.nextSibling);
    this.hiddenPrimary = h;
    this._moveValidationAttrs(h);
  };

  /* -----------------------------------------------------------------------
   * ASP.NET MVC / Razor asp-for + jQuery unobtrusive validation
   *
   * asp-for renders the rules as data-val-* attributes ON THE VISIBLE INPUT,
   * and jquery.validate keys everything off an element's `name`. So once
   * gregorianValue mode moves the name to the hidden field, two things break:
   *   1. the visible input has the rules but no name -> validator ignores it;
   *   2. the hidden field has the name but no rules -> nothing is validated,
   *      and jquery.validate's default `ignore: ":hidden"` skips it anyway.
   * Worse, if it DID validate the visible input, it would be validating the
   * display string ("20 Zilqadah al-Haraam 1447 AH"), which no date rule can
   * parse.
   *
   * Fix: the rules follow the name. We move every data-val* attribute onto the
   * hidden field (whose value is always canonical YYYY-MM-DD, exactly what
   * data-val-required / -date / -range expect), tag it .hcp-validated so the
   * validator stops ignoring it, and mirror the error/valid classes back onto
   * the visible input so the user sees the red box. data-valmsg-for="<name>"
   * spans keep working untouched, because the name is unchanged.
   *
   * `required` gets special handling. The visible input is readOnly (so the
   * user can't type a half-parsed date), and a readonly control is barred from
   * constraint validation per spec — native HTML5 `required` never fires on it.
   * Moving the attribute to the hidden field wouldn't help either, since
   * type=hidden is barred too. So we PROMOTE it: `required` becomes
   * data-val="true" + data-val-required="..." on the hidden field, routed
   * through jquery.validate, which does validate it. If jquery.validate isn't
   * on the page, _installRequiredFallback keeps the field from submitting
   * empty on its own.
   * --------------------------------------------------------------------- */
  Picker.prototype._moveValidationAttrs = function (hiddenPrimary) {
    var attrs = this.input.attributes, moved = [], i;
    for (i = 0; i < attrs.length; i++) {
      var an = attrs[i].name;
      // data-val, data-val-required, data-val-date-msg, ...
      if (an === 'data-val' || an.indexOf('data-val-') === 0) {
        moved.push({ name: an, value: attrs[i].value });
      }
    }

    // Promote a dead native `required` into the jquery.validate rule set.
    var wasRequired = this.input.hasAttribute('required');
    if (wasRequired) {
      var msg = this.input.getAttribute('data-val-required')
             || hiddenPrimary.getAttribute('data-val-required')
             || (this._fieldLabel() + ' is required.');
      var hasVal = false, hasReq = false;
      for (i = 0; i < moved.length; i++) {
        if (moved[i].name === 'data-val') hasVal = true;
        if (moved[i].name === 'data-val-required') hasReq = true;
      }
      if (!hasVal) moved.push({ name: 'data-val', value: 'true' });
      if (!hasReq) moved.push({ name: 'data-val-required', value: msg });
      this.input.removeAttribute('required');
      // Keep the a11y signal the removed attribute used to carry.
      this.input.setAttribute('aria-required', 'true');
      this.requiredMessage = msg;
      this.required = true;
    }

    if (!moved.length) return;
    for (i = 0; i < moved.length; i++) {
      hiddenPrimary.setAttribute(moved[i].name, moved[i].value);
      this.input.removeAttribute(moved[i].name);
    }
    // Opt this hidden field back IN to validation (see wireUnobtrusive).
    if (!/(^|\s)hcp-validated(\s|$)/.test(hiddenPrimary.className)) {
      hiddenPrimary.className = (hiddenPrimary.className ? hiddenPrimary.className + ' ' : '') + 'hcp-validated';
    }
    this._validated = true;
    if (this.required) this._installRequiredFallback();
    scheduleUnobtrusiveWiring();
  };

  // Human label for messages: the <label for=id> text, else placeholder, else
  // the field name with separators tidied up ("Trip.StartDate" -> "Start date").
  Picker.prototype._fieldLabel = function () {
    var id = this.input.id, lbl = null;
    if (id) {
      try { lbl = document.querySelector('label[for="' + id + '"]'); } catch (e) { lbl = null; }
    }
    if (!lbl && this.input.parentNode) lbl = this.input.parentNode.querySelector('label');
    if (lbl) {
      // Direct text nodes only — skip nested pills / hint spans.
      var t = '';
      for (var i = 0; i < lbl.childNodes.length; i++) {
        if (lbl.childNodes[i].nodeType === 3) t += lbl.childNodes[i].nodeValue;
      }
      if (!t.trim()) t = lbl.textContent || '';
      t = t.replace(/\s+/g, ' ').trim();
      // Cut trailing annotations: "Return — plain HTML required" -> "Return"
      t = t.split(/\s*[\u2014\u2013(,;]/)[0];
      t = t.replace(/\s*[*:]\s*$/, '').trim();
      if (t) return t;
    }
    var ph = this.input.getAttribute('placeholder');
    if (ph) return ph;
    var n = this.input.getAttribute('data-hcp-name') || this.input.getAttribute('name') || 'This field';
    n = n.split('.').pop().replace(/[_\-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
    return n.charAt(0).toUpperCase() + n.slice(1);
  };

  /* -----------------------------------------------------------------------
   * Last-resort `required` enforcement for pages WITHOUT jquery.validate.
   * Native required can't work here (readonly visible input, hidden submit
   * field), so guard the form's submit ourselves. If jquery.validate is
   * handling the form, this does nothing and lets it own the UX.
   * --------------------------------------------------------------------- */
  Picker.prototype._installRequiredFallback = function () {
    var self = this;
    var vf = this.hiddenPrimary || this.hidden;
    var form = vf && vf.form;
    if (!form || this._requiredFallbackBound) return;
    this._requiredFallbackBound = true;
    form.addEventListener('submit', function (e) {
      var $ = global.jQuery;
      if ($ && $.validator && $(form).data('validator')) return; // validator owns it
      if (!self.required) return;
      if (vf.value) { self._setFallbackError(null); return; }
      e.preventDefault();
      e.stopPropagation();
      self._setFallbackError(self.requiredMessage);
      try { self.input.focus(); } catch (err) {}
    }, true);
    this.input.addEventListener('hcp:change', function () {
      if (vf.value) self._setFallbackError(null);
    });
  };

  Picker.prototype._setFallbackError = function (msg) {
    var vf = this.hiddenPrimary || this.hidden;
    var name = this.input.getAttribute('data-hcp-name') || this.input.getAttribute('name');
    var span = null;
    if (name && this.input.parentNode) {
      span = this.input.parentNode.querySelector('[data-valmsg-for="' + name + '"]');
    }
    if (!span) {
      span = this._fallbackMsgEl;
      if (!span && msg) {
        span = this._fallbackMsgEl = el('span', 'hcp-error-msg');
        this.input.parentNode.insertBefore(span, vf.nextSibling);
      }
    }
    if (span) span.textContent = msg || '';
    if (msg) this.input.classList.add('input-validation-error');
    else this.input.classList.remove('input-validation-error');
  };

  // Re-run the field's validation after the user picks a date, since the
  // validator's change/blur hooks are on the hidden field, which never fires.
  Picker.prototype._revalidate = function () {
    var $ = global.jQuery;
    var target = this.hiddenPrimary;
    if (!this._validated || !$ || !$.validator || !target || !target.form) return;
    var v = $(target.form).data('validator');
    // Only re-check once the user has already triggered validation once,
    // so we never flash an error before the first submit attempt.
    if (v && v.submitted && v.submitted[target.name]) v.element(target);
  };

  Picker.prototype._readInitial = function () {
    // Initial value: prefer hidden field's gregorian, else the primary hidden
    // (gregorianValue mode), else the input's value if it parses as ISO.
    var v = this.hidden.value
         || (this.hiddenPrimary && this.hiddenPrimary.value)
         || this.input.value;
    if (!v) return null;
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v.trim());
    if (m) {
      return { gy: +m[1], gm: +m[2], gd: +m[3] };
    }
    return null;
  };

  Picker.prototype._bindInput = function () {
    var self = this;
    this.input.setAttribute('autocomplete', 'off');
    this.input.setAttribute('inputmode', 'none');
    this.input.readOnly = true;
    this.input.classList.add('hcp-input');
    var openHandler = function (e) {
      // Blur the input on mobile so the soft keyboard doesn't pop
      if (isMobile()) { try { self.input.blur(); } catch (_) {} }
      self.show();
    };
    this.input.addEventListener('focus', openHandler);
    this.input.addEventListener('click', openHandler);
    this.input.addEventListener('touchend', function (e) {
      e.preventDefault(); openHandler(e);
    });
    this._refreshInputDisplay();
  };

  Picker.prototype._refreshInputDisplay = function () {
    if (!this.selected) {
      this.input.value = '';
      this.hidden.value = '';
      if (this.hiddenPrimary) this.hiddenPrimary.value = '';
      this._revalidate();
      return;
    }
    var iso = isoGreg(this.selected);
    this.hidden.value = iso;
    if (this.hiddenPrimary) this.hiddenPrimary.value = iso;
    var hMonths = this.hijriMonths || HIJRI_MONTHS;
    var gMonths = this.gregMonths  || GREG_MONTHS;
    if (this.mode === 'hijri') {
      var h = toHijri(this.selected.gy, this.selected.gm, this.selected.gd);
      this.input.value = formatHijri(h, hMonths);
    } else {
      this.input.value = pad(this.selected.gd) + ' ' + gMonths[this.selected.gm - 1] + ' ' + this.selected.gy;
    }
    this._revalidate();
  };

  /* ---- panel construction ---- */

  Picker.prototype._buildPanel = function () {
    var self = this;
    var p = el('div', 'hcp-panel');
    p.setAttribute('role', 'dialog');
    p.style.display = 'none';

    // Toggle row
    var toggle = el('div', 'hcp-toggle');
    var bGreg = el('button', 'hcp-toggle-btn', 'Gregorian');
    var bHij  = el('button', 'hcp-toggle-btn', 'Hijri');
    bGreg.type = 'button'; bHij.type = 'button';
    bGreg.addEventListener('click', function (e) { e.preventDefault(); self.setMode('gregorian'); });
    bHij.addEventListener('click',  function (e) { e.preventDefault(); self.setMode('hijri'); });
    toggle.appendChild(bGreg); toggle.appendChild(bHij);

    // Header (month/year + nav)
    var header = el('div', 'hcp-header');
    var prev = el('button', 'hcp-nav hcp-prev', '\u2039'); prev.type = 'button';
    var next = el('button', 'hcp-nav hcp-next', '\u203a'); next.type = 'button';
    var title = el('div', 'hcp-title');
    var label = el('button', 'hcp-title-label', ''); label.type = 'button';
    title.appendChild(label);
    prev.addEventListener('click', function (e) { e.preventDefault(); self._stepMonth(-1); });
    next.addEventListener('click', function (e) { e.preventDefault(); self._stepMonth(1); });
    label.addEventListener('click', function (e) { e.preventDefault(); self._toggleYearGrid(); });
    header.appendChild(prev); header.appendChild(title); header.appendChild(next);

    // Weekdays
    var wk = el('div', 'hcp-weekdays');
    for (var i = 0; i < 7; i++) wk.appendChild(el('div', 'hcp-wd', WEEKDAYS[i]));

    // Day grid
    var grid = el('div', 'hcp-grid');

    // Year grid (hidden by default)
    var yearGrid = el('div', 'hcp-yeargrid'); yearGrid.style.display = 'none';

    // Footer
    var footer = el('div', 'hcp-footer');
    var todayBtn = el('button', 'hcp-foot-btn', 'Today'); todayBtn.type = 'button';
    var clearBtn = el('button', 'hcp-foot-btn hcp-foot-clear', 'Clear'); clearBtn.type = 'button';
    var spacer = el('div', 'hcp-foot-spacer');
    var closeBtn = el('button', 'hcp-foot-btn hcp-foot-primary', 'Close'); closeBtn.type = 'button';
    todayBtn.addEventListener('click', function (e) { e.preventDefault(); self._pickToday(); });
    clearBtn.addEventListener('click', function (e) { e.preventDefault(); self._clear(); });
    closeBtn.addEventListener('click', function (e) { e.preventDefault(); self.hide(); });
    footer.appendChild(todayBtn); footer.appendChild(clearBtn); footer.appendChild(spacer); footer.appendChild(closeBtn);

    p.appendChild(toggle);
    p.appendChild(header);
    p.appendChild(wk);
    p.appendChild(grid);
    p.appendChild(yearGrid);
    p.appendChild(footer);

    this.panel = p;
    this.elToggleGreg = bGreg;
    this.elToggleHij  = bHij;
    this.elTitle = label;
    this.elGrid = grid;
    this.elYearGrid = yearGrid;
    this.elWeekdays = wk;

    document.body.appendChild(p);

    // Backdrop for mobile modal mode
    var bd = el('div', 'hcp-backdrop');
    bd.addEventListener('click', function () { self.hide(); });
    bd.addEventListener('touchend', function (e) { e.preventDefault(); self.hide(); });
    document.body.appendChild(bd);
    this.backdrop = bd;

    // Outside click — listen to both mouse and touch for cross-device support
    this._outsideHandler = function (e) {
      if (!self.open) return;
      var t = e.target;
      if (p.contains(t) || t === self.input || bd.contains(t)) return;
      self.hide();
    };
    document.addEventListener('mousedown', this._outsideHandler);
    document.addEventListener('touchstart', this._outsideHandler, { passive: true });
    window.addEventListener('resize', function(){ if (self.open) self._position(); });
    window.addEventListener('scroll', function(){ if (self.open) self._position(); }, true);
  };

  /* ---- mode + nav ---- */

  Picker.prototype.setMode = function (mode) {
    this.mode = mode;
    this.showingYearGrid = false;
    if (mode === 'hijri' && (this.viewHY == null || this.viewHM == null)) {
      var h;
      // Prefer a real day inside the Gregorian month on screen: the selected
      // one, else today. Deriving from the 15th drifts, because a Gregorian
      // month straddles two Hijri ones — e.g. with 23 Rabi al-Awwal 1448
      // (early Sep 2026) on screen, 15 Sep already falls in Rabi al-Aakhar.
      var anchor = null;
      if (this.selected && this.selected.gy === this.viewGY && this.selected.gm === this.viewGM) {
        anchor = this.selected;
      } else {
        var td = new Date();
        if (td.getFullYear() === this.viewGY && td.getMonth() + 1 === this.viewGM) {
          anchor = { gy: this.viewGY, gm: this.viewGM, gd: td.getDate() };
        }
      }
      if (anchor) {
        h = toHijri(anchor.gy, anchor.gm, anchor.gd);
      } else {
        var midDay = Math.min(15, gregMonthLength(this.viewGY, this.viewGM));
        h = toHijri(this.viewGY, this.viewGM, midDay);
      }
      this.viewHY = h.hy; this.viewHM = h.hm;
    } else if (mode === 'gregorian') {
      this.viewHY = this.viewHM = null;
    }
    this._render();
    this._refreshInputDisplay();
  };

  // Get the Hijri (hy, hm) the panel should currently display.
  // When in Hijri mode we store it explicitly on the picker; otherwise we
  // derive it from the Greg view's mid-month.
  Picker.prototype._getViewHijri = function () {
    if (this.viewHY != null && this.viewHM != null) {
      return { hy: this.viewHY, hm: this.viewHM };
    }
    var midDay = Math.min(15, gregMonthLength(this.viewGY, this.viewGM));
    var h = toHijri(this.viewGY, this.viewGM, midDay);
    return { hy: h.hy, hm: h.hm };
  };

  Picker.prototype._stepMonth = function (delta) {
    if (this.mode === 'gregorian') {
      var m = this.viewGM + delta;
      var y = this.viewGY;
      while (m < 1)  { m += 12; y -= 1; }
      while (m > 12) { m -= 12; y += 1; }
      this.viewGY = y; this.viewGM = m;
      this.viewHY = this.viewHM = null;
    } else {
      // Step purely in Hijri space — no round-trip through Greg.
      var cur = this._getViewHijri();
      var hm = cur.hm + delta;
      var hy = cur.hy;
      while (hm < 1)  { hm += 12; hy -= 1; }
      while (hm > 12) { hm -= 12; hy += 1; }
      this.viewHY = hy; this.viewHM = hm;
      // Keep Greg view roughly in sync (used if user toggles to Greg)
      var g = toGregorian(hy, hm, 1);
      this.viewGY = g.gy; this.viewGM = g.gm;
    }
    this._render();
  };

  Picker.prototype._toggleYearGrid = function () {
    this.showingYearGrid = !this.showingYearGrid;
    if (!this.showingYearGrid) this.yearGridCenter = null;
    this._render();
  };

  /* ---- show / hide ---- */

  Picker.prototype.show = function () {
    if (this.open) return;
    this.open = true;
    // Re-centre on the current value (or today) each time it opens.
    var t = new Date();
    var b = this.selected || { gy: t.getFullYear(), gm: t.getMonth() + 1, gd: t.getDate() };
    this.viewGY = b.gy; this.viewGM = b.gm;
    if (this.mode === 'hijri') {
      var bh2 = toHijri(b.gy, b.gm, b.gd);
      this.viewHY = bh2.hy; this.viewHM = bh2.hm;
    } else {
      this.viewHY = this.viewHM = null;
    }
    this.panel.style.display = '';
    if (isMobile()) {
      this.panel.classList.add('hcp-mobile');
      this.backdrop.classList.add('is-open');
    } else {
      this.panel.classList.remove('hcp-mobile');
      this.backdrop.classList.remove('is-open');
    }
    this._render();
    this._position();
  };
  Picker.prototype.hide = function () {
    if (!this.open) return;
    this.open = false;
    this.panel.style.display = 'none';
    this.panel.classList.remove('hcp-mobile');
    this.backdrop.classList.remove('is-open');
    this.showingYearGrid = false;
    this._hideTip();
  };

  Picker.prototype._position = function () {
    if (isMobile()) {
      // CSS handles fixed bottom-sheet positioning via .hcp-mobile
      this.panel.style.top = '';
      this.panel.style.left = '';
      return;
    }
    var r = this.input.getBoundingClientRect();
    var top = r.bottom + window.scrollY + 6;
    var left = r.left + window.scrollX;
    var panelW = this.panel.offsetWidth || 320;
    var panelH = this.panel.offsetHeight || 360;
    var vw = document.documentElement.clientWidth;
    var vh = document.documentElement.clientHeight;
    var maxLeft = window.scrollX + vw - panelW - 8;
    if (left > maxLeft) left = maxLeft;
    if (left < window.scrollX + 8) left = window.scrollX + 8;
    // If not enough room below, flip above the input
    if (r.bottom + panelH + 12 > vh && r.top - panelH - 6 > 0) {
      top = r.top + window.scrollY - panelH - 6;
    }
    this.panel.style.top = top + 'px';
    this.panel.style.left = left + 'px';
  };

  /* ---- selection ---- */

  Picker.prototype._pickGreg = function (gy, gm, gd) {
    this.selected = { gy: gy, gm: gm, gd: gd };
    this.viewGY = gy; this.viewGM = gm;
    if (this.mode === 'hijri') {
      var hp = toHijri(gy, gm, gd);
      this.viewHY = hp.hy; this.viewHM = hp.hm;
    } else {
      this.viewHY = this.viewHM = null;
    }
    this._refreshInputDisplay();
    this._render();
    this._emitChange();
    if (typeof this.options.onChange === 'function') {
      this.options.onChange({ gregorian: isoGreg(this.selected), hijri: toHijri(gy, gm, gd) });
    }
    var self = this;
    setTimeout(function(){ self.hide(); }, 120);
  };

  // Let non-plugin code (and the required fallback) observe picks without
  // reaching into internals. `change` also nudges jquery.validate.
  Picker.prototype._emitChange = function () {
    var detail = this.getDate();
    try {
      this.input.dispatchEvent(new CustomEvent('hcp:change', { bubbles: true, detail: detail }));
    } catch (e) {
      var ev = document.createEvent('CustomEvent');
      ev.initCustomEvent('hcp:change', true, false, detail);
      this.input.dispatchEvent(ev);
    }
    try { this.input.dispatchEvent(new Event('change', { bubbles: true })); } catch (e2) {}
  };

  Picker.prototype._pickToday = function () {
    var t = new Date();
    this._pickGreg(t.getFullYear(), t.getMonth() + 1, t.getDate());
  };

  Picker.prototype._clear = function () {
    this.selected = null;
    this._refreshInputDisplay();
    this._render();
    this._emitChange();
    if (typeof this.options.onChange === 'function') {
      this.options.onChange({ gregorian: null, hijri: null });
    }
  };

  /* -----------------------------------------------------------------------
   * Public value API
   *
   *   picker.getDate()            -> null, or
   *                                  { gregorian:'YYYY-MM-DD', gy, gm, gd,
   *                                    hijri:{hy,hm,hd}, date:Date }
   *   picker.setDate(v [, opts])  v accepts:
   *                                  'YYYY-MM-DD' | Date | {gy,gm,gd}
   *                                  | {hy,hm,hd} (Hijri) | null (clears)
   *                               opts.notify: true -> also fire onChange /
   *                                  hcp:change (default false, so linked
   *                                  pickers don't loop)
   *   picker.clear()              same as setDate(null)
   *
   * setDate goes through _refreshInputDisplay, so the hidden Gregorian fields
   * and validation state refresh with it.
   * --------------------------------------------------------------------- */
  Picker.prototype.getDate = function () {
    if (!this.selected) return null;
    var s = this.selected, h = toHijri(s.gy, s.gm, s.gd);
    return {
      gregorian: isoGreg(s),
      gy: s.gy, gm: s.gm, gd: s.gd,
      hijri: { hy: h.hy, hm: h.hm, hd: h.hd },
      date: new Date(s.gy, s.gm - 1, s.gd)
    };
  };

  Picker.prototype.setDate = function (value, opts) {
    opts = opts || {};
    var d = parseDateValue(value);
    if (!d) {
      this.selected = null;
    } else {
      this.selected = d;
      this.viewGY = d.gy; this.viewGM = d.gm;
      if (this.mode === 'hijri') {
        var hp = toHijri(d.gy, d.gm, d.gd);
        this.viewHY = hp.hy; this.viewHM = hp.hm;
      } else {
        this.viewHY = this.viewHM = null;
      }
    }
    this._refreshInputDisplay();
    if (this.open) this._render();
    if (opts.notify) {
      this._emitChange();
      if (typeof this.options.onChange === 'function') {
        this.options.onChange(this.selected
          ? { gregorian: isoGreg(this.selected), hijri: toHijri(this.selected.gy, this.selected.gm, this.selected.gd) }
          : { gregorian: null, hijri: null });
      }
    }
    return this.getDate();
  };

  Picker.prototype.clear = function (opts) { return this.setDate(null, opts); };

  // Accepts ISO string, Date, {gy,gm,gd}, {hy,hm,hd}; null/'' clears.
  function parseDateValue(v) {
    if (v == null || v === '' || v === false) return null;
    if (v instanceof Date) {
      if (isNaN(v.getTime())) return null;
      return { gy: v.getFullYear(), gm: v.getMonth() + 1, gd: v.getDate() };
    }
    if (typeof v === 'string') {
      var m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(v.trim());
      if (m) return { gy: +m[1], gm: +m[2], gd: +m[3] };
      var t = new Date(v);
      return isNaN(t.getTime())
        ? null
        : { gy: t.getFullYear(), gm: t.getMonth() + 1, gd: t.getDate() };
    }
    if (typeof v === 'object') {
      if (v.gy != null && v.gm != null && v.gd != null) return { gy: +v.gy, gm: +v.gm, gd: +v.gd };
      if (v.hy != null && v.hm != null && v.hd != null) {
        var g = toGregorian(+v.hy, +v.hm, +v.hd);
        return { gy: g.gy, gm: g.gm, gd: g.gd };
      }
    }
    return null;
  }

  /* ---- render ---- */

  Picker.prototype._render = function () {
    // toggle highlight
    this.elToggleGreg.classList.toggle('is-active', this.mode === 'gregorian');
    this.elToggleHij.classList.toggle('is-active',  this.mode === 'hijri');

    if (this.showingYearGrid) {
      this.elGrid.style.display = 'none';
      this.elWeekdays.style.display = 'none';
      this.elYearGrid.style.display = '';
      this._renderYearGrid();
    } else {
      this.elGrid.style.display = '';
      this.elWeekdays.style.display = '';
      this.elYearGrid.style.display = 'none';
      this._renderTitle();
      this._renderGrid();
    }
  };

  Picker.prototype._renderTitle = function () {
    var hMonths = this.hijriMonths || HIJRI_MONTHS;
    var gMonths = this.gregMonths  || GREG_MONTHS;
    if (this.mode === 'gregorian') {
      this.elTitle.textContent = gMonths[this.viewGM - 1] + ' ' + this.viewGY;
    } else {
      var v = this._getViewHijri();
      this.elTitle.textContent = hMonths[v.hm - 1] + ' ' + v.hy + ' AH';
    }
  };

  Picker.prototype._renderGrid = function () {
    var self = this;
    this.elGrid.innerHTML = '';

    if (this.mode === 'gregorian') {
      var firstDow = dayOfWeek(this.viewGY, this.viewGM, 1);
      var monthLen = gregMonthLength(this.viewGY, this.viewGM);
      // leading blanks from prev month
      var prevY = this.viewGY, prevM = this.viewGM - 1;
      if (prevM < 1) { prevM = 12; prevY -= 1; }
      var prevLen = gregMonthLength(prevY, prevM);
      for (var i = firstDow - 1; i >= 0; i--) {
        this._appendCell(prevY, prevM, prevLen - i, true);
      }
      for (var d = 1; d <= monthLen; d++) {
        this._appendCell(this.viewGY, this.viewGM, d, false);
      }
      // trailing blanks
      var totalCells = firstDow + monthLen;
      var trailing = (7 - (totalCells % 7)) % 7;
      var nextY = this.viewGY, nextM = this.viewGM + 1;
      if (nextM > 12) { nextM = 1; nextY += 1; }
      for (var k = 1; k <= trailing; k++) {
        this._appendCell(nextY, nextM, k, true);
      }
    } else {
      // Hijri view: build a month grid based on the stored Hijri view.
      var v = this._getViewHijri();
      var hy = v.hy, hm = v.hm;
      var hLen = hijriMonthLength(hy, hm);
      var firstG = toGregorian(hy, hm, 1);
      var firstDow2 = dayOfWeek(firstG.gy, firstG.gm, firstG.gd);

      // leading from previous Hijri month
      var phy = hy, phm = hm - 1;
      if (phm < 1) { phm = 12; phy -= 1; }
      var phLen = hijriMonthLength(phy, phm);
      for (var i2 = firstDow2 - 1; i2 >= 0; i2--) {
        var g1 = toGregorian(phy, phm, phLen - i2);
        this._appendCell(g1.gy, g1.gm, g1.gd, true, { hy: phy, hm: phm, hd: phLen - i2 });
      }
      for (var hd = 1; hd <= hLen; hd++) {
        var g2 = toGregorian(hy, hm, hd);
        this._appendCell(g2.gy, g2.gm, g2.gd, false, { hy: hy, hm: hm, hd: hd });
      }
      var totalCells2 = firstDow2 + hLen;
      var trailing2 = (7 - (totalCells2 % 7)) % 7;
      var nhy = hy, nhm = hm + 1;
      if (nhm > 12) { nhm = 1; nhy += 1; }
      for (var k2 = 1; k2 <= trailing2; k2++) {
        var g3 = toGregorian(nhy, nhm, k2);
        this._appendCell(g3.gy, g3.gm, g3.gd, true, { hy: nhy, hm: nhm, hd: k2 });
      }
    }
  };

  Picker.prototype._appendCell = function (gy, gm, gd, outside, hijriOverride) {
    var self = this;
    var cell = el('button', 'hcp-cell');
    cell.type = 'button';
    if (outside) cell.classList.add('hcp-cell-out');

    // Number to display
    var displayNum;
    if (this.mode === 'gregorian') {
      displayNum = gd;
    } else {
      var h = hijriOverride || toHijri(gy, gm, gd);
      displayNum = h.hd;
    }
    var num = el('span', 'hcp-cell-num', String(displayNum));
    cell.appendChild(num);

    // Secondary (other-calendar) small number
    // When the OTHER calendar's month starts on this cell, show "D/M"
    // (e.g. "1/4" means Apr 1 / month 4 day 1) so month boundaries are
    // visible at a glance in both modes.
    var sec, secText;
    if (this.mode === 'gregorian') {
      var hh = hijriOverride || toHijri(gy, gm, gd);
      secText = (hh.hd === 1) ? (hh.hd + '/' + hh.hm) : String(hh.hd);
      sec = el('span', 'hcp-cell-sec', secText);
      if (hh.hd === 1) sec.classList.add('hcp-cell-sec-boundary');
    } else {
      secText = (gd === 1) ? (gd + '/' + gm) : String(gd);
      sec = el('span', 'hcp-cell-sec', secText);
      if (gd === 1) sec.classList.add('hcp-cell-sec-boundary');
    }
    cell.appendChild(sec);

    // Today highlight
    var today = new Date();
    if (gy === today.getFullYear() && gm === today.getMonth() + 1 && gd === today.getDate()) {
      cell.classList.add('hcp-cell-today');
    }
    // Selected highlight
    if (this.selected && gy === this.selected.gy && gm === this.selected.gm && gd === this.selected.gd) {
      cell.classList.add('hcp-cell-selected');
    }
    // Friday accent
    if (dayOfWeek(gy, gm, gd) === 5) cell.classList.add('hcp-cell-fri');

    // Disabled / out-of-range dates
    var disabled = this._isDisabled(gy, gm, gd);
    if (disabled) {
      cell.classList.add('hcp-cell-disabled');
      cell.disabled = true;
      cell.setAttribute('aria-disabled', 'true');
    }

    // Edge-of-month tinting in the OTHER calendar: if the secondary
    // (other-calendar) day is 1, 2 (start) or near month end (last,
    // last-1) shade the cell subtly so users can spot month boundaries.
    var otherDay, otherMonthLen;
    if (this.mode === 'gregorian') {
      var hh2 = hijriOverride || toHijri(gy, gm, gd);
      otherDay = hh2.hd;
      otherMonthLen = hijriMonthLength(hh2.hy, hh2.hm);
    } else {
      otherDay = gd;
      otherMonthLen = gregMonthLength(gy, gm);
    }
    if (otherDay <= 2 || otherDay >= otherMonthLen - 1) {
      cell.classList.add('hcp-cell-edge');
    }

    // Miqaat markers: sun for a day miqaat, moon for a night one, both when
    // the date has both. Hovering (or focusing) shows the titles.
    if (this.showMiqaats && MIQAAT_INDEX) {
      var hForMiqaat = hijriOverride || toHijri(gy, gm, gd);
      var ms = miqaatsFor(hForMiqaat.hy, hForMiqaat.hm, hForMiqaat.hd, this.miqaatPriority);
      if (ms.length) {
        var hasDay = false, hasNight = false, topPriority = 9;
        for (var mi = 0; mi < ms.length; mi++) {
          if (ms[mi].phase === 'night') hasNight = true; else hasDay = true;
          if ((ms[mi].priority || 9) < topPriority) topPriority = ms[mi].priority || 9;
        }
        var marks = el('span', 'hcp-cell-marks');
        marks.classList.add('hcp-pri-' + topPriority);
        if (hasDay) {
          var s = el('span', 'hcp-mark hcp-mark-sun');
          s.innerHTML = SUN_SVG;
          marks.appendChild(s);
        }
        if (hasNight) {
          var n = el('span', 'hcp-mark hcp-mark-moon');
          n.innerHTML = MOON_SVG;
          marks.appendChild(n);
        }
        cell.appendChild(marks);
        cell.classList.add('hcp-cell-miqaat');

        // Plain-text fallback for touch / assistive tech
        var plain = ms.map(function (m) {
          return m.title + (m.description ? ' — ' + m.description : '');
        }).join('\n');
        cell.setAttribute('aria-label', plain);

        var tipHtml = this._miqaatTooltipHtml(ms, hForMiqaat);
        cell.addEventListener('mouseenter', function () { self._showTip(cell, tipHtml); });
        cell.addEventListener('mouseleave', function () { self._hideTip(); });
        cell.addEventListener('focus', function () { self._showTip(cell, tipHtml); });
        cell.addEventListener('blur', function () { self._hideTip(); });
      }
    }

    cell.addEventListener('click', function (e) {
      e.preventDefault();
      if (disabled) return;
      self._pickGreg(gy, gm, gd);
    });
    this.elGrid.appendChild(cell);
  };

  /* ---- miqaat tooltip ---- */

  Picker.prototype._miqaatTooltipHtml = function (ms, h) {
    var hMonths = this.hijriMonths || HIJRI_MONTHS;
    var esc = function (s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c];
      });
    };
    var out = '<div class="hcp-tip-head">' + pad(h.hd) + ' ' +
      esc(hMonths[h.hm - 1]) + ' ' + h.hy + '</div><ul class="hcp-tip-list">';
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i];
      out += '<li class="hcp-tip-item hcp-pri-' + (m.priority || 9) + '">'
        + '<span class="hcp-tip-ico">' + (m.phase === 'night' ? MOON_SVG : SUN_SVG) + '</span>'
        + '<span class="hcp-tip-text"><b>' + esc(m.title) + '</b>'
        + (m.description ? '<i>' + esc(m.description) + '</i>' : '')
        + '</span></li>';
    }
    return out + '</ul>';
  };

  Picker.prototype._showTip = function (anchor, html) {
    if (!this.tip) {
      this.tip = el('div', 'hcp-tip');
      document.body.appendChild(this.tip);
    }
    this.tip.innerHTML = html;
    this.tip.style.display = 'block';
    // Position above the cell, clamped to the viewport
    var r = anchor.getBoundingClientRect();
    var tw = this.tip.offsetWidth, th = this.tip.offsetHeight;
    var left = r.left + window.scrollX + r.width / 2 - tw / 2;
    var minL = window.scrollX + 6;
    var maxL = window.scrollX + document.documentElement.clientWidth - tw - 6;
    if (left < minL) left = minL;
    if (left > maxL) left = maxL;
    var top = r.top + window.scrollY - th - 8;
    this.tip.classList.remove('hcp-tip-below');
    if (r.top - th - 8 < 0) {
      top = r.bottom + window.scrollY + 8;
      this.tip.classList.add('hcp-tip-below');
    }
    this.tip.style.left = left + 'px';
    this.tip.style.top = top + 'px';
  };

  Picker.prototype._hideTip = function () {
    if (this.tip) this.tip.style.display = 'none';
  };

  /* ---- miqaat tooltip end ---- */

  Picker.prototype._renderYearGrid = function () {
    var self = this;
    this.elYearGrid.innerHTML = '';
    var isHijri = this.mode === 'hijri';
    var centerY;
    if (isHijri) {
      var v = this._getViewHijri();
      centerY = (this.yearGridCenter != null) ? this.yearGridCenter : v.hy;
    } else {
      centerY = (this.yearGridCenter != null) ? this.yearGridCenter : this.viewGY;
    }
    this.yearGridCenter = centerY;

    // Header with prev/next decade nav
    var nav = el('div', 'hcp-yeargrid-nav');
    var prev = el('button', 'hcp-nav', '\u2039'); prev.type = 'button';
    var label = el('div', 'hcp-yeargrid-label', (centerY - 6) + ' \u2013 ' + (centerY + 5) + (isHijri ? ' AH' : ''));
    var next = el('button', 'hcp-nav', '\u203a'); next.type = 'button';
    prev.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      self.yearGridCenter = centerY - 12;
      self._render();
    });
    next.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      self.yearGridCenter = centerY + 12;
      self._render();
    });
    nav.appendChild(prev); nav.appendChild(label); nav.appendChild(next);
    this.elYearGrid.appendChild(nav);

    var grid = el('div', 'hcp-yeargrid-cells');
    var start = centerY - 6;
    for (var y = start; y < start + 12; y++) {
      (function (yr) {
        var b = el('button', 'hcp-year-btn', String(yr) + (isHijri ? ' AH' : ''));
        b.type = 'button';
        if (isHijri && yr === self._getViewHijri().hy) b.classList.add('is-current');
        if (!isHijri && yr === self.viewGY) b.classList.add('is-current');
        b.addEventListener('click', function (e) {
          e.preventDefault();
          if (isHijri) {
            var curHm = self._getViewHijri().hm;
            self.viewHY = yr; self.viewHM = curHm;
            // keep Greg roughly in sync
            var g = toGregorian(yr, curHm, 1);
            self.viewGY = g.gy; self.viewGM = g.gm;
          } else {
            self.viewGY = yr;
            self.viewHY = self.viewHM = null;
          }
          self.yearGridCenter = null;
          self.showingYearGrid = false;
          self._render();
        });
        grid.appendChild(b);
      })(y);
    }
    this.elYearGrid.appendChild(grid);
  };

  /* -----------------------------------------------------------------------
   * 5. Public API
   * --------------------------------------------------------------------- */

  var HijriCalendar = {
    version: '1.8.1',

    /**
     * Global option defaults applied to every picker created afterwards.
     * Precedence is always:
     *   per-input JS option  >  per-input data-attribute  >  these defaults
     * So after setDefaults({ gregorianValue: true }) an individual legacy
     * field can still opt out with data-gregorian-value="false".
     *
     * The main use: flip the whole app to submitting Gregorian dates under
     * the inputs' own names, with ONE call and no per-page edits:
     *
     *   HijriCalendar.setDefaults({ gregorianValue: true });
     *
     * Call it BEFORE the pickers are attached — i.e. in a script tag placed
     * after hijri-calendar-plugin.js but before DOMContentLoaded auto-init,
     * or use attachAll() yourself afterwards.
     */
    setDefaults: function (cfg) {
      cfg = cfg || {};
      for (var k in cfg) {
        if (Object.prototype.hasOwnProperty.call(cfg, k)) DEFAULTS[k] = cfg[k];
      }
      return DEFAULTS;
    },
    getDefaults: function () {
      var out = {};
      for (var k in DEFAULTS) {
        if (Object.prototype.hasOwnProperty.call(DEFAULTS, k)) out[k] = DEFAULTS[k];
      }
      return out;
    },
    /**
     * Replace the global Hijri month names. Pass an array of 12 strings
     * in calendar order (Moharram al-Haraam..Zilhaj al-Haraam). Affects all pickers
     * that have not been given their own per-instance override.
     */
    setHijriMonths: function (names) {
      if (!Array.isArray(names) || names.length !== 12) {
        throw new Error('setHijriMonths expects an array of 12 strings');
      }
      for (var i = 0; i < 12; i++) HIJRI_MONTHS[i] = names[i];
    },
    setGregorianMonths: function (names) {
      if (!Array.isArray(names) || names.length !== 12) {
        throw new Error('setGregorianMonths expects an array of 12 strings');
      }
      for (var i = 0; i < 12; i++) GREG_MONTHS[i] = names[i];
    },
    attach: function (input, options) {
      if (!input) return null;
      if (input.__hcpPicker) return input.__hcpPicker;
      var p = new Picker(input, options || {});
      input.__hcpPicker = p;
      return p;
    },
    attachAll: function (selector) {
      var nodes = document.querySelectorAll(selector || '[data-hijri-picker]');
      var ps = [];
      for (var i = 0; i < nodes.length; i++) {
        var opts = {};
        var mode = nodes[i].getAttribute('data-hijri-mode');
        if (mode) opts.defaultMode = mode;
        ps.push(this.attach(nodes[i], opts));
      }
      return ps;
    },
    toHijri: toHijri,
    toGregorian: toGregorian,
    formatHijri: formatHijri,
    formatGregorian: formatGreg,
    HIJRI_MONTHS: HIJRI_MONTHS,
    HIJRI_MONTHS_SHORT: HIJRI_MONTHS_SHORT,
    // Short month name for a 1-based Hijri month number, e.g. 2 -> 'Safar'
    getShortMonthName: function (hm) { return HIJRI_MONTHS_SHORT[hm - 1]; },
    getMonthName: function (hm) { return HIJRI_MONTHS[hm - 1]; },
    isKabisa: function (hy) { return isBohraLeap(hy); },
    hijriMonthLength: hijriMonthLength,

    /**
     * Load miqaat (occasion) data. hijri-calendar-miqaats.js calls this for
     * you; call it yourself to supply your own or a merged list.
     * Each entry: { month, date, phase, priority, year, title, description }
     *   month/date  1-based Hijri month and day
     *   phase       'day' | 'night'  -> sun / moon marker
     *   priority    1 major, 2 notable, 3 minor (drives the marker colour)
     *   year        null = every year, or the Hijri year it starts from
     * Pass null or [] to remove all miqaat data and hide every marker.
     */
    setMiqaats: function (list) {
      MIQAAT_INDEX = buildMiqaatIndex(list);
      return MIQAAT_INDEX;
    },
    /** Append entries to the existing data (same shape as setMiqaats). */
    addMiqaats: function (list) {
      if (!list || !list.length) return MIQAAT_INDEX;
      if (!MIQAAT_INDEX) MIQAAT_INDEX = {};
      for (var i = 0; i < list.length; i++) {
        var m = list[i], key = m.month + '-' + m.date;
        (MIQAAT_INDEX[key] || (MIQAAT_INDEX[key] = [])).push(m);
      }
      for (var k in MIQAAT_INDEX) {
        if (Object.prototype.hasOwnProperty.call(MIQAAT_INDEX, k)) {
          MIQAAT_INDEX[k].sort(function (a, b) { return (a.priority || 9) - (b.priority || 9); });
        }
      }
      return MIQAAT_INDEX;
    },
    /**
     * Miqaats on a Hijri date. Only priority 1 (major) and 2 (notable) are
     * returned unless you raise the cap: pass 3 to include minor occasions,
     * or null for no cap.
     */
    getMiqaats: function (hy, hm, hd, maxPriority) {
      return miqaatsFor(hy, hm, hd, arguments.length > 3 ? maxPriority : undefined);
    },
    /** Miqaats on a Gregorian date. Same priority cap as getMiqaats. */
    getMiqaatsForGregorian: function (gy, gm, gd, maxPriority) {
      var h = toHijri(gy, gm, gd);
      return miqaatsFor(h.hy, h.hm, h.hd, arguments.length > 3 ? maxPriority : undefined);
    },
    hasMiqaatData: function () { return !!MIQAAT_INDEX; },

    /** Normalise any accepted date value to {gy,gm,gd} (or null). */
    parseDate: parseDateValue,

    /**
     * ASP.NET MVC / Razor: make gregorianValue mode play nicely with asp-for +
     * jquery.validate.unobtrusive. Called automatically when a picker moves
     * data-val-* attributes, so you normally don't need it. Call it by hand
     * after you inject a validated date field into the DOM (partial view, AJAX
     * modal) AND re-attach a picker to it:
     *
     *   HijriCalendar.attach(input, { gregorianValue: true });
     *   HijriCalendar.wireUnobtrusive();          // or $.validator.unobtrusive.parse(form)
     *
     * Returns false if jQuery validate isn't on the page.
     */
    wireUnobtrusive: wireUnobtrusive
  };

  global.HijriCalendar = HijriCalendar;

  // Auto-init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      HijriCalendar.attachAll('[data-hijri-picker]');
    });
  } else {
    HijriCalendar.attachAll('[data-hijri-picker]');
  }

})(window);

# Hijri + Gregorian Calendar Plugin

A drop-in date picker that shows the Misri-Hijri (Dawoodi Bohra) and Gregorian
calendars side by side, with a toggle between them. Plain ES5 JavaScript — no
jQuery, no date library, no build step.

**[Open the live demo and full documentation »](https://aliasghar1451.github.io/hijri-calendar-plugin/)**

`index.html` is the real documentation: every feature below has a working,
interactive example in it, plus copyable code for each one.

## Credits

The calendar math and the miqaat data in this plugin are **not original work**.
Both come from [mumineen_calendar_js](https://github.com/mygulamali/mumineen_calendar_js)
by [Murtaza Gulamali (@mygulamali)](https://github.com/mygulamali), whose
implementation and help made this plugin possible.

- The Misri-Hijri (Fatimid / Isma'ili / Tayyibi / Dawoodi Bohra) conversion
  formulas, the 30-year kabisa cycle (2, 5, 8, 10, 13, 16, 19, 21, 24, 27, 29)
  and the Julian-Day epoch are taken from his `hijri_date.js`.
- The Hijri month names are used verbatim from his `MONTH_NAMES`.
- The bundled miqaat list is transcribed from his `source/data/miqaats.json`.

This plugin adds the picker UI, the dual-calendar toggle, date restrictions and
the ASP.NET validation handling on top of that groundwork. Conversions were
diffed against his implementation across every day from 1900–2100 to confirm
they agree. **Please credit him in any further reuse.**

## Install

Copy the files from `src/hijri-calendar/` into your project and reference them:

```html
<link rel="stylesheet" href="hijri-calendar-plugin.css">

<!-- validation stack first, only if you use it (see below) -->
<script src="jquery.min.js"></script>
<script src="jquery.validate.min.js"></script>
<script src="jquery.validate.unobtrusive.min.js"></script>

<script src="hijri-calendar-plugin.js"></script>
<script src="hijri-calendar-miqaats.js"></script>   <!-- optional -->
```

Then mark any input:

```html
<input type="text" name="dob" data-hijri-picker>
<input type="text" name="hijri_dob" data-hijri-picker data-hijri-mode="hijri">
```

Or attach from JavaScript:

```js
var picker = HijriCalendar.attach(document.getElementById('dob'), {
  defaultMode: 'hijri',
  minDate: '2026-01-01',
  onChange: function (v) { console.log(v.gregorian, v.hijri); }
});
```

## Dependencies

| File | Needed? | Version |
| --- | --- | --- |
| `hijri-calendar-plugin.css` | required | ships with the plugin — keep the pair in sync |
| `hijri-calendar-plugin.js` | required | no dependencies |
| `hijri-calendar-miqaats.js` | optional | load *after* the plugin |
| `jquery.js` | validation only | 1.7+ (any 1.x / 2.x / 3.x) |
| `jquery.validate.js` | validation only | 1.9+ (1.19 / 1.20 tested) |
| `jquery.validate.unobtrusive.js` | validation only | 3.2.x or 4.0.x |

jQuery is needed **only** if you use `gregorianValue` mode on validated,
model-bound fields. Without it the plugin enforces `required` itself at submit
time. Nothing here depends on Bootstrap, moment/dayjs or a particular ASP.NET
version. If you use Bootstrap, load the plugin's CSS after it.

## Features

- Hijri and Gregorian in one picker, with a toggle; the panel always opens on
  the month containing the selected date.
- Date restrictions as HTML attributes or JS options: `minDate`, `maxDate`,
  `disabledWeekdays`, `disabledDates`, and a custom `isDisabled(d)` predicate.
- `setConstraints()` for linking a from/to range at runtime.
- Backward-compatible submission: a hidden `<name>_gregorian` field carries the
  ISO date, or `gregorianValue` mode posts it under the field's own name.
- ASP.NET MVC support: `asp-for` validation attributes are moved onto the
  submitting field so jQuery unobtrusive validation works, and a readonly-barred
  native `required` is promoted into a real rule.
- Optional miqaat (occasion) markers with sun/moon icons and tooltips; priority
  1 and 2 shown by default, minor priority-3 occasions opt-in.
- Mobile bottom-sheet layout, touch support, reduced-motion support, IE11+.

## API

```js
HijriCalendar.attach(input, options)
HijriCalendar.attachAll(selector)          // default '[data-hijri-picker]'
HijriCalendar.setDefaults(options)         // apply to every picker
HijriCalendar.toHijri(gy, gm, gd)
HijriCalendar.toGregorian(hy, hm, hd)
HijriCalendar.getMiqaats(hy, hm, hd[, maxPriority])
HijriCalendar.parseDate(value)             // -> {gy,gm,gd} | null
HijriCalendar.version

picker.getDate()                           // -> null | {gregorian, gy, gm, gd, hijri, date}
picker.setDate('2026-05-06')               // ISO | Date | {gy,gm,gd} | {hy,hm,hd} | null
picker.clear()
picker.setConstraints({ minDate, maxDate, disabledWeekdays, disabledDates, isDisabled })
picker.setMode('hijri' | 'gregorian')
picker.setShowMiqaats(bool)
picker.setMiqaatPriority(1 | 2 | 3 | 'all')
```

The input also fires a bubbling `hcp:change` event carrying the `getDate()`
payload.

See `index.html` for every option, attribute and a live example of each.

## Licence

MIT — see [LICENSE](LICENSE). The calendar math and miqaat data originate from
[mumineen_calendar_js](https://github.com/mygulamali/mumineen_calendar_js);
please keep the attribution above intact.

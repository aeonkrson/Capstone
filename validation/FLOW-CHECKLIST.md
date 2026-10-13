# Full-flow device checklist

Run on each device over the HTTPS address printed by `npm run demo`. Replace `not run` with `pass`, `fail` or `partial` and a short note, only after you have done the check.

| Check | iPhone Safari | Android Chrome | Laptop |
|---|---|---|---|
| Device and OS version | not run | not run | not run |
| Browser version | not run | not run | not run |
| Opened via `npm run demo` HTTPS address | not run | not run | not run |
| Startup message absent over HTTPS | not run | not run | not run |
| Plain http LAN address shows the startup message | not run | not run | not run |
| Consent shown before camera | not run | not run | not run |
| Decline goes to manual entry | not run | not run | not run |
| Guided front lock without a button | not run | not run | not run |
| Turn cue | not run | not run | not run |
| Side lock | not run | not run | not run |
| Sound cues audible | not run | not run | not run |
| Review shows five values with markers | not run | not run | not run |
| Edit one value marks it edited | not run | not run | not run |
| Save goes to fit check | not run | not run | not run |
| Verdict and breakdown shown | not run | not run | not run |
| History entry added | not run | not run | not run |
| Reload keeps profile and history | not run | not run | not run |
| Scan again replaces the measurements (compare before and after in the body section) | not run | not run | not run |
| Camera denied routes to manual entry | not run | not run | not run |
| fps shown with `?debug=1` | not run | not run | not run |
| Language switch to Indonesian on every screen | not run | not run | not run |
| Delete all clears everything | not run | not run | not run |

## Network and storage check (PRIV-02)

1. Open the browser developer tools (Safari Web Inspector from a Mac for the iPhone, `chrome://inspect` for Android, built-in tools on the laptop) and the Network panel.
2. Reload, then run one full guided scan.
3. Tick each when confirmed:
   - [ ] Every request is a GET to the same host.
   - [ ] No POST or PUT.
   - [ ] No request to another host.
   - [ ] The WS filter is empty.
   - [ ] Cookies, Cache Storage, Session Storage and IndexedDB hold nothing; Local Storage holds only the app profile and history keys.

## Problems found

## Result

- iPhone Safari full flow: not run
- Android Chrome full flow: not run
- Laptop full flow: not run
- Rescan on a real camera (MEAS-09): not run
- Network and storage check (PRIV-02): not run

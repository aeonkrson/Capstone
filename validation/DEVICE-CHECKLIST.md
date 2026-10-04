# Device checklist

Filled in by hand in plan 01-07. Leave every result cell blank until it is checked.

## Devices

| Check | iPhone Safari | Android Chrome | Laptop |
|---|---|---|---|
| Device and OS version | | | |
| Browser version | | | |
| Page opens over HTTPS | | | |
| Height form rejects 20 and 400 | | | |
| Camera starts | | | |
| Landmarks visible | | | |
| Silhouette visible | | | |
| Shoulder and bust readings shown | | | |
| Rotating the phone keeps the picture correct | | | |
| Camera indicator goes off after Stop camera and after hiding the tab | | | |
| Frame size | | | |
| Mask size | | | |
| Inference ms with `full` | | | |
| Inference ms with `heavy` | | | |
| Front and side capture complete | | | |
| Delegate used | | | |
| Start camera button appears after Stop camera and after returning to the tab, and restarts the camera without re-entering the height | | | |
| A capture interrupted by Stop camera ends with "Capture failed" and the buttons work again | | | |
| Bust band lines and bust row fraction visible | | | |
| Dev server refuses `/validation/readings.csv` with 403 | | | |

## Network and storage check (PRIV-02)

1. Open the browser's developer tools: Safari Web Inspector from a Mac for the iPhone, `chrome://inspect` for Android, the built-in tools on the laptop.
2. Open the Network panel.
3. Reload the page.
4. Run one full front and side capture.
5. Confirm and tick each of these:
   - [ ] Every request is a GET to the same host.
   - [ ] There is no POST or PUT.
   - [ ] No request goes to another host.
   - [ ] The WS filter is empty.
   - [ ] In the Storage or Application panel, Local Storage, Session Storage, IndexedDB, Cache Storage and Cookies are empty for the site.

One same-host 404 for a source-map file may appear while developer tools are open. It is not an upload.

## Plain static server check

Run `python3 -m http.server 8000 --bind 127.0.0.1`, open `http://localhost:8000/?debug=1` on the laptop, and confirm landmarks and silhouette appear.

## Indonesian wording

A native speaker has read every Indonesian string on the height, camera and debug screens. List corrections here:

## Problems found

## Result

Replace `not run` with `pass`, `fail` or `partial` and a short note.

- Laptop over HTTPS: not run
- Phone over HTTPS: not run
- Network and storage check (PRIV-02): not run
- Plain static server check: not run
- Indonesian wording reviewed: not run

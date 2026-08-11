# Licenses and attribution

## Engine and WebAssembly port

This build is based on [Cloudflare's doom-wasm](https://github.com/cloudflare/doom-wasm) at commit `65e0d3ae2ffa604155eebd96ed40da6567bd08f4`, a WebAssembly/WebSockets port of [Chocolate Doom](https://www.chocolate-doom.org/).

Chocolate Doom authors include Simon Howard, James Haley, Samuel Villarreal, Fabian Greffrath, Jonathan Dowland, and Alexey Khokholov. The WebAssembly port is attributed to Cloudflare. The engine and port are distributed under the GNU General Public License, version 2. The complete license text is in [COPYING.md](COPYING.md). Corresponding source is available from the linked Cloudflare repository at the commit above. This binary was built with Emscripten 6.0.6 after applying the six-file source/build compatibility patch from upstream [PR #14](https://github.com/cloudflare/doom-wasm/pull/14) (head commit `8df07c0`), including the consistent boolean ABI, sprite-rotation sentinel type, modern runtime API, stack-size, strict-aliasing, release-flag, and browser-loop fixes.

## DOOM game data

The engine license does not grant rights to commercial DOOM game data. This directory intentionally does not include `doom1.wad` because it was absent from the supplied source repository. To play, add the legally redistributable DOOM shareware IWAD with the exact filename `doom1.wad` to this directory. Do not substitute or redistribute the registered/commercial `DOOM.WAD` unless you separately have permission to do so.

DOOM and related trademarks and game data are property of their respective owners. This page is not affiliated with or endorsed by id Software or ZeniMax Media.

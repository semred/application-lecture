/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-5ccb27be'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "studio.html",
    "revision": "6accfa3e30222b09d5311c6f614d84f1"
  }, {
    "url": "registerSW.js",
    "revision": "402b66900e731ca748771b6fc5e7a068"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "dcf31b95e1ec6419e6bd4bfdc5e034fb"
  }, {
    "url": "pwa-512x512.png",
    "revision": "dcf31b95e1ec6419e6bd4bfdc5e034fb"
  }, {
    "url": "pwa-192x192.png",
    "revision": "7765b93543a23303a234645cf28072ba"
  }, {
    "url": "index.html",
    "revision": "a7de0d169f157d26cc336b47205b173f"
  }, {
    "url": "icon.svg",
    "revision": "119ac1eb423d0890827d37119c3814b8"
  }, {
    "url": "favicon.ico",
    "revision": "1e5a3142a23022dccb5cbb71bae48467"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "c1e4570c49141a260fe46d2210769904"
  }, {
    "url": "assets/index-mlL184-z.js",
    "revision": null
  }, {
    "url": "assets/index-Dg_GbND1.css",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "c1e4570c49141a260fe46d2210769904"
  }, {
    "url": "favicon.ico",
    "revision": "1e5a3142a23022dccb5cbb71bae48467"
  }, {
    "url": "icon.svg",
    "revision": "119ac1eb423d0890827d37119c3814b8"
  }, {
    "url": "pwa-192x192.png",
    "revision": "7765b93543a23303a234645cf28072ba"
  }, {
    "url": "pwa-512x512.png",
    "revision": "dcf31b95e1ec6419e6bd4bfdc5e034fb"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "dcf31b95e1ec6419e6bd4bfdc5e034fb"
  }, {
    "url": "manifest.webmanifest",
    "revision": "68afbddd2fafb1cdfa9d61108eb90b77"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(/^https:\/\/raw\.githubusercontent\.com\/.*/i, new workbox.StaleWhileRevalidate({
    "cacheName": "remote-books-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 50,
      maxAgeSeconds: 2592000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "gstatic-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));

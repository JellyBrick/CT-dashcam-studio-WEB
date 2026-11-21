# Third-party notices

CT Dashcam Studio Web original project code is offered under GPL-3.0-only only where the owner holds the necessary rights. This does not replace the licenses below or clear uncertain artwork. See LICENSE_AUDIT.md.

## Distributed runtime code: Mediabunny 1.66.2

Source: https://github.com/Vanilagy/mediabunny
Installed version locked in pnpm-lock.yaml: 1.66.2. Mozilla Public License 2.0 (MPL-2.0), copyright (c) 2026-present Vanilagy and contributors. The video export code bundles Mediabunny without modification, and loads it only when an export starts.

MPL-2.0 applies file by file. The source form of every Mediabunny file is available at the link above and in the npm package mediabunny@1.66.2. If these files are ever modified, the modified files must stay under MPL-2.0 and their source must be offered the same way. Mediabunny carries no "Incompatible With Secondary Licenses" notice, so section 3.3 of the MPL allows it to be distributed together with this GPL-3.0-only project. The full license text is in licenses/mediabunny-MPL-2.0.txt. Do not relicense this component as original project code.

## Distributed runtime code: viewer interface libraries

The React interface bundles the following packages. Versions are locked in pnpm-lock.yaml. Each original notice is preserved in full in licenses/ and on the deployed third-party legal page. Do not relicense these components as original project code.

| Package | Version | License | Notice file |
| --- | --- | --- | --- |
| react | 19.3.1 | MIT | licenses/react-MIT.txt |
| react-dom | 19.3.1 | MIT | licenses/react-dom-MIT.txt |
| scheduler | 0.28.0 | MIT | licenses/scheduler-MIT.txt |
| @base-ui/react | 1.9.0 | MIT | licenses/base-ui-react-MIT.txt |
| @base-ui/utils | 0.5.0 | MIT | licenses/base-ui-utils-MIT.txt |
| @floating-ui/core | 1.8.0 | MIT | licenses/floating-ui-core-MIT.txt |
| @floating-ui/dom | 1.8.0 | MIT | licenses/floating-ui-dom-MIT.txt |
| @floating-ui/react-dom | 2.1.9 | MIT | licenses/floating-ui-react-dom-MIT.txt |
| @floating-ui/utils | 0.2.12 | MIT | licenses/floating-ui-utils-MIT.txt |
| reselect | 5.3.0 | MIT | licenses/reselect-MIT.txt |
| use-sync-external-store | 1.7.0 | MIT | licenses/use-sync-external-store-MIT.txt |
| i18next | 27.2.2 | MIT | licenses/i18next-MIT.txt |
| react-i18next | 18.0.3 | MIT | licenses/react-i18next-MIT.txt |
| html-parse-stringify | 4.0.1 | MIT | licenses/html-parse-stringify-MIT.txt |
| @babel/runtime | 8.1.2 | MIT | licenses/babel-runtime-MIT.txt |
| zustand | 5.1.0 | MIT | licenses/zustand-MIT.txt |
| es-toolkit | 1.53.2 | MIT | licenses/es-toolkit-MIT.txt |
| @tanstack/react-query | 5.108.2 | MIT | licenses/tanstack-react-query-MIT.txt |
| @tanstack/query-core | 5.108.2 | MIT | licenses/tanstack-query-core-MIT.txt |
| motion | 14.14.0 | MIT | licenses/motion-MIT.txt |
| framer-motion | 14.14.0 | MIT | licenses/framer-motion-MIT.txt |
| motion-dom | 14.14.0 | MIT | licenses/motion-dom-MIT.txt |
| motion-utils | 14.7.0 | MIT | licenses/motion-utils-MIT.txt |
| @jellybrick/react-solid-flow | 1.2.1 | MIT | licenses/react-solid-flow-MIT.txt |
| the-new-css-reset | 1.11.3 | MIT | licenses/the-new-css-reset-MIT.txt |
| virtua | 0.55.0 | MIT | licenses/virtua-MIT.txt |
| zod | 4.6.7 | MIT | licenses/zod-MIT.txt |
| react-markdown | 10.1.0 | MIT | licenses/runtime-dependencies.txt |
| remark-gfm | 4.0.1 | MIT | licenses/runtime-dependencies.txt |
| react-hotkeys-hook | 5.4.0 | MIT | licenses/runtime-dependencies.txt |
| @use-gesture/react | 10.3.1 | MIT | licenses/runtime-dependencies.txt |
| i18next-browser-languagedetector | 8.3.1 | MIT | licenses/runtime-dependencies.txt |
| @bufbuild/protobuf | 2.17.0 | Apache-2.0 AND BSD-3-Clause | licenses/runtime-dependencies.txt |
| onnxruntime-web | 1.31.1 | MIT | licenses/runtime-dependencies.txt |
| onnxruntime-common | 1.31.1 | MIT | licenses/runtime-dependencies.txt |
| protobufjs and @protobufjs/* | 7.6.6 | BSD-3-Clause | licenses/runtime-dependencies.txt |
| flatbuffers | 25.9.23 | Apache-2.0 | licenses/runtime-dependencies.txt |
| long | 5.3.2 | Apache-2.0 | licenses/runtime-dependencies.txt |
| guid-typescript | 1.0.9 | ISC | licenses/runtime-dependencies.txt |
| platform | 1.3.6 | MIT | licenses/runtime-dependencies.txt |

licenses/runtime-dependencies.txt holds the original license text of every package bundled into the site, including the packages these libraries depend on (for example the unified, remark, micromark, mdast and hast packages behind react-markdown) and the Workbox runtime that the service worker build bundles from @vite-pwa/workbox-swkit. It is generated from `pnpm licenses list --prod`; regenerate it whenever runtime dependencies change. @bufbuild/protobuf publishes its terms in source headers instead of a license file: Apache-2.0 (Buf Technologies) for most files and BSD-3-Clause (Google) for the wire-format code; both headers and the Apache-2.0 text are reproduced in that file.
| sonner | 2.0.8 | MIT | licenses/sonner-MIT.txt |
| lucide-react | 1.77.0 | ISC | licenses/lucide-react-ISC.txt |
| clsx | 2.1.1 | MIT | licenses/clsx-MIT.txt |
| tailwind-merge | 3.7.1 | MIT | licenses/tailwind-merge-MIT.txt |
| class-variance-authority | 0.7.1 | Apache-2.0 | licenses/class-variance-authority-Apache-2.0.txt |
| tw-animate-css | 1.4.0 | MIT | licenses/tw-animate-css-MIT.txt |

## Distributed runtime code: ONNX Runtime Web 1.31.1

Source: https://github.com/microsoft/onnxruntime
MIT, copyright (c) Microsoft Corporation. ONNX Runtime Web runs the face and vehicle detection models. It is loaded only when the viewer turns on face mosaic, license plate mosaic or license plate sharpening. The site then serves its JavaScript and its WebAssembly binary (`ort-wasm-simd-threaded.asyncify.wasm`) from its own origin. The npm package ships no license file, so its MIT text is reproduced in licenses/runtime-dependencies.txt from the bundle header and the upstream repository.

The WebAssembly binary is compiled from ONNX Runtime together with the third-party libraries that ONNX Runtime lists in https://github.com/microsoft/onnxruntime/blob/main/ThirdPartyNotices.txt . Those full texts are not yet reproduced in licenses/; see LICENSE_AUDIT.md.

## Distributed models

Both models run in the browser and are served from the site's own origin only after the matching option is turned on. Neither is a YOLO or Ultralytics model.

- **YuNet face detector:** `src/assets/models/face-yunet.onnx` (230,038 bytes, SHA-256 `ab67ff7a5c8a16f790380ac4c7ef76117a7c7461246e9062c4dd1c1b24f8859d`). It is the OpenCV Zoo `face_detection_yunet_2023mar.onnx` (https://github.com/opencv/opencv_zoo/tree/main/models/face_detection_yunet) with its input height and width changed from fixed to variable. It was restored from this repository's own history (commit 8ea5052), whose note says only the input size was changed and that the boxes match OpenCV's FaceDetectorYN. MIT, copyright (c) 2020 Shiqi Yu; full text in licenses/yunet-MIT.txt.
- **D-FINE nano vehicle detector:** `src/assets/models/vehicle-dfine-n.onnx` (15,434,994 bytes, SHA-256 `f7febe9695cd6f71120abbeb0642d3d6b6c6bcc36f0ba1d79b66d302b5860814`), the unmodified `onnx/model.onnx` from https://huggingface.co/onnx-community/dfine-nano-coco-ONNX , an export of https://huggingface.co/ustc-community/dfine-nano-coco from the D-FINE project (https://github.com/Peterande/D-FINE). Apache-2.0; full text and source details in licenses/d-fine-Apache-2.0.txt. It was trained on COCO 2017, whose annotations are CC BY 4.0. Only its car, motorcycle, bus and truck results are used, to find the area where a license plate can be.

## Distributed font: Pretendard 1.3.9

Source: https://github.com/orioncactus/pretendard
Copyright (c) 2021 Kil Hyung-jin, with Reserved Font Name Pretendard. The variable dynamic-subset WOFF2 files are bundled unmodified and are licensed under the SIL Open Font License, Version 1.1, preserved in full in licenses/pretendard-OFL-1.1.txt. The OFL covers the font files only; it does not apply to the rest of this project.

## Python predecessor and ports

Source: https://github.com/mhsong282828221212123123123/CT-dashcam-studio
Headers identify ports of core/constants.py, decoder.py, map_loader.py, renderer.py, exporter.py, scanner.py, privacy_filter.py, plate_enhancer.py and ui/main_window.py. The sibling repository LICENSE carries the following MIT notice. Preserving it does not certify that every upstream asset or copied algorithm has been cleared.

MIT License

Copyright (c) 2026 Companion Turret

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Build-generated code and development tools

Vite 8.3.8 is a development/build tool, not an application runtime dependency. It bundles with Rolldown 1.2.19, which may emit small runtime helpers and the modulepreload polyfill into the distributed viewer bundle. Vite's supplied license with its bundled third-party notices is preserved in licenses/vite-NOTICES.txt and Rolldown's MIT notice in licenses/rolldown-MIT.txt. Tailwind CSS, TypeScript, oxlint, oxfmt, Vitest and the React Compiler only run at build or test time. The locked dependency versions are in pnpm-lock.yaml.

Mediabunny also declares @types/dom-webcodecs 0.1.13 and @types/dom-mediacapture-transform 0.1.12, MIT copyright Microsoft Corporation. These type declarations are erased and are not JavaScript runtime components. Their notices are retained in licenses/dom-webcodecs-MIT.txt and licenses/dom-mediacapture-transform-MIT.txt for source/dependency redistribution.

## OpenStreetMap

Map data: © OpenStreetMap contributors, available under the Open Database License (ODbL) 1.0. Tiles are remotely requested, not bundled map databases. Software licensing does not grant rights in map data or remove tile-provider terms. See https://www.openstreetmap.org/copyright and https://operations.osmfoundation.org/policies/tiles/ . Existing on-video attribution needs owner review; no renderer change is made in this task.

## External services

Google Analytics gtag.js is fetched from Google only after analytics consent on the viewer; it is not bundled or offered under GPL by this project. Google Analytics, Google Forms, GitHub Pages and OSM have separate service/privacy terms. Refer to PRIVACY.md. Standard browser APIs/codecs and system fonts are supplied by the browser/OS, not licensed by this repository.

## Artwork, branding, copied source and test fixtures

Icon PNG/ICO/SVG generations and visual brand references require the provenance review in LICENSE_AUDIT.md. No Valve/Portal or Tesla rights are purportedly granted by this notice. Test timing MP4s were generated with FFmpeg test patterns; they are test-only and not published by the Pages build. The only bundled font is Pretendard, listed above. Source history and AI assistance are not substitutes for third-party copyright review.

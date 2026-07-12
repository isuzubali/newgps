// Compiles a dart2wasm-generated main module from `source` which can then
// instantiatable via the `instantiate` method.
//
// `source` needs to be a `Response` object (or promise thereof) e.g. created
// via the `fetch()` JS API.
export async function compileStreaming(source) {
  const builtins = {builtins: ['js-string']};
  return new CompiledApp(
      await WebAssembly.compileStreaming(source, builtins), builtins);
}

// Compiles a dart2wasm-generated wasm modules from `bytes` which is then
// instantiatable via the `instantiate` method.
export async function compile(bytes) {
  const builtins = {builtins: ['js-string']};
  return new CompiledApp(await WebAssembly.compile(bytes, builtins), builtins);
}

// DEPRECATED: Please use `compile` or `compileStreaming` to get a compiled app,
// use `instantiate` method to get an instantiated app and then call
// `invokeMain` to invoke the main function.
export async function instantiate(modulePromise, importObjectPromise) {
  var moduleOrCompiledApp = await modulePromise;
  if (!(moduleOrCompiledApp instanceof CompiledApp)) {
    moduleOrCompiledApp = new CompiledApp(moduleOrCompiledApp);
  }
  const instantiatedApp = await moduleOrCompiledApp.instantiate(await importObjectPromise);
  return instantiatedApp.instantiatedModule;
}

// DEPRECATED: Please use `compile` or `compileStreaming` to get a compiled app,
// use `instantiate` method to get an instantiated app and then call
// `invokeMain` to invoke the main function.
export const invoke = (moduleInstance, ...args) => {
  moduleInstance.exports.$invokeMain(args);
}

class CompiledApp {
  constructor(module, builtins) {
    this.module = module;
    this.builtins = builtins;
  }

  // The second argument is an options object containing:
  // `loadDeferredModules` is a JS function that takes an array of module names
  //   matching wasm files produced by the dart2wasm compiler. It also takes a
  //   callback that should be invoked for each loaded module with 2 arugments:
  //   (1) the module name, (2) the loaded module in a format supported by
  //   `WebAssembly.compile` or `WebAssembly.compileStreaming`. The callback
  //   returns a Promise that resolves when the module is instantiated.
  //   loadDeferredModules should return a Promise that resolves when all the
  //   modules have been loaded and the callback promises have resolved.
  // `loadDeferredId` is a JS function that takes load ID produced by the
  //   compiler when the `load-ids` option is passed. Each load ID maps to one
  //   or more wasm files as specified in the emitted JSON file. It also takes a
  //   callback that should be invoked for each loaded module with 2 arugments:
  //   (1) the module name, (2) the loaded module in a format supported by
  //   `WebAssembly.compile` or `WebAssembly.compileStreaming`. The callback
  //   returns a Promise that resolves when the module is instantiated.
  //   loadDeferredModules should return a Promise that resolves when all the
  //   modules have been loaded and the callback promises have resolved.
  // `loadDynamicModule` is a JS function that takes two string names matching,
  //   in order, a wasm file produced by the dart2wasm compiler during dynamic
  //   module compilation and a corresponding js file produced by the same
  //   compilation. It also takes a callback that should be invoked with the
  //   loaded module in a format supported by `WebAssembly.compile` or
  //   `WebAssembly.compileStreaming` and the result of using the JS 'import'
  //   API on the js file path. It should return a Promise that resolves when
  //   all the modules have been loaded and the callback promises have resolved.
  async instantiate(additionalImports,
      {loadDeferredModules, loadDynamicModule, loadDeferredId} = {}) {
    let dartInstance;

    // Prints to the console
    function printToConsole(value) {
      if (typeof dartPrint == "function") {
        dartPrint(value);
        return;
      }
      if (typeof console == "object" && typeof console.log != "undefined") {
        console.log(value);
        return;
      }
      if (typeof print == "function") {
        print(value);
        return;
      }

      throw "Unable to print message: " + value;
    }

    // A special symbol attached to functions that wrap Dart functions.
    const jsWrappedDartFunctionSymbol = Symbol("JSWrappedDartFunction");

    function finalizeWrapper(dartFunction, wrapped) {
      wrapped.dartFunction = dartFunction;
      wrapped[jsWrappedDartFunctionSymbol] = true;
      return wrapped;
    }

    // Imports
    const dart2wasm = {
            _1: (decoder, codeUnits) => decoder.decode(codeUnits),
      _2: () => new TextDecoder("utf-8", {fatal: true}),
      _3: () => new TextDecoder("utf-8", {fatal: false}),
      _4: (s) => +s,
      _5: x0 => new Uint8Array(x0),
      _6: (x0,x1,x2) => x0.set(x1,x2),
      _7: (x0,x1) => x0.transferFromImageBitmap(x1),
      _8: x0 => x0.arrayBuffer(),
      _9: (x0,x1,x2) => x0.slice(x1,x2),
      _10: (x0,x1) => x0.decode(x1),
      _11: (x0,x1) => x0.segment(x1),
      _12: () => new TextDecoder(),
      _14: x0 => x0.buffer,
      _15: x0 => x0.wasmMemory,
      _16: () => globalThis.window._flutter_skwasmInstance,
      _17: x0 => x0.rasterStartMilliseconds,
      _18: x0 => x0.rasterEndMilliseconds,
      _19: x0 => x0.imageBitmaps,
      _135: (x0,x1) => x0.appendChild(x1),
      _166: (x0,x1,x2) => x0.addEventListener(x1,x2),
      _167: (x0,x1,x2) => x0.removeEventListener(x1,x2),
      _168: (x0,x1) => new OffscreenCanvas(x0,x1),
      _169: x0 => x0.remove(),
      _170: (x0,x1) => x0.append(x1),
      _172: x0 => x0.unlock(),
      _173: x0 => x0.getReader(),
      _174: (x0,x1) => x0.item(x1),
      _175: x0 => x0.next(),
      _176: x0 => x0.now(),
      _177: (x0,x1) => x0.revokeObjectURL(x1),
      _178: x0 => x0.close(),
      _179: (x0,x1,x2,x3,x4) => ({type: x0,data: x1,premultiplyAlpha: x2,colorSpaceConversion: x3,preferAnimation: x4}),
      _180: x0 => new window.ImageDecoder(x0),
      _181: (x0,x1) => ({frameIndex: x0,completeFramesOnly: x1}),
      _182: (x0,x1) => x0.decode(x1),
      _183: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._183(f,arguments.length,x0) }),
      _184: (x0,x1,x2,x3) => x0.addEventListener(x1,x2,x3),
      _186: (x0,x1) => x0.getModifierState(x1),
      _187: x0 => x0.preventDefault(),
      _188: x0 => x0.stopPropagation(),
      _189: (x0,x1) => x0.removeProperty(x1),
      _190: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._190(f,arguments.length,x0) }),
      _191: x0 => new window.FinalizationRegistry(x0),
      _192: (x0,x1,x2,x3) => x0.register(x1,x2,x3),
      _194: (x0,x1) => x0.unregister(x1),
      _195: (x0,x1) => x0.prepend(x1),
      _196: x0 => new Intl.Locale(x0),
      _197: (x0,x1) => x0.observe(x1),
      _198: x0 => x0.disconnect(),
      _199: (x0,x1) => x0.getAttribute(x1),
      _200: (x0,x1) => x0.contains(x1),
      _201: (x0,x1) => x0.querySelector(x1),
      _202: (x0,x1) => x0.matchMedia(x1),
      _203: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._203(f,arguments.length,x0) }),
      _204: (x0,x1,x2) => x0.call(x1,x2),
      _205: x0 => x0.blur(),
      _206: x0 => x0.hasFocus(),
      _207: (x0,x1) => x0.removeAttribute(x1),
      _208: (x0,x1,x2) => x0.insertBefore(x1,x2),
      _209: (x0,x1) => x0.hasAttribute(x1),
      _210: (x0,x1) => x0.getModifierState(x1),
      _211: (x0,x1) => x0.createTextNode(x1),
      _212: x0 => x0.getBoundingClientRect(),
      _213: (x0,x1) => x0.replaceWith(x1),
      _214: (x0,x1) => x0.contains(x1),
      _215: (x0,x1) => x0.closest(x1),
      _216: () => new Array(),
      _653: x0 => new Uint8Array(x0),
      _656: () => globalThis.window.flutterConfiguration,
      _658: x0 => x0.assetBase,
      _663: x0 => x0.canvasKitMaximumSurfaces,
      _664: x0 => x0.debugShowSemanticsNodes,
      _665: x0 => x0.hostElement,
      _666: x0 => x0.multiViewEnabled,
      _667: x0 => x0.nonce,
      _669: x0 => x0.fontFallbackBaseUrl,
      _679: x0 => x0.console,
      _680: x0 => x0.devicePixelRatio,
      _681: x0 => x0.document,
      _682: x0 => x0.history,
      _683: x0 => x0.innerHeight,
      _684: x0 => x0.innerWidth,
      _685: x0 => x0.location,
      _686: x0 => x0.navigator,
      _687: x0 => x0.visualViewport,
      _688: x0 => x0.performance,
      _689: x0 => x0.parent,
      _691: x0 => x0.URL,
      _693: (x0,x1) => x0.getComputedStyle(x1),
      _694: x0 => x0.screen,
      _695: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._695(f,arguments.length,x0) }),
      _696: (x0,x1) => x0.requestAnimationFrame(x1),
      _700: (x0,x1) => x0.warn(x1),
      _702: (x0,x1) => x0.debug(x1),
      _703: x0 => globalThis.parseFloat(x0),
      _704: () => globalThis.window,
      _705: () => globalThis.Intl,
      _706: () => globalThis.Symbol,
      _707: (x0,x1,x2,x3,x4) => globalThis.createImageBitmap(x0,x1,x2,x3,x4),
      _709: x0 => x0.clipboard,
      _710: x0 => x0.maxTouchPoints,
      _711: x0 => x0.vendor,
      _712: x0 => x0.language,
      _713: x0 => x0.platform,
      _714: x0 => x0.userAgent,
      _715: (x0,x1) => x0.vibrate(x1),
      _716: x0 => x0.languages,
      _717: x0 => x0.documentElement,
      _718: (x0,x1) => x0.querySelector(x1),
      _719: (x0,x1) => x0.querySelectorAll(x1),
      _721: (x0,x1) => x0.createElement(x1),
      _724: (x0,x1) => x0.createEvent(x1),
      _725: x0 => x0.activeElement,
      _728: x0 => x0.head,
      _729: x0 => x0.body,
      _731: (x0,x1) => { x0.title = x1 },
      _734: x0 => x0.visibilityState,
      _735: () => globalThis.document,
      _736: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._736(f,arguments.length,x0) }),
      _737: (x0,x1) => x0.dispatchEvent(x1),
      _745: x0 => x0.target,
      _747: x0 => x0.timeStamp,
      _748: x0 => x0.type,
      _750: (x0,x1,x2,x3) => x0.initEvent(x1,x2,x3),
      _757: x0 => x0.firstChild,
      _761: x0 => x0.parentElement,
      _763: (x0,x1) => { x0.textContent = x1 },
      _764: x0 => x0.parentNode,
      _765: x0 => x0.nextSibling,
      _766: (x0,x1) => x0.removeChild(x1),
      _767: x0 => x0.isConnected,
      _775: x0 => x0.clientHeight,
      _776: x0 => x0.clientWidth,
      _777: x0 => x0.offsetHeight,
      _778: x0 => x0.offsetWidth,
      _779: x0 => x0.id,
      _780: (x0,x1) => { x0.id = x1 },
      _783: (x0,x1) => { x0.spellcheck = x1 },
      _784: x0 => x0.tagName,
      _785: x0 => x0.style,
      _787: (x0,x1) => x0.querySelectorAll(x1),
      _788: (x0,x1,x2) => x0.setAttribute(x1,x2),
      _789: x0 => x0.tabIndex,
      _790: (x0,x1) => { x0.tabIndex = x1 },
      _791: (x0,x1) => x0.focus(x1),
      _792: x0 => x0.scrollTop,
      _793: (x0,x1) => { x0.scrollTop = x1 },
      _794: (x0,x1) => { x0.scrollLeft = x1 },
      _795: x0 => x0.scrollLeft,
      _796: x0 => x0.classList,
      _797: (x0,x1) => x0.scrollIntoView(x1),
      _800: (x0,x1) => { x0.className = x1 },
      _802: (x0,x1) => x0.getElementsByClassName(x1),
      _803: x0 => x0.click(),
      _804: (x0,x1) => x0.attachShadow(x1),
      _807: x0 => x0.computedStyleMap(),
      _808: (x0,x1) => x0.get(x1),
      _814: (x0,x1) => x0.getPropertyValue(x1),
      _815: (x0,x1,x2,x3) => x0.setProperty(x1,x2,x3),
      _816: x0 => x0.offsetLeft,
      _817: x0 => x0.offsetTop,
      _818: x0 => x0.offsetParent,
      _820: (x0,x1) => { x0.name = x1 },
      _821: x0 => x0.content,
      _822: (x0,x1) => { x0.content = x1 },
      _826: (x0,x1) => { x0.src = x1 },
      _827: x0 => x0.naturalWidth,
      _828: x0 => x0.naturalHeight,
      _832: (x0,x1) => { x0.crossOrigin = x1 },
      _834: (x0,x1) => { x0.decoding = x1 },
      _835: x0 => x0.decode(),
      _840: (x0,x1) => { x0.nonce = x1 },
      _845: (x0,x1) => { x0.width = x1 },
      _847: (x0,x1) => { x0.height = x1 },
      _850: (x0,x1) => x0.getContext(x1),
      _918: x0 => x0.width,
      _919: x0 => x0.height,
      _921: (x0,x1) => x0.fetch(x1),
      _922: x0 => x0.status,
      _924: x0 => x0.body,
      _925: x0 => x0.arrayBuffer(),
      _928: x0 => x0.read(),
      _929: x0 => x0.value,
      _930: x0 => x0.done,
      _937: x0 => x0.name,
      _938: x0 => x0.x,
      _939: x0 => x0.y,
      _942: x0 => x0.top,
      _943: x0 => x0.right,
      _944: x0 => x0.bottom,
      _945: x0 => x0.left,
      _955: x0 => x0.height,
      _956: x0 => x0.width,
      _957: x0 => x0.scale,
      _958: (x0,x1) => { x0.value = x1 },
      _961: (x0,x1) => { x0.placeholder = x1 },
      _963: (x0,x1) => { x0.name = x1 },
      _964: x0 => x0.selectionDirection,
      _965: x0 => x0.selectionStart,
      _966: x0 => x0.selectionEnd,
      _969: x0 => x0.value,
      _971: (x0,x1,x2) => x0.setSelectionRange(x1,x2),
      _972: x0 => x0.readText(),
      _973: (x0,x1) => x0.writeText(x1),
      _975: x0 => x0.altKey,
      _976: x0 => x0.code,
      _977: x0 => x0.ctrlKey,
      _978: x0 => x0.key,
      _979: x0 => x0.keyCode,
      _980: x0 => x0.location,
      _981: x0 => x0.metaKey,
      _982: x0 => x0.repeat,
      _983: x0 => x0.shiftKey,
      _984: x0 => x0.isComposing,
      _986: x0 => x0.state,
      _987: (x0,x1) => x0.go(x1),
      _989: (x0,x1,x2,x3) => x0.pushState(x1,x2,x3),
      _990: (x0,x1,x2,x3) => x0.replaceState(x1,x2,x3),
      _991: x0 => x0.pathname,
      _992: x0 => x0.search,
      _993: x0 => x0.hash,
      _997: x0 => x0.state,
      _1000: (x0,x1) => x0.createObjectURL(x1),
      _1002: x0 => new Blob(x0),
      _1012: x0 => x0.matches,
      _1016: x0 => x0.matches,
      _1020: x0 => x0.relatedTarget,
      _1022: x0 => x0.clientX,
      _1023: x0 => x0.clientY,
      _1024: x0 => x0.offsetX,
      _1025: x0 => x0.offsetY,
      _1028: x0 => x0.button,
      _1029: x0 => x0.buttons,
      _1030: x0 => x0.ctrlKey,
      _1034: x0 => x0.pointerId,
      _1035: x0 => x0.pointerType,
      _1036: x0 => x0.pressure,
      _1037: x0 => x0.tiltX,
      _1038: x0 => x0.tiltY,
      _1039: x0 => x0.getCoalescedEvents(),
      _1042: x0 => x0.deltaX,
      _1043: x0 => x0.deltaY,
      _1044: x0 => x0.wheelDeltaX,
      _1045: x0 => x0.wheelDeltaY,
      _1046: x0 => x0.deltaMode,
      _1053: x0 => x0.changedTouches,
      _1056: x0 => x0.clientX,
      _1057: x0 => x0.clientY,
      _1060: x0 => x0.data,
      _1063: (x0,x1) => { x0.disabled = x1 },
      _1065: (x0,x1) => { x0.type = x1 },
      _1066: (x0,x1) => { x0.max = x1 },
      _1067: (x0,x1) => { x0.min = x1 },
      _1068: x0 => x0.value,
      _1069: (x0,x1) => { x0.value = x1 },
      _1070: x0 => x0.disabled,
      _1071: (x0,x1) => { x0.disabled = x1 },
      _1073: (x0,x1) => { x0.placeholder = x1 },
      _1075: (x0,x1) => { x0.name = x1 },
      _1076: (x0,x1) => { x0.autocomplete = x1 },
      _1078: x0 => x0.selectionDirection,
      _1079: x0 => x0.selectionStart,
      _1081: x0 => x0.selectionEnd,
      _1084: (x0,x1,x2) => x0.setSelectionRange(x1,x2),
      _1085: (x0,x1) => x0.add(x1),
      _1087: (x0,x1) => { x0.noValidate = x1 },
      _1088: (x0,x1) => { x0.method = x1 },
      _1089: (x0,x1) => { x0.action = x1 },
      _1095: (x0,x1) => x0.getContext(x1),
      _1097: x0 => x0.convertToBlob(),
      _1114: x0 => x0.orientation,
      _1115: x0 => x0.width,
      _1116: x0 => x0.height,
      _1117: (x0,x1) => x0.lock(x1),
      _1136: x0 => new ResizeObserver(x0),
      _1139: (module,f) => finalizeWrapper(f, function(x0,x1) { return module.exports._1139(f,arguments.length,x0,x1) }),
      _1147: x0 => x0.length,
      _1148: x0 => x0.iterator,
      _1149: x0 => x0.Segmenter,
      _1150: x0 => x0.v8BreakIterator,
      _1151: (x0,x1) => new Intl.Segmenter(x0,x1),
      _1154: x0 => x0.language,
      _1155: x0 => x0.script,
      _1156: x0 => x0.region,
      _1174: x0 => x0.done,
      _1175: x0 => x0.value,
      _1176: x0 => x0.index,
      _1180: (x0,x1) => new Intl.v8BreakIterator(x0,x1),
      _1181: (x0,x1) => x0.adoptText(x1),
      _1182: x0 => x0.first(),
      _1183: x0 => x0.next(),
      _1184: x0 => x0.current(),
      _1186: () => globalThis.window.FinalizationRegistry,
      _1197: x0 => x0.hostElement,
      _1198: x0 => x0.viewConstraints,
      _1201: x0 => x0.maxHeight,
      _1202: x0 => x0.maxWidth,
      _1203: x0 => x0.minHeight,
      _1204: x0 => x0.minWidth,
      _1205: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1205(f,arguments.length,x0) }),
      _1206: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1206(f,arguments.length,x0) }),
      _1207: (x0,x1) => ({addView: x0,removeView: x1}),
      _1210: x0 => x0.loader,
      _1211: () => globalThis._flutter,
      _1212: (x0,x1) => x0.didCreateEngineInitializer(x1),
      _1213: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1213(f,arguments.length,x0) }),
      _1214: (module,f) => finalizeWrapper(f, function() { return module.exports._1214(f,arguments.length) }),
      _1215: (x0,x1) => ({initializeEngine: x0,autoStart: x1}),
      _1218: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1218(f,arguments.length,x0) }),
      _1219: x0 => ({runApp: x0}),
      _1221: (module,f) => finalizeWrapper(f, function(x0,x1) { return module.exports._1221(f,arguments.length,x0,x1) }),
      _1222: x0 => new Promise(x0),
      _1223: x0 => x0.length,
      _1224: () => globalThis.window.ImageDecoder,
      _1225: x0 => x0.tracks,
      _1227: x0 => x0.completed,
      _1229: x0 => x0.image,
      _1235: x0 => x0.displayWidth,
      _1236: x0 => x0.displayHeight,
      _1237: x0 => x0.duration,
      _1240: x0 => x0.ready,
      _1241: x0 => x0.selectedTrack,
      _1242: x0 => x0.repetitionCount,
      _1243: x0 => x0.frameCount,
      _1289: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1289(f,arguments.length,x0) }),
      _1290: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1290(f,arguments.length,x0) }),
      _1291: (x0,x1) => x0.append(x1),
      _1292: x0 => x0.getVideoTracks(),
      _1293: x0 => x0.getSupportedConstraints(),
      _1294: x0 => ({video: x0}),
      _1295: x0 => ({facingMode: x0}),
      _1296: (x0,x1) => x0.getUserMedia(x1),
      _1298: (x0,x1) => x0.querySelector(x1),
      _1299: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1299(f,arguments.length,x0) }),
      _1300: (x0,x1) => x0.removeChild(x1),
      _1301: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1301(f,arguments.length,x0) }),
      _1302: (x0,x1) => x0.appendChild(x1),
      _1303: () => new Map(),
      _1304: (x0,x1,x2) => x0.set(x1,x2),
      _1305: (x0,x1,x2,x3) => x0.call(x1,x2,x3),
      _1306: (module,f) => finalizeWrapper(f, function(x0,x1) { return module.exports._1306(f,arguments.length,x0,x1) }),
      _1307: (x0,x1) => x0.call(x1),
      _1308: (x0,x1) => new ZXing.BrowserMultiFormatReader(x0,x1),
      _1310: x0 => x0.play(),
      _1324: (x0,x1,x2,x3) => x0.addEventListener(x1,x2,x3),
      _1325: (x0,x1,x2,x3) => x0.removeEventListener(x1,x2,x3),
      _1326: (x0,x1) => x0.createElement(x1),
      _1327: (x0,x1,x2) => x0.setAttribute(x1,x2),
      _1334: x0 => ({type: x0}),
      _1335: (x0,x1) => new Blob(x0,x1),
      _1336: x0 => globalThis.URL.createObjectURL(x0),
      _1337: (x0,x1) => x0.getElementById(x1),
      _1338: (x0,x1,x2) => x0.removeEventListener(x1,x2),
      _1339: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1339(f,arguments.length,x0) }),
      _1340: (x0,x1,x2) => x0.addEventListener(x1,x2),
      _1341: x0 => x0.remove(),
      _1342: x0 => x0.click(),
      _1343: () => ({}),
      _1344: x0 => globalThis.pdfjsLib.getDocument(x0),
      _1345: (x0,x1) => x0.getContext(x1),
      _1346: (x0,x1) => x0.getPage(x1),
      _1347: (x0,x1) => x0.getViewport(x1),
      _1348: (x0,x1) => x0.render(x1),
      _1349: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1349(f,arguments.length,x0) }),
      _1350: (x0,x1) => x0.toBlob(x1),
      _1351: () => new FileReader(),
      _1352: (x0,x1) => x0.readAsArrayBuffer(x1),
      _1353: x0 => x0.cleanup(),
      _1354: x0 => x0.destroy(),
      _1362: (x0,x1) => x0.getItem(x1),
      _1363: (x0,x1) => x0.removeItem(x1),
      _1364: (x0,x1,x2) => x0.setItem(x1,x2),
      _1365: x0 => x0.barcodeFormat,
      _1366: x0 => x0.text,
      _1367: x0 => x0.rawBytes,
      _1368: x0 => x0.resultPoints,
      _1370: Date.now,
      _1372: s => new Date(s * 1000).getTimezoneOffset() * 60,
      _1373: s => {
        if (!/^\s*[+-]?(?:Infinity|NaN|(?:\.\d+|\d+(?:\.\d*)?)(?:[eE][+-]?\d+)?)\s*$/.test(s)) {
          return NaN;
        }
        return parseFloat(s);
      },
      _1374: () => typeof dartUseDateNowForTicks !== "undefined",
      _1375: () => 1000 * performance.now(),
      _1376: () => Date.now(),
      _1377: () => {
        // On browsers return `globalThis.location.href`
        if (globalThis.location != null) {
          return globalThis.location.href;
        }
        return null;
      },
      _1378: () => {
        return typeof process != "undefined" &&
               Object.prototype.toString.call(process) == "[object process]" &&
               process.platform == "win32"
      },
      _1379: () => new WeakMap(),
      _1380: (map, o) => map.get(o),
      _1381: (map, o, v) => map.set(o, v),
      _1382: x0 => new WeakRef(x0),
      _1383: x0 => x0.deref(),
      _1390: () => globalThis.WeakRef,
      _1393: s => JSON.stringify(s),
      _1394: s => printToConsole(s),
      _1395: o => {
        if (o === null || o === undefined) return 0;
        if (typeof(o) === 'string') return 1;
        return 2;
      },
      _1396: (o, p, r) => o.replaceAll(p, () => r),
      _1397: (o, p, r) => o.replace(p, () => r),
      _1398: Function.prototype.call.bind(String.prototype.toLowerCase),
      _1399: s => s.toUpperCase(),
      _1400: s => s.trim(),
      _1401: s => s.trimLeft(),
      _1402: s => s.trimRight(),
      _1403: (string, times) => string.repeat(times),
      _1404: Function.prototype.call.bind(String.prototype.indexOf),
      _1405: (s, p, i) => s.lastIndexOf(p, i),
      _1406: (string, token) => string.split(token),
      _1407: Object.is,
      _1411: (o, t) => typeof o === t,
      _1412: (o, c) => o instanceof c,
      _1413: o => Object.keys(o),
      _1466: x0 => new Array(x0),
      _1468: x0 => x0.length,
      _1470: (x0,x1) => x0[x1],
      _1471: (x0,x1,x2) => { x0[x1] = x2 },
      _1474: (x0,x1,x2) => new DataView(x0,x1,x2),
      _1476: x0 => new Int8Array(x0),
      _1477: (x0,x1,x2) => new Uint8Array(x0,x1,x2),
      _1479: x0 => new Uint8ClampedArray(x0),
      _1481: x0 => new Int16Array(x0),
      _1483: x0 => new Uint16Array(x0),
      _1485: x0 => new Int32Array(x0),
      _1487: x0 => new Uint32Array(x0),
      _1489: x0 => new Float32Array(x0),
      _1491: x0 => new Float64Array(x0),
      _1515: x0 => x0.random(),
      _1516: (x0,x1) => x0.getRandomValues(x1),
      _1517: () => globalThis.crypto,
      _1518: () => globalThis.Math,
      _1531: (ms, c) =>
      setTimeout(() => dartInstance.exports.$invokeCallback(c),ms),
      _1532: (handle) => clearTimeout(handle),
      _1533: (ms, c) =>
      setInterval(() => dartInstance.exports.$invokeCallback(c), ms),
      _1534: (handle) => clearInterval(handle),
      _1535: (c) =>
      queueMicrotask(() => dartInstance.exports.$invokeCallback(c)),
      _1536: () => Date.now(),
      _1537: () => new Error().stack,
      _1538: (exn) => {
        let stackString = exn.toString();
        let frames = stackString.split('\n');
        let drop = 4;
        if (frames[0].startsWith('Error')) {
            drop += 1;
        }
        return frames.slice(drop).join('\n');
      },
      _1539: (s, m) => {
        try {
          return new RegExp(s, m);
        } catch (e) {
          return String(e);
        }
      },
      _1540: (x0,x1) => x0.exec(x1),
      _1541: (x0,x1) => x0.test(x1),
      _1542: x0 => x0.pop(),
      _1544: o => o === undefined,
      _1546: o => typeof o === 'function' && o[jsWrappedDartFunctionSymbol] === true,
      _1548: o => {
        const proto = Object.getPrototypeOf(o);
        return proto === Object.prototype || proto === null;
      },
      _1549: o => o instanceof RegExp,
      _1550: (l, r) => l === r,
      _1551: o => o,
      _1552: o => {
        if (o === undefined || o === null) return 0;
        if (typeof o === 'number') return 1;
        return 2;
      },
      _1553: o => o,
      _1554: o => {
        if (o === undefined || o === null) return 0;
        if (typeof o === 'boolean') return 1;
        return 2;
      },
      _1555: o => o,
      _1556: b => !!b,
      _1557: o => o.length,
      _1559: (o, i) => o[i],
      _1560: f => f.dartFunction,
      _1561: () => ({}),
      _1562: () => [],
      _1564: () => globalThis,
      _1565: (constructor, args) => {
        const factoryFunction = constructor.bind.apply(
            constructor, [null, ...args]);
        return new factoryFunction();
      },
      _1567: (o, p) => o[p],
      _1568: (o, p, v) => o[p] = v,
      _1569: (o, m, a) => o[m].apply(o, a),
      _1571: o => String(o),
      _1572: (p, s, f) => p.then(s, (e) => f(e, e === undefined)),
      _1573: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1573(f,arguments.length,x0) }),
      _1574: (module,f) => finalizeWrapper(f, function(x0,x1) { return module.exports._1574(f,arguments.length,x0,x1) }),
      _1575: o => {
        if (o === undefined) return 1;
        var type = typeof o;
        if (type === 'boolean') return 2;
        if (type === 'number') return 3;
        if (type === 'string') return 4;
        if (o instanceof Array) return 5;
        if (ArrayBuffer.isView(o)) {
          if (o instanceof Int8Array) return 6;
          if (o instanceof Uint8Array) return 7;
          if (o instanceof Uint8ClampedArray) return 8;
          if (o instanceof Int16Array) return 9;
          if (o instanceof Uint16Array) return 10;
          if (o instanceof Int32Array) return 11;
          if (o instanceof Uint32Array) return 12;
          if (o instanceof Float32Array) return 13;
          if (o instanceof Float64Array) return 14;
          if (o instanceof DataView) return 15;
        }
        if (o instanceof ArrayBuffer) return 16;
        // Feature check for `SharedArrayBuffer` before doing a type-check.
        if (globalThis.SharedArrayBuffer !== undefined &&
            o instanceof SharedArrayBuffer) {
            return 17;
        }
        if (o instanceof Promise) return 18;
        return 19;
      },
      _1576: o => [o],
      _1577: (o0, o1) => [o0, o1],
      _1578: (o0, o1, o2) => [o0, o1, o2],
      _1579: (o0, o1, o2, o3) => [o0, o1, o2, o3],
      _1580: (exn) => {
        if (exn instanceof Error) {
          return exn.stack;
        } else {
          return null;
        }
      },
      _1581: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmI8ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      _1582: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmI8ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      _1583: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmI16ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      _1584: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmI16ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      _1585: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmI32ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      _1586: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmI32ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      _1587: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmF32ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      _1588: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmF32ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      _1589: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmF64ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      _1590: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmF64ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      _1591: x0 => new ArrayBuffer(x0),
      _1592: s => {
        if (/[[\]{}()*+?.\\^$|]/.test(s)) {
            s = s.replace(/[[\]{}()*+?.\\^$|]/g, '\\$&');
        }
        return s;
      },
      _1594: x0 => x0.index,
      _1596: x0 => x0.flags,
      _1597: x0 => x0.multiline,
      _1598: x0 => x0.ignoreCase,
      _1599: x0 => x0.unicode,
      _1600: x0 => x0.dotAll,
      _1601: (x0,x1) => { x0.lastIndex = x1 },
      _1602: (o, p) => p in o,
      _1603: (o, p) => o[p],
      _1606: () => new XMLHttpRequest(),
      _1609: (x0,x1,x2) => x0.setRequestHeader(x1,x2),
      _1610: (x0,x1) => x0.send(x1),
      _1611: x0 => x0.send(),
      _1613: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1613(f,arguments.length,x0) }),
      _1614: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1614(f,arguments.length,x0) }),
      _1619: (x0,x1) => new WebSocket(x0,x1),
      _1620: (x0,x1) => x0.send(x1),
      _1621: (x0,x1,x2) => x0.close(x1,x2),
      _1622: (x0,x1) => x0.close(x1),
      _1623: x0 => x0.close(),
      _1626: (x0,x1,x2) => x0.open(x1,x2),
      _1627: x0 => x0.abort(),
      _1628: x0 => x0.getAllResponseHeaders(),
      _1629: () => new AbortController(),
      _1630: x0 => x0.abort(),
      _1631: (x0,x1,x2,x3,x4,x5) => ({method: x0,headers: x1,body: x2,credentials: x3,redirect: x4,signal: x5}),
      _1632: (x0,x1) => globalThis.fetch(x0,x1),
      _1633: (x0,x1) => x0.get(x1),
      _1634: (module,f) => finalizeWrapper(f, function(x0,x1,x2) { return module.exports._1634(f,arguments.length,x0,x1,x2) }),
      _1635: (x0,x1) => x0.forEach(x1),
      _1636: x0 => x0.getReader(),
      _1637: x0 => x0.cancel(),
      _1638: x0 => x0.read(),
      _1639: x0 => new BroadcastChannel(x0),
      _1640: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1640(f,arguments.length,x0) }),
      _1641: (x0,x1) => x0.postMessage(x1),
      _1642: x0 => x0.close(),
      _1643: x0 => x0.attachStreamToVideo,
      _1645: x0 => x0.decodeContinuously,
      _1649: x0 => x0.reset,
      _1651: x0 => x0.stopContinuousDecode,
      _1653: x0 => x0.stream,
      _1654: x0 => x0.videoElement,
      _1655: (x0,x1,x2,x3) => x0.replaceState(x1,x2,x3),
      _1656: (x0,x1) => x0.key(x1),
      _1658: (x0,x1) => { x0.data = x1 },
      _1659: (x0,x1) => { x0.scale = x1 },
      _1660: (x0,x1) => { x0.canvasContext = x1 },
      _1661: (x0,x1) => { x0.viewport = x1 },
      _1662: (x0,x1) => { x0.cMapUrl = x1 },
      _1663: (x0,x1) => { x0.cMapPacked = x1 },
      _1664: x0 => x0.promise,
      _1665: x0 => x0.numPages,
      _1666: x0 => x0.width,
      _1667: x0 => x0.height,
      _1668: x0 => x0.promise,
      _1670: x0 => x0.facingMode,
      _1671: x0 => x0.getSettings(),
      _1672: (x0,x1) => ({width: x0,height: x1}),
      _1673: (x0,x1,x2) => ({width: x0,height: x1,facingMode: x2}),
      _1674: o => o instanceof Array,
      _1678: a => a.pop(),
      _1679: (a, i) => a.splice(i, 1),
      _1680: (a, s) => a.join(s),
      _1681: (a, s, e) => a.slice(s, e),
      _1683: (a, b) => a == b ? 0 : (a > b ? 1 : -1),
      _1684: a => a.length,
      _1686: (a, i) => a[i],
      _1687: (a, i, v) => a[i] = v,
      _1688: (a, t) => a.concat(t),
      _1689: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof ArrayBuffer) return 1;
        if (globalThis.SharedArrayBuffer !== undefined &&
            o instanceof SharedArrayBuffer) {
          return 2;
        }
        return 3;
      },
      _1690: (o, offsetInBytes, lengthInBytes) => {
        var dst = new ArrayBuffer(lengthInBytes);
        new Uint8Array(dst).set(new Uint8Array(o, offsetInBytes, lengthInBytes));
        return new DataView(dst);
      },
      _1692: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Uint8Array) return 1;
        return 2;
      },
      _1693: (o, start, length) => new Uint8Array(o.buffer, o.byteOffset + start, length),
      _1694: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Int8Array) return 1;
        return 2;
      },
      _1695: (o, start, length) => new Int8Array(o.buffer, o.byteOffset + start, length),
      _1696: o => o instanceof Uint8ClampedArray,
      _1697: (o, start, length) => new Uint8ClampedArray(o.buffer, o.byteOffset + start, length),
      _1698: o => o instanceof Uint16Array,
      _1699: (o, start, length) => new Uint16Array(o.buffer, o.byteOffset + start, length),
      _1700: o => o instanceof Int16Array,
      _1701: (o, start, length) => new Int16Array(o.buffer, o.byteOffset + start, length),
      _1702: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Uint32Array) return 1;
        return 2;
      },
      _1703: (o, start, length) => new Uint32Array(o.buffer, o.byteOffset + start, length),
      _1704: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Int32Array) return 1;
        return 2;
      },
      _1705: (o, start, length) => new Int32Array(o.buffer, o.byteOffset + start, length),
      _1707: (o, start, length) => new BigInt64Array(o.buffer, o.byteOffset + start, length),
      _1708: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Float32Array) return 1;
        return 2;
      },
      _1709: (o, start, length) => new Float32Array(o.buffer, o.byteOffset + start, length),
      _1710: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Float64Array) return 1;
        return 2;
      },
      _1711: (o, start, length) => new Float64Array(o.buffer, o.byteOffset + start, length),
      _1712: (a, i) => a.push(i),
      _1713: (t, s) => t.set(s),
      _1714: l => new DataView(new ArrayBuffer(l)),
      _1715: (o) => new DataView(o.buffer, o.byteOffset, o.byteLength),
      _1716: o => o.byteLength,
      _1717: o => o.buffer,
      _1718: o => o.byteOffset,
      _1719: Function.prototype.call.bind(Object.getOwnPropertyDescriptor(DataView.prototype, 'byteLength').get),
      _1720: (b, o) => new DataView(b, o),
      _1721: (b, o, l) => new DataView(b, o, l),
      _1722: Function.prototype.call.bind(DataView.prototype.getUint8),
      _1723: Function.prototype.call.bind(DataView.prototype.setUint8),
      _1724: Function.prototype.call.bind(DataView.prototype.getInt8),
      _1725: Function.prototype.call.bind(DataView.prototype.setInt8),
      _1726: Function.prototype.call.bind(DataView.prototype.getUint16),
      _1727: Function.prototype.call.bind(DataView.prototype.setUint16),
      _1728: Function.prototype.call.bind(DataView.prototype.getInt16),
      _1729: Function.prototype.call.bind(DataView.prototype.setInt16),
      _1730: Function.prototype.call.bind(DataView.prototype.getUint32),
      _1731: Function.prototype.call.bind(DataView.prototype.setUint32),
      _1732: Function.prototype.call.bind(DataView.prototype.getInt32),
      _1733: Function.prototype.call.bind(DataView.prototype.setInt32),
      _1736: Function.prototype.call.bind(DataView.prototype.getBigInt64),
      _1737: Function.prototype.call.bind(DataView.prototype.setBigInt64),
      _1738: Function.prototype.call.bind(DataView.prototype.getFloat32),
      _1739: Function.prototype.call.bind(DataView.prototype.setFloat32),
      _1740: Function.prototype.call.bind(DataView.prototype.getFloat64),
      _1741: Function.prototype.call.bind(DataView.prototype.setFloat64),
      _1742: Function.prototype.call.bind(Number.prototype.toString),
      _1743: Function.prototype.call.bind(BigInt.prototype.toString),
      _1744: Function.prototype.call.bind(Number.prototype.toString),
      _1745: (d, digits) => d.toFixed(digits),
      _1758: () => globalThis.console,
      _1797: (x0,x1) => x0.error(x1),
      _1810: x0 => x0.x,
      _1811: x0 => x0.y,
      _1849: x0 => x0.readyState,
      _1851: (x0,x1) => { x0.timeout = x1 },
      _1853: (x0,x1) => { x0.withCredentials = x1 },
      _1854: x0 => x0.upload,
      _1855: x0 => x0.responseURL,
      _1856: x0 => x0.status,
      _1857: x0 => x0.statusText,
      _1859: (x0,x1) => { x0.responseType = x1 },
      _1860: x0 => x0.response,
      _1872: x0 => x0.loaded,
      _1873: x0 => x0.total,
      _1907: (x0,x1) => { x0.lang = x1 },
      _1936: x0 => x0.style,
      _1995: (x0,x1) => { x0.onerror = x1 },
      _2011: (x0,x1) => { x0.onload = x1 },
      _2035: (x0,x1) => { x0.onpause = x1 },
      _2037: (x0,x1) => { x0.onplay = x1 },
      _2293: (x0,x1) => { x0.target = x1 },
      _2295: (x0,x1) => { x0.download = x1 },
      _2320: (x0,x1) => { x0.href = x1 },
      _2508: x0 => x0.videoWidth,
      _2509: x0 => x0.videoHeight,
      _2557: x0 => x0.paused,
      _2572: (x0,x1) => { x0.controls = x1 },
      _3171: (x0,x1) => { x0.src = x1 },
      _3173: (x0,x1) => { x0.type = x1 },
      _3177: (x0,x1) => { x0.async = x1 },
      _3179: (x0,x1) => { x0.defer = x1 },
      _3181: (x0,x1) => { x0.crossOrigin = x1 },
      _3216: x0 => x0.width,
      _3217: (x0,x1) => { x0.width = x1 },
      _3218: x0 => x0.height,
      _3219: (x0,x1) => { x0.height = x1 },
      _3640: () => globalThis.window,
      _3680: x0 => x0.document,
      _3683: x0 => x0.location,
      _3684: x0 => x0.history,
      _3702: x0 => x0.navigator,
      _3966: x0 => x0.localStorage,
      _3974: x0 => x0.href,
      _4074: x0 => x0.mediaDevices,
      _4090: x0 => x0.userAgent,
      _4141: x0 => x0.data,
      _4188: (x0,x1) => { x0.onmessage = x1 },
      _4295: x0 => x0.length,
      _4512: x0 => x0.readyState,
      _4525: (x0,x1) => { x0.binaryType = x1 },
      _4528: x0 => x0.code,
      _4529: x0 => x0.reason,
      _6237: x0 => x0.signal,
      _6310: () => globalThis.document,
      _6391: x0 => x0.body,
      _6393: x0 => x0.head,
      _6723: (x0,x1) => { x0.id = x1 },
      _6747: (x0,x1) => { x0.innerHTML = x1 },
      _8069: x0 => x0.value,
      _8071: x0 => x0.done,
      _8273: x0 => x0.result,
      _8770: x0 => x0.url,
      _8772: x0 => x0.status,
      _8774: x0 => x0.statusText,
      _8775: x0 => x0.headers,
      _8776: x0 => x0.body,
      _9578: x0 => x0.label,
      _9600: x0 => x0.facingMode,
      _9814: x0 => x0.width,
      _9816: x0 => x0.height,
      _9822: x0 => x0.facingMode,
      _11341: (x0,x1) => { x0.height = x1 },
      _11535: (x0,x1) => { x0.objectFit = x1 },
      _11665: (x0,x1) => { x0.pointerEvents = x1 },
      _11963: (x0,x1) => { x0.transform = x1 },
      _11967: (x0,x1) => { x0.transformOrigin = x1 },
      _12031: (x0,x1) => { x0.width = x1 },
      _12399: x0 => x0.name,
      _13142: x0 => x0.message,

    };

    const baseImports = {
      dart2wasm: dart2wasm,
      Math: Math,
      Date: Date,
      Object: Object,
      Array: Array,
      Reflect: Reflect,
      WebAssembly: {
        JSTag: WebAssembly.JSTag,
      },
      "": new Proxy({}, { get(_, prop) { return prop; } }),

    };

    const jsStringPolyfill = {
      "charCodeAt": (s, i) => s.charCodeAt(i),
      "compare": (s1, s2) => {
        if (s1 < s2) return -1;
        if (s1 > s2) return 1;
        return 0;
      },
      "concat": (s1, s2) => s1 + s2,
      "equals": (s1, s2) => s1 === s2,
      "fromCharCode": (i) => String.fromCharCode(i),
      "length": (s) => s.length,
      "substring": (s, a, b) => s.substring(a, b),
      "fromCharCodeArray": (a, start, end) => {
        if (end <= start) return '';

        const read = dartInstance.exports.$wasmI16ArrayGet;
        let result = '';
        let index = start;
        const chunkLength = Math.min(end - index, 500);
        let array = new Array(chunkLength);
        while (index < end) {
          const newChunkLength = Math.min(end - index, 500);
          for (let i = 0; i < newChunkLength; i++) {
            array[i] = read(a, index++);
          }
          if (newChunkLength < chunkLength) {
            array = array.slice(0, newChunkLength);
          }
          result += String.fromCharCode(...array);
        }
        return result;
      },
      "intoCharCodeArray": (s, a, start) => {
        if (s === '') return 0;

        const write = dartInstance.exports.$wasmI16ArraySet;
        for (var i = 0; i < s.length; ++i) {
          write(a, start++, s.charCodeAt(i));
        }
        return s.length;
      },
      "test": (s) => typeof s == "string",
    };


    

    dartInstance = await WebAssembly.instantiate(this.module, {
      ...baseImports,
      ...additionalImports,
      
      "wasm:js-string": jsStringPolyfill,
    });
    dartInstance.exports.$setThisModule(dartInstance);

    return new InstantiatedApp(this, dartInstance);
  }
}

class InstantiatedApp {
  constructor(compiledApp, instantiatedModule) {
    this.compiledApp = compiledApp;
    this.instantiatedModule = instantiatedModule;
  }

  // Call the main function with the given arguments.
  invokeMain(...args) {
    this.instantiatedModule.exports.$invokeMain(args);
  }
}

const { performance } = require('perf_hooks');

class MockCanvasContext {
  createImageData(w, h) {
    return { data: new Uint8ClampedArray(w * h * 4) };
  }
  putImageData() {}
}

const ctx = new MockCanvasContext();

function testBaseline() {
  const start = performance.now();
  for (let iter = 0; iter < 1000; iter++) {
    const imgData = ctx.createImageData(200, 120);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const v = Math.random() * 255;
      imgData.data[i] = v;
      imgData.data[i + 1] = v;
      imgData.data[i + 2] = v;
      imgData.data[i + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
  }
  const end = performance.now();
  console.log(`Baseline (1000 frames): ${end - start} ms`);
}

function testOptimized() {
  const start = performance.now();

  const frames = [];
  const numFrames = 8;
  for (let f = 0; f < numFrames; f++) {
    const imgData = ctx.createImageData(200, 120);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const v = Math.random() * 255;
      imgData.data[i] = v;
      imgData.data[i + 1] = v;
      imgData.data[i + 2] = v;
      imgData.data[i + 3] = 255;
    }
    frames.push(imgData);
  }

  let frameIdx = 0;
  for (let iter = 0; iter < 1000; iter++) {
    ctx.putImageData(frames[frameIdx], 0, 0);
    frameIdx = (frameIdx + 1) % numFrames;
  }

  const end = performance.now();
  console.log(`Optimized (1000 frames): ${end - start} ms`);
}

testBaseline();
testOptimized();

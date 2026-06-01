importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs');
importScripts('https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd');

let model = null;

async function loadModel() {
  try {
    await tf.ready();
    model = await cocoSsd.load();
    postMessage({ type: 'READY' });
  } catch (err) {
    console.error("TF Worker init error:", err);
  }
}

loadModel();

onmessage = async (e) => {
  if (!model) return;
  if (e.data.type === 'DETECT') {
    try {
      // Execute detection completely off the main thread
      const predictions = await model.detect(e.data.imageData);
      postMessage({ type: 'PREDICTIONS', predictions });
    } catch (err) {
      console.error("TF Worker detect error:", err);
    }
  }
};

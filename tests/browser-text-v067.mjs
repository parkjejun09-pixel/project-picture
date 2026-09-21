import assert from 'node:assert/strict';
import {browserHarness} from './browserHarness.mjs';

const h = await browserHarness();
try {
  const results = await h.page.evaluate(async () => {
    const {createEditableLayerData} = await import('/js/drawing/editableLayers.js');
    const {EditableLayerRenderer} = await import('/js/drawing/editableLayerRenderer.js');
    const createCanvas = (width, height) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      return canvas;
    };
    const renderer = new EditableLayerRenderer(createCanvas);

    const renderReference = (data, graphemesByLine) => {
      const canvas = createCanvas(420, 240);
      const context = canvas.getContext('2d');
      context.textBaseline = 'top';
      context.font = `${data.fontWeight} ${data.fontSize}px ${data.fontFamily}`;
      context.fillStyle = data.fillColor;
      context.strokeStyle = data.outlineColor;
      context.lineWidth = data.outlineWidth * 2;
      context.lineJoin = 'round';
      graphemesByLine.forEach((graphemes, lineIndex) => {
        const width = graphemes.reduce((total, grapheme) => total + context.measureText(grapheme).width, 0)
          + Math.max(0, graphemes.length - 1) * data.letterSpacing;
        let x = data.x;
        if (data.alignment === 'center') x -= width / 2;
        if (data.alignment === 'right') x -= width;
        const y = data.y + lineIndex * data.fontSize * data.lineHeight;
        for (const grapheme of graphemes) {
          if (data.outlineWidth > 0) context.strokeText(grapheme, x, y);
          context.fillText(grapheme, x, y);
          x += context.measureText(grapheme).width + data.letterSpacing;
        }
      });
      return canvas;
    };

    const differenceCount = (actual, expected) => {
      const a = actual.getContext('2d').getImageData(0, 0, actual.width, actual.height).data;
      const b = expected.getContext('2d').getImageData(0, 0, expected.width, expected.height).data;
      let differences = 0;
      for (let index = 0; index < a.length; index += 1) if (a[index] !== b[index]) differences += 1;
      return differences;
    };

    const zeroSpacing = {
      ...createEditableLayerData('text', 420, 240),
      content: 'Cafe\u0301\n👩‍💻',
      x: 210,
      y: 24,
      fontFamily: 'sans-serif',
      fontSize: 52,
      fontWeight: 700,
      alignment: 'center',
      lineHeight: 1.35,
      letterSpacing: 0,
      fillColor: '#24364b',
      outlineColor: '#f6b73c',
      outlineWidth: 2
    };
    const customSpacing = {
      ...zeroSpacing,
      content: 'e\u0301👩‍💻Z',
      x: 390,
      y: 120,
      alignment: 'right',
      letterSpacing: 7
    };
    const asciiSpacing = {
      ...zeroSpacing,
      content: 'ABC',
      x: 24,
      y: 176,
      alignment: 'left',
      letterSpacing: 5
    };

    return {
      zeroSpacing: differenceCount(
        renderer.render(zeroSpacing, 420, 240),
        renderReference(zeroSpacing, [['Cafe\u0301'], ['👩‍💻']])
      ),
      customSpacing: differenceCount(
        renderer.render(customSpacing, 420, 240),
        renderReference(customSpacing, [['e\u0301', '👩‍💻', 'Z']])
      ),
      asciiSpacing: differenceCount(
        renderer.render(asciiSpacing, 420, 240),
        renderReference(asciiSpacing, [['A', 'B', 'C']])
      )
    };
  });

  assert.equal(results.zeroSpacing, 0, `combining/ZWJ multiline pixels differ in ${results.zeroSpacing} channels`);
  assert.equal(results.customSpacing, 0, `custom grapheme-spacing pixels differ in ${results.customSpacing} channels`);
  assert.equal(results.asciiSpacing, 0, `legacy ASCII spacing pixels differ in ${results.asciiSpacing} channels`);
  assert.deepEqual(h.errors, []);
  console.log('PASS editable text renders combining sequences and joined emoji as graphemes');
} finally {
  await h.close();
}

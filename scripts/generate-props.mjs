// Generates blocky placeholder props as GLB files into public/models/.
// Real voxel props (MagicaVoxel exports) can replace these 1:1 later.
import { Document, NodeIO } from '@gltf-transform/core'
import { mkdir } from 'node:fs/promises'

const OUT_DIR = 'public/models'

function srgbToLinear(channel) {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
}

function hexToLinearRgb(hex) {
  const value = hex.replace('#', '')
  return [0, 2, 4].map((i) => srgbToLinear(parseInt(value.slice(i, i + 2), 16) / 255))
}

// 6 faces x 4 vertices with per-face normals, so lighting stays flat and blocky.
const FACES = [
  {
    n: [0, 0, 1],
    c: [
      [-1, -1, 1],
      [1, -1, 1],
      [1, 1, 1],
      [-1, 1, 1],
    ],
  },
  {
    n: [0, 0, -1],
    c: [
      [1, -1, -1],
      [-1, -1, -1],
      [-1, 1, -1],
      [1, 1, -1],
    ],
  },
  {
    n: [1, 0, 0],
    c: [
      [1, -1, 1],
      [1, -1, -1],
      [1, 1, -1],
      [1, 1, 1],
    ],
  },
  {
    n: [-1, 0, 0],
    c: [
      [-1, -1, -1],
      [-1, -1, 1],
      [-1, 1, 1],
      [-1, 1, -1],
    ],
  },
  {
    n: [0, 1, 0],
    c: [
      [-1, 1, 1],
      [1, 1, 1],
      [1, 1, -1],
      [-1, 1, -1],
    ],
  },
  {
    n: [0, -1, 0],
    c: [
      [-1, -1, -1],
      [1, -1, -1],
      [1, -1, 1],
      [-1, -1, 1],
    ],
  },
]

function buildProp(name, boxes) {
  const doc = new Document()
  const buffer = doc.createBuffer()
  const scene = doc.createScene('Scene')
  const root = doc.createNode(name)
  scene.addChild(root)

  const materials = new Map()
  const materialFor = (hex) => {
    if (!materials.has(hex)) {
      materials.set(
        hex,
        doc
          .createMaterial(hex)
          .setBaseColorFactor([...hexToLinearRgb(hex), 1])
          .setMetallicFactor(0)
          .setRoughnessFactor(0.9),
      )
    }
    return materials.get(hex)
  }

  for (const box of boxes) {
    const positions = []
    const normals = []
    const indices = []
    for (const face of FACES) {
      const base = positions.length / 3
      for (const corner of face.c) {
        positions.push(corner[0] * 0.5, corner[1] * 0.5, corner[2] * 0.5)
      }
      for (let i = 0; i < 4; i++) normals.push(...face.n)
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
    }
    const primitive = doc
      .createPrimitive()
      .setAttribute(
        'POSITION',
        doc
          .createAccessor()
          .setType('VEC3')
          .setArray(new Float32Array(positions))
          .setBuffer(buffer),
      )
      .setAttribute(
        'NORMAL',
        doc.createAccessor().setType('VEC3').setArray(new Float32Array(normals)).setBuffer(buffer),
      )
      .setIndices(
        doc.createAccessor().setType('SCALAR').setArray(new Uint16Array(indices)).setBuffer(buffer),
      )
      .setMaterial(materialFor(box.color))

    const node = doc
      .createNode(box.name)
      .setMesh(doc.createMesh(box.name).addPrimitive(primitive))
      .setScale(box.size)
      .setTranslation(box.position)
    if (box.rotationZ) {
      node.setRotation([0, 0, Math.sin(box.rotationZ / 2), Math.cos(box.rotationZ / 2)])
    }
    root.addChild(node)
  }

  return doc
}

const wateringCan = buildProp('WateringCan', [
  { name: 'body', color: '#7fb6a4', size: [0.16, 0.18, 0.16], position: [0, 0.09, 0] },
  {
    name: 'spout',
    color: '#7fb6a4',
    size: [0.16, 0.045, 0.045],
    position: [-0.13, 0.13, 0],
    rotationZ: 0.5,
  },
  {
    name: 'rose',
    color: '#55897b',
    size: [0.05, 0.07, 0.07],
    position: [-0.195, 0.175, 0],
    rotationZ: 0.5,
  },
  { name: 'handleTop', color: '#55897b', size: [0.14, 0.035, 0.05], position: [0.02, 0.21, 0] },
  { name: 'handleSide', color: '#55897b', size: [0.035, 0.1, 0.05], position: [0.1, 0.16, 0] },
])

await mkdir(OUT_DIR, { recursive: true })
const io = new NodeIO()
await io.write(`${OUT_DIR}/watering-can.glb`, wateringCan)
console.log(`Wrote ${OUT_DIR}/watering-can.glb`)

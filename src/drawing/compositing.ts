import { getChildren, type BlendMode, type LayerDocumentState, type LayerNode } from './layers.js';

export interface FlattenedLayerEntry {
  node: LayerNode;
  depth: number;
  inheritedVisible: boolean;
  inheritedOpacity: number;
}

export function blendModeToCompositeOperation(mode: BlendMode): GlobalCompositeOperation {
  switch (mode) {
    case 'multiply': return 'multiply';
    case 'screen': return 'screen';
    case 'overlay': return 'overlay';
    case 'add': return 'lighter';
    case 'normal':
    default: return 'source-over';
  }
}

export function flattenLayerTree(state: LayerDocumentState): FlattenedLayerEntry[] {
  const result: FlattenedLayerEntry[] = [];
  const visit = (parentId: string | null, depth: number, parentVisible: boolean, parentOpacity: number): void => {
    for (const node of getChildren(state, parentId)) {
      const visible = parentVisible && node.visible;
      const opacity = parentOpacity * node.opacity;
      if (node.kind === 'group') {
        visit(node.id, depth + 1, visible, opacity);
      } else {
        result.push({ node, depth, inheritedVisible: visible, inheritedOpacity: opacity });
      }
    }
  };
  visit(null, 0, true, 1);
  return result;
}

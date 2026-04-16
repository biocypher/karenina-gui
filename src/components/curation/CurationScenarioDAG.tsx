import { useMemo, useCallback } from 'react';
import { ReactFlow, Background, Controls, type Node, type Edge, type NodeProps, Handle, Position } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useTheme } from '../../hooks/useTheme';
import type { ScenarioDefinition } from '../../types/scenario';

interface CurationScenarioDAGProps {
  definition: ScenarioDefinition;
  takenPath: string[];
  nodeResults: Record<string, boolean | null>;
  selectedNodeId: string | null;
  onNodeClick: (nodeId: string) => void;
}

type ScenarioNodeData = {
  label: string;
  nodeId: string;
  isEntry: boolean;
  isEnd: boolean;
  onPath: boolean;
  isSelected: boolean;
  passed: boolean | null;
};

type ScenarioNode = Node<ScenarioNodeData, 'scenario'>;

const DARK_COLORS = {
  nodeBg: '#0f3460',
  nodeSelectedBg: '#1a237e',
  borderOnPath: '#64ffda',
  borderSelected: '#ffd740',
  borderOff: '#555',
  label: '#e0e0e0',
  entry: '#64ffda',
  viewing: '#ffd740',
  pass: '#69f0ae',
  fail: '#ff8a80',
  muted: '#b0bec5',
  edgeOnPath: '#64ffda',
  edgeOff: '#555',
  containerBg: '#16213e',
  gridColor: '#333',
};

const LIGHT_COLORS = {
  nodeBg: '#ffffff',
  nodeSelectedBg: '#e8eaf6',
  borderOnPath: '#0d9488',
  borderSelected: '#f59e0b',
  borderOff: '#cbd5e1',
  label: '#334155',
  entry: '#0d9488',
  viewing: '#d97706',
  pass: '#166534',
  fail: '#dc2626',
  muted: '#64748b',
  edgeOnPath: '#0d9488',
  edgeOff: '#cbd5e1',
  containerBg: '#f1f5f9',
  gridColor: '#e2e8f0',
};

function ScenarioNodeComponent({ data }: NodeProps<ScenarioNode>) {
  const { label, isEntry, isEnd, onPath, isSelected, passed } = data;
  const { theme } = useTheme();
  const c = theme === 'dark' ? DARK_COLORS : LIGHT_COLORS;

  const borderColor = isSelected ? c.borderSelected : onPath ? c.borderOnPath : c.borderOff;
  const opacity = onPath ? 1 : 0.4;
  const borderStyle = onPath ? 'solid' : 'dashed';

  return (
    <div
      style={{
        opacity,
        border: `2px ${borderStyle} ${borderColor}`,
        borderRadius: 6,
        padding: '8px 16px',
        background: isSelected ? c.nodeSelectedBg : c.nodeBg,
        textAlign: 'center',
        minWidth: 130,
        boxShadow: isSelected ? `0 0 12px ${borderColor}44` : 'none',
        cursor: 'pointer',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
      {isEntry && <div style={{ fontSize: 9, color: c.entry }}>ENTRY</div>}
      {isSelected && <div style={{ fontSize: 9, color: c.viewing }}>VIEWING</div>}
      <div style={{ fontSize: 12, color: c.label, fontWeight: 500 }}>{label}</div>
      {passed !== null && (
        <div style={{ fontSize: 10, color: passed ? c.pass : c.fail, fontWeight: 600 }}>{passed ? 'Pass' : 'Fail'}</div>
      )}
      {passed === null && <div style={{ fontSize: 10, color: c.muted }}>No result</div>}
      {isEnd && <div style={{ fontSize: 9, color: c.muted }}>END</div>}
      <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />
    </div>
  );
}

const nodeTypes = { scenario: ScenarioNodeComponent };

export function CurationScenarioDAG({
  definition,
  takenPath,
  nodeResults,
  selectedNodeId,
  onNodeClick,
}: CurationScenarioDAGProps) {
  const { theme } = useTheme();
  const c = theme === 'dark' ? DARK_COLORS : LIGHT_COLORS;

  const takenSet = useMemo(() => new Set(takenPath), [takenPath]);

  const takenEdges = useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i < takenPath.length - 1; i++) {
      set.add(`${takenPath[i]}->${takenPath[i + 1]}`);
    }
    return set;
  }, [takenPath]);

  const terminalNodes = useMemo(() => {
    const sources = new Set(definition.edges.map((e) => e.source));
    const endTargets = definition.edges.filter((e) => e.target === '__end__').map((e) => e.source);
    const noOutgoing = Object.keys(definition.nodes).filter((id) => !sources.has(id));
    return new Set([...endTargets, ...noOutgoing]);
  }, [definition]);

  const nodes: ScenarioNode[] = useMemo(() => {
    const nodeIds = Object.keys(definition.nodes);

    // BFS from entry node to assign depth (y) and sibling index (x)
    const children: Record<string, string[]> = {};
    for (const e of definition.edges) {
      if (e.target === '__end__') continue;
      if (!children[e.source]) children[e.source] = [];
      children[e.source].push(e.target);
    }

    const depth: Record<string, number> = {};
    const queue: string[] = [definition.entry_node];
    depth[definition.entry_node] = 0;
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const child of children[current] ?? []) {
        if (depth[child] === undefined) {
          depth[child] = depth[current] + 1;
          queue.push(child);
        }
      }
    }
    // Assign unreachable nodes to depth 0
    for (const id of nodeIds) {
      if (depth[id] === undefined) depth[id] = 0;
    }

    // Group by depth, assign x position within each level
    const levels: Record<number, string[]> = {};
    for (const id of nodeIds) {
      const d = depth[id];
      if (!levels[d]) levels[d] = [];
      levels[d].push(id);
    }

    const positions: Record<string, { x: number; y: number }> = {};
    for (const [d, ids] of Object.entries(levels)) {
      const spacing = 300;
      const levelWidth = ids.length * spacing;
      const startX = -levelWidth / 2 + spacing / 2;
      ids.forEach((id, i) => {
        positions[id] = { x: startX + i * spacing, y: Number(d) * 180 };
      });
    }

    return nodeIds.map((id) => ({
      id,
      type: 'scenario' as const,
      position: positions[id] ?? { x: 0, y: 0 },
      data: {
        label: `${id}${definition.nodes[id].question?.text ? ': ' + definition.nodes[id].question.text.slice(0, 30) : ''}`,
        nodeId: id,
        isEntry: id === definition.entry_node,
        isEnd: terminalNodes.has(id),
        onPath: takenSet.has(id),
        isSelected: id === selectedNodeId,
        passed: nodeResults[id] ?? null,
      },
    }));
  }, [definition, takenSet, selectedNodeId, nodeResults, terminalNodes]);

  const edges: Edge[] = useMemo(
    () =>
      definition.edges
        .filter((e) => e.target !== '__end__')
        .map((e, i) => {
          const onPath = takenEdges.has(`${e.source}->${e.target}`);
          return {
            id: `e-${i}`,
            source: e.source,
            target: e.target,
            style: {
              stroke: onPath ? c.edgeOnPath : c.edgeOff,
              strokeWidth: onPath ? 2 : 1,
              strokeDasharray: onPath ? undefined : '5,5',
              opacity: onPath ? 1 : 0.4,
            },
            animated: onPath,
          };
        }),
    [definition.edges, takenEdges, c]
  );

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: ScenarioNode) => {
      onNodeClick(node.id);
    },
    [onNodeClick]
  );

  return (
    <div data-testid="curation-scenario-dag" style={{ height: 420, background: c.containerBg, borderRadius: 4 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        fitView
        minZoom={0.5}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color={c.gridColor} gap={16} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

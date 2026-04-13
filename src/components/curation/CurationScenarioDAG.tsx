import { useMemo, useCallback } from 'react';
import { ReactFlow, Background, Controls, type Node, type Edge, type NodeProps, Handle, Position } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
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

function ScenarioNodeComponent({ data }: NodeProps<ScenarioNode>) {
  const { label, isEntry, isEnd, onPath, isSelected, passed } = data;

  const borderColor = isSelected ? '#ffd740' : onPath ? '#64ffda' : '#555';
  const opacity = onPath ? 1 : 0.4;
  const borderStyle = onPath ? 'solid' : 'dashed';

  return (
    <div
      style={{
        opacity,
        border: `2px ${borderStyle} ${borderColor}`,
        borderRadius: 6,
        padding: '8px 16px',
        background: isSelected ? '#1a237e' : '#0f3460',
        textAlign: 'center',
        minWidth: 130,
        boxShadow: isSelected ? `0 0 12px ${borderColor}44` : 'none',
        cursor: 'pointer',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
      {isEntry && <div style={{ fontSize: 9, color: '#64ffda' }}>ENTRY</div>}
      {isSelected && <div style={{ fontSize: 9, color: '#ffd740' }}>VIEWING</div>}
      <div style={{ fontSize: 12, color: '#e0e0e0', fontWeight: 500 }}>{label}</div>
      {passed !== null && (
        <div style={{ fontSize: 9, color: passed ? '#4caf50' : '#f44336' }}>{passed ? 'Pass' : 'Fail'}</div>
      )}
      {passed === null && <div style={{ fontSize: 9, color: '#888' }}>No result</div>}
      {isEnd && <div style={{ fontSize: 9, color: '#888' }}>END</div>}
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
              stroke: onPath ? '#64ffda' : '#555',
              strokeWidth: onPath ? 2 : 1,
              strokeDasharray: onPath ? undefined : '5,5',
              opacity: onPath ? 1 : 0.4,
            },
            animated: onPath,
          };
        }),
    [definition.edges, takenEdges]
  );

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: ScenarioNode) => {
      onNodeClick(node.id);
    },
    [onNodeClick]
  );

  return (
    <div style={{ height: 420, background: '#16213e', borderRadius: 4 }}>
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
        <Background color="#333" gap={16} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

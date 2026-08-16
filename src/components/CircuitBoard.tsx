"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface CircuitNode {
  id: string;
  x: number;
  y: number;
  label: string;
  detail?: string;
  status?: "active" | "inactive" | "processing" | "error";
  size?: "sm" | "md" | "lg";
}

export interface CircuitConnection {
  from: string;
  to: string;
  animated?: boolean;
  bidirectional?: boolean;
  color?: string;
  pulseColor?: string;
  dashed?: boolean;
}

export function CircuitBoard({ nodes, connections, width = 620, height = 330, className }: { nodes: readonly CircuitNode[]; connections: readonly CircuitConnection[]; width?: number; height?: number; className?: string }) {
  const nodeMap = React.useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const getNodeSize = React.useCallback((size: CircuitNode["size"] = "md") => size === "sm" ? 56 : size === "lg" ? 118 : 82, []);
  const getNodeColors = (status: CircuitNode["status"] = "inactive") => ({
    active: { fill: "#ffffff", border: "#07855c", text: "#047857" },
    inactive: { fill: "#ffffff", border: "#d8d1c9", text: "#1c1b1b" },
    processing: { fill: "#ffc107", border: "#ffc107", text: "#1c1b1b" },
    error: { fill: "#ffdad6", border: "#ba1a1a", text: "#93000a" },
  })[status];
  const calculatePath = React.useCallback((from: CircuitNode, to: CircuitNode) => {
    const fromRadius = getNodeSize(from.size) / 2 + 8;
    const toRadius = getNodeSize(to.size) / 2 + 8;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      const startX = from.x + (dx > 0 ? fromRadius : -fromRadius);
      const endX = to.x + (dx > 0 ? -toRadius : toRadius);
      const midX = from.x + dx / 2;
      return `M ${startX} ${from.y} H ${midX} V ${to.y} H ${endX}`;
    }
    const startY = from.y + (dy > 0 ? fromRadius : -fromRadius);
    const endY = to.y + (dy > 0 ? -toRadius : toRadius);
    const midY = from.y + dy / 2;
    return `M ${from.x} ${startY} V ${midY} H ${to.x} V ${endY}`;
  }, [getNodeSize]);

  return <div className={cn("relative w-full overflow-hidden rounded-2xl border border-[#ddd5cd] bg-[#f3eee8]", className)} style={{ aspectRatio: `${width} / ${height}` }}>
    <svg viewBox={`0 0 ${width} ${height}`} className="absolute inset-0 size-full" aria-hidden="true">
      <defs>
        <pattern id="impact-circuit-grid" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="8" cy="8" r="0.8" fill="#d7d1c9" /></pattern>
        <filter id="impact-circuit-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <filter id="impact-circuit-node-shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#1c1b1b" floodOpacity="0.1" /></filter>
      </defs>
      <rect width={width} height={height} fill="url(#impact-circuit-grid)" />
      {connections.map((connection, index) => {
        const from = nodeMap.get(connection.from);
        const to = nodeMap.get(connection.to);
        if (!from || !to) return null;
        const path = calculatePath(from, to);
        const color = connection.color ?? "#4b4744";
        const pulse = connection.pulseColor ?? "#07855c";
        return <g key={`${connection.from}-${connection.to}`}>
          <motion.path d={path} fill="none" stroke={color} strokeWidth="2" strokeDasharray={connection.dashed ? "6 6" : undefined} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.55, delay: index * 0.12 }} />
          {connection.animated !== false && <motion.path d={path} fill="none" stroke={pulse} strokeWidth="3" strokeDasharray="20 180" strokeLinecap="round" filter="url(#impact-circuit-glow)" initial={{ strokeDashoffset: 200 }} animate={{ strokeDashoffset: -200 }} transition={{ duration: 2.2, repeat: Infinity, ease: "linear", delay: index * 0.2 }} />}
        </g>;
      })}
      {nodes.map((node, index) => {
        const size = getNodeSize(node.size);
        const colors = getNodeColors(node.status);
        const labelY = node.detail ? node.y - 8 : node.y + 5;
        return <motion.g key={node.id} initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + index * 0.12, type: "spring", stiffness: 230, damping: 18 }} style={{ transformOrigin: `${node.x}px ${node.y}px` }}>
          <rect x={node.x - size / 2} y={node.y - size / 2} width={size} height={size} rx="18" fill={colors.fill} stroke={colors.border} strokeWidth="2" filter="url(#impact-circuit-node-shadow)" />
          <text x={node.x} y={labelY} textAnchor="middle" fill={colors.text} fontSize="15" fontWeight="700">{node.label}</text>
          {node.detail && <text x={node.x} y={node.y + 28} textAnchor="middle" fill={colors.text} fillOpacity="0.72" fontSize="11" fontWeight="500">{node.detail}</text>}
        </motion.g>;
      })}
    </svg>
  </div>;
}

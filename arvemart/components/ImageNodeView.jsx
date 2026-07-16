"use client";

import { NodeViewWrapper } from "@tiptap/react";
import { useState } from "react";
import { RotateCcw, AlignLeft, AlignCenter, AlignRight } from "lucide-react";

const SIZE_PRESETS = [
  { label: "25%", width: "25%" },
  { label: "50%", width: "50%" },
  { label: "75%", width: "75%" },
  { label: "100%", width: "100%" },
];

const RADIUS_PRESETS = [
  { label: "0", value: "0px" },
  { label: "8", value: "8px" },
  { label: "12", value: "12px" },
  { label: "16", value: "16px" },
  { label: "24", value: "24px" },
  { label: "Full", value: "9999px" },
];

const ALIGN_OPTIONS = [
  { value: "left", icon: AlignLeft, label: "Kiri" },
  { value: "center", icon: AlignCenter, label: "Tengah" },
  { value: "right", icon: AlignRight, label: "Kanan" },
];

const ALIGN_STYLES = {
  left: "margin-left: 0; margin-right: auto;",
  center: "margin-left: auto; margin-right: auto;",
  right: "margin-left: auto; margin-right: 0;",
};

export default function ImageNodeView({ node, updateAttributes, selected }) {
  const [showControls, setShowControls] = useState(false);
  const width = node.attrs.width || "100%";
  const borderRadius = node.attrs.borderRadius || "12px";
  const align = node.attrs.align || "center";

  return (
    <NodeViewWrapper
      className="relative group my-4"
      onClick={() => setShowControls(!showControls)}
    >
      <img
        src={node.attrs.src}
        alt={node.attrs.alt || ""}
        title={node.attrs.title || ""}
        data-align={align}
        className={`block transition-all duration-200 ${
          selected ? "ring-3 ring-violet-500 ring-offset-2" : ""
        }`}
        style={{
          width,
          height: node.attrs.height || "auto",
          borderRadius,
          boxShadow: borderRadius !== "0px" ? "0 4px 16px rgba(0,0,0,0.1)" : "none",
          ...ALIGN_STYLES[align]?.split(";").reduce((acc, s) => {
            const [k, v] = s.split(":").map(x => x?.trim());
            if (k && v) acc[k] = v;
            return acc;
          }, {}),
        }}
      />

      {/* Floating control panel */}
      {(showControls || selected) && (
        <div
          className="absolute -bottom-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-white rounded-xl shadow-xl border border-gray-200 px-3 py-2"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Alignment */}
          <div className="flex items-center gap-0.5">
            {ALIGN_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateAttributes({ align: opt.value })}
                title={opt.label}
                className={`p-1.5 rounded-lg transition ${
                  align === opt.value
                    ? "bg-violet-100 text-violet-700"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                <opt.icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-gray-200" />

          {/* Width */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">W</span>
            <select
              value={width}
              onChange={(e) => updateAttributes({ width: e.target.value })}
              className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-gray-900 focus:outline-none focus:ring-1 focus:ring-violet-500 cursor-pointer"
            >
              {SIZE_PRESETS.map((p) => (
                <option key={p.label} value={p.width}>{p.label}</option>
              ))}
            </select>
          </div>

          <div className="w-px h-5 bg-gray-200" />

          {/* Radius */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">R</span>
            <select
              value={borderRadius}
              onChange={(e) => updateAttributes({ borderRadius: e.target.value })}
              className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-gray-900 focus:outline-none focus:ring-1 focus:ring-violet-500 cursor-pointer"
            >
              {RADIUS_PRESETS.map((p) => (
                <option key={p.label} value={p.value}>{p.label}px</option>
              ))}
            </select>
          </div>

          <div className="w-px h-5 bg-gray-200" />

          {/* Reset */}
          <button
            type="button"
            onClick={() => updateAttributes({ width: "100%", borderRadius: "12px", height: "auto", align: "center" })}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
            title="Reset"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </NodeViewWrapper>
  );
}

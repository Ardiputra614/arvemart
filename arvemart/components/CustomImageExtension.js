import Image from "@tiptap/extension-image";
import { ReactNodeViewRenderer } from "@tiptap/react";
import ImageNodeView from "../components/ImageNodeView";

function buildStyle({ width, height, borderRadius, align }) {
  const alignMap = {
    left: "margin-left: 0; margin-right: auto;",
    right: "margin-left: auto; margin-right: 0;",
    center: "margin-left: auto; margin-right: auto;",
  };
  return [
    "display: block",
    `width: ${width || "100%"}`,
    `height: ${height || "auto"}`,
    `border-radius: ${borderRadius || "12px"}`,
    alignMap[align] || alignMap.center,
  ].join("; ");
}

function parseAlignFromEl(el) {
  const ml = el.style.marginLeft;
  const mr = el.style.marginRight;
  if (ml === "0px" || ml === "0") return "left";
  if (mr === "0px" || mr === "0") return "right";
  return "center";
}

export const CustomImage = Image.extend({
  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (el) => el.getAttribute("src"),
        renderHTML: (attrs) => ({ src: attrs.src }),
      },
      alt: {
        default: null,
        parseHTML: (el) => el.getAttribute("alt"),
        renderHTML: (attrs) => (attrs.alt ? { alt: attrs.alt } : {}),
      },
      title: {
        default: null,
        parseHTML: (el) => el.getAttribute("title"),
        renderHTML: (attrs) => (attrs.title ? { title: attrs.title } : {}),
      },
      width: {
        default: "100%",
        parseHTML: (el) => el.style.width || "100%",
        renderHTML: () => ({}),
      },
      height: {
        default: "auto",
        parseHTML: (el) => el.style.height || "auto",
        renderHTML: () => ({}),
      },
      borderRadius: {
        default: "12px",
        parseHTML: (el) => el.style.borderRadius || "12px",
        renderHTML: () => ({}),
      },
      align: {
        default: "center",
        parseHTML: (el) => parseAlignFromEl(el),
        renderHTML: () => ({}),
      },
      style: {
        default: null,
        parseHTML: () => null,
        renderHTML: (attrs) => ({
          style: buildStyle(attrs),
        }),
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
});

import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, NodeSelection, TextSelection } from "@tiptap/pm/state";

const GRIP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
  <circle cx="9" cy="4" r="2"/><circle cx="15" cy="4" r="2"/>
  <circle cx="9" cy="12" r="2"/><circle cx="15" cy="12" r="2"/>
  <circle cx="9" cy="20" r="2"/><circle cx="15" cy="20" r="2"/>
</svg>`;

const PLUS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
</svg>`;

function resolveTopLevelBlockAtCoords(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  view: any,
  coords: { left: number; top: number }
): { pos: number; dom: HTMLElement } | null {
  const posInfo = view.posAtCoords({ left: coords.left + 1, top: coords.top });
  if (!posInfo) return null;
  const resolved = view.state.doc.resolve(posInfo.pos);
  if (resolved.depth < 1) {
    const nodePos = posInfo.inside;
    if (nodePos < 0) return null;
    const node = view.state.doc.nodeAt(nodePos);
    const dom = view.nodeDOM(nodePos);
    if (node && dom instanceof HTMLElement) return { pos: nodePos, dom };
    return null;
  }
  const blockPos = resolved.start(1) - 1;
  const node = view.state.doc.nodeAt(blockPos);
  const dom = view.nodeDOM(blockPos);
  if (node && dom instanceof HTMLElement) return { pos: blockPos, dom };
  return null;
}

// Shared drag state accessible by both plugin props and view lifecycle
const dragState = {
  isDragging: false,
  sourcePos: null as number | null,
};

export const DragHandle = Extension.create({
  name: "dragHandle",

  addProseMirrorPlugins() {
    let wrapperEl: HTMLDivElement | null = null;
    let gripEl: HTMLDivElement | null = null;
    let plusEl: HTMLDivElement | null = null;
    let currentBlockPos: number | null = null;
    let hideTimeout: ReturnType<typeof setTimeout> | null = null;
    let dropIndicator: HTMLDivElement | null = null;
    let containerRef: HTMLElement | null = null;

    const showHandle = () => {
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
      if (wrapperEl) wrapperEl.style.opacity = "1";
    };

    const hideHandle = () => {
      hideTimeout = setTimeout(() => {
        if (wrapperEl && !dragState.isDragging) wrapperEl.style.opacity = "0";
      }, 150);
    };

    const cleanupDrag = (editorDom: HTMLElement) => {
      dragState.isDragging = false;
      dragState.sourcePos = null;
      editorDom.querySelectorAll(":scope > *").forEach((el) => {
        (el as HTMLElement).style.opacity = "";
        (el as HTMLElement).style.transition = "";
      });
      if (dropIndicator) dropIndicator.style.opacity = "0";
      if (gripEl) gripEl.style.cursor = "grab";
    };

    return [
      new Plugin({
        key: new PluginKey("dragHandle"),
        props: {
          handleDOMEvents: {
            // Dragover on the editor DOM — show drop indicator
            dragover: (view, event) => {
              if (!dragState.isDragging || dragState.sourcePos === null) return false;
              event.preventDefault();
              if (event.dataTransfer) event.dataTransfer.dropEffect = "move";

              const editorRect = view.dom.getBoundingClientRect();
              const cRect = containerRef?.getBoundingClientRect();
              if (!cRect) return true;

              const result = resolveTopLevelBlockAtCoords(view, {
                left: editorRect.left + 10,
                top: event.clientY,
              });
              if (!result || !dropIndicator) return true;

              const { dom: targetDom } = result;
              const bRect = targetDom.getBoundingClientRect();
              const mid = bRect.top + bRect.height / 2;
              const indicatorTop =
                event.clientY < mid
                  ? bRect.top - cRect.top - 1
                  : bRect.bottom - cRect.top + 1;

              dropIndicator.style.top = indicatorTop + "px";
              dropIndicator.style.opacity = "1";
              return true;
            },

            // Drop on the editor DOM — perform the block move transaction
            // This runs inside ProseMirror’s event pipeline so it fires
            // before PM’s own drop handler can interfere.
            drop: (view, event) => {
              if (!dragState.isDragging || dragState.sourcePos === null) return false;
              event.preventDefault();
              event.stopPropagation();

              const sourcePos = dragState.sourcePos;
              const editorRect = view.dom.getBoundingClientRect();

              const result = resolveTopLevelBlockAtCoords(view, {
                left: editorRect.left + 10,
                top: event.clientY,
              });

              if (result) {
                const { pos: targetPos, dom: targetDom } = result;
                const bRect = targetDom.getBoundingClientRect();
                const mid = bRect.top + bRect.height / 2;
                const insertBefore = event.clientY < mid;

                const sourceNode = view.state.doc.nodeAt(sourcePos);
                if (sourceNode && targetPos !== sourcePos) {
                  const sourceFrom = sourcePos;
                  const sourceTo = sourceFrom + sourceNode.nodeSize;

                  const targetNode = view.state.doc.nodeAt(targetPos);
                  if (!targetNode) {
                    cleanupDrag(view.dom);
                    return true;
                  }

                  let insertAt: number;
                  if (insertBefore) {
                    insertAt = targetPos;
                  } else {
                    insertAt = targetPos + targetNode.nodeSize;
                  }

                  // Don’t drop onto itself
                  if (insertAt >= sourceFrom && insertAt <= sourceTo) {
                    cleanupDrag(view.dom);
                    return true;
                  }

                  let { tr } = view.state;

                  if (sourceFrom < insertAt) {
                    // Source before target — delete first, then insert
                    const adjusted = insertAt - sourceNode.nodeSize;
                    tr = tr.delete(sourceFrom, sourceTo);
                    tr = tr.insert(adjusted, sourceNode);
                    try {
                      tr = tr.setSelection(NodeSelection.create(tr.doc, adjusted));
                    } catch {
                      // non-critical
                    }
                  } else {
                    // Source after target — insert first, then delete
                    tr = tr.insert(insertAt, sourceNode);
                    const adjFrom = sourceFrom + sourceNode.nodeSize;
                    const adjTo = sourceTo + sourceNode.nodeSize;
                    tr = tr.delete(adjFrom, adjTo);
                    try {
                      tr = tr.setSelection(NodeSelection.create(tr.doc, insertAt));
                    } catch {
                      // non-critical
                    }
                  }

                  view.dispatch(tr);
                }
              }

              cleanupDrag(view.dom);
              return true;
            },
          },
        },

        view(editorView) {
          // Create wrapper element
          wrapperEl = document.createElement("div");
          wrapperEl.className = "notion-drag-handle-wrapper";
          Object.assign(wrapperEl.style, {
            position: "absolute",
            left: "-48px",
            opacity: "0",
            transition: "opacity 0.15s ease, top 0.1s ease",
            display: "flex",
            alignItems: "center",
            gap: "0px",
            zIndex: "20",
            pointerEvents: "auto",
          });

          // Drop indicator
          dropIndicator = document.createElement("div");
          dropIndicator.className = "notion-drop-indicator";
          Object.assign(dropIndicator.style, {
            position: "absolute",
            left: "0",
            right: "0",
            height: "2px",
            background: "#2383e2",
            borderRadius: "1px",
            pointerEvents: "none",
            opacity: "0",
            transition: "opacity 0.1s ease, top 0.05s ease",
            zIndex: "50",
          });

          // Plus button
          plusEl = document.createElement("div");
          plusEl.className = "notion-drag-plus";
          plusEl.innerHTML = PLUS_SVG;
          Object.assign(plusEl.style, {
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "20px",
            height: "24px",
            borderRadius: "4px",
            color: "var(--muted-foreground)",
            transition: "color 0.15s, background-color 0.15s",
            flexShrink: "0",
          });

          // Grip handle
          gripEl = document.createElement("div");
          gripEl.className = "notion-drag-grip";
          gripEl.draggable = true;
          gripEl.contentEditable = "false";
          gripEl.innerHTML = GRIP_SVG;
          Object.assign(gripEl.style, {
            cursor: "grab",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "20px",
            height: "24px",
            borderRadius: "4px",
            color: "var(--muted-foreground)",
            transition: "color 0.15s, background-color 0.15s",
            flexShrink: "0",
          });

          wrapperEl.appendChild(plusEl);
          wrapperEl.appendChild(gripEl);

          const editorContainer = editorView.dom.parentElement;
          containerRef = editorContainer;
          if (editorContainer) {
            editorContainer.style.position = "relative";
            editorContainer.appendChild(wrapperEl);
            editorContainer.appendChild(dropIndicator);
          }

          // Mouse move — detect hovered block
          const handleMouseMove = (event: MouseEvent) => {
            if (dragState.isDragging) return;
            const editorDom = editorView.dom;
            const editorRect = editorDom.getBoundingClientRect();
            if (event.clientY < editorRect.top || event.clientY > editorRect.bottom) {
              hideHandle();
              return;
            }
            const result = resolveTopLevelBlockAtCoords(editorView, {
              left: editorRect.left + 10,
              top: event.clientY,
            });
            if (!result || !wrapperEl) {
              hideHandle();
              return;
            }
            const { pos, dom } = result;
            const blockRect = dom.getBoundingClientRect();
            const cRect = editorContainer!.getBoundingClientRect();
            wrapperEl.style.top = (blockRect.top - cRect.top + 2) + "px";
            currentBlockPos = pos;
            showHandle();
          };

          const handleMouseLeave = () => {
            if (!dragState.isDragging) hideHandle();
          };
          const handleWrapperEnter = () => showHandle();
          const handleWrapperLeave = () => {
            if (!dragState.isDragging) hideHandle();
          };

          // Grip click — select block
          const handleGripClick = (event: MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
            if (currentBlockPos === null) return;
            const node = editorView.state.doc.nodeAt(currentBlockPos);
            if (!node) return;
            const tr = editorView.state.tr.setSelection(
              NodeSelection.create(editorView.state.doc, currentBlockPos)
            );
            editorView.dispatch(tr);
          };

          // Grip dragstart
          const handleDragStart = (event: DragEvent) => {
            if (currentBlockPos === null) return;
            const node = editorView.state.doc.nodeAt(currentBlockPos);
            if (!node) return;

            dragState.isDragging = true;
            dragState.sourcePos = currentBlockPos;

            // Select the block
            const tr = editorView.state.tr.setSelection(
              NodeSelection.create(editorView.state.doc, currentBlockPos)
            );
            editorView.dispatch(tr);

            // Set drag data
            if (event.dataTransfer) {
              event.dataTransfer.setData("application/x-clarify-drag", "true");
              event.dataTransfer.setData("text/plain", "");
              event.dataTransfer.effectAllowed = "move";
            }

            // Drag image
            const blockDom = editorView.nodeDOM(currentBlockPos) as HTMLElement;
            if (blockDom && event.dataTransfer) {
              const clone = blockDom.cloneNode(true) as HTMLElement;
              clone.style.opacity = "0.7";
              clone.style.position = "absolute";
              clone.style.top = "-9999px";
              clone.style.maxWidth = blockDom.offsetWidth + "px";
              document.body.appendChild(clone);
              event.dataTransfer.setDragImage(clone, 0, 0);
              requestAnimationFrame(() => clone.remove());
            }

            if (gripEl) gripEl.style.cursor = "grabbing";

            // Dim source block
            if (blockDom instanceof HTMLElement) {
              blockDom.style.opacity = "0.4";
              blockDom.style.transition = "opacity 0.15s ease";
            }
          };

          // Container dragover fallback
          const handleContainerDragOver = (event: DragEvent) => {
            if (!dragState.isDragging) return;
            event.preventDefault();
            if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
          };

          // Container drop fallback
          const handleContainerDrop = (event: DragEvent) => {
            if (!dragState.isDragging) return;
            event.preventDefault();
            cleanupDrag(editorView.dom);
          };

          const handleDragEnd = () => {
            cleanupDrag(editorView.dom);
          };

          // Plus button — insert paragraph below
          const handlePlusClick = (event: MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
            if (currentBlockPos === null) return;
            const node = editorView.state.doc.nodeAt(currentBlockPos);
            if (!node) return;
            const endPos = currentBlockPos + node.nodeSize;
            const tr = editorView.state.tr.insert(
              endPos,
              editorView.state.schema.nodes.paragraph.create()
            );
            tr.setSelection(TextSelection.near(tr.doc.resolve(endPos + 1)));
            editorView.dispatch(tr);
            editorView.focus();
          };

          // Bind events
          editorContainer?.addEventListener("mousemove", handleMouseMove);
          editorContainer?.addEventListener("mouseleave", handleMouseLeave);
          editorContainer?.addEventListener("dragover", handleContainerDragOver);
          editorContainer?.addEventListener("drop", handleContainerDrop);
          wrapperEl.addEventListener("mouseenter", handleWrapperEnter);
          wrapperEl.addEventListener("mouseleave", handleWrapperLeave);
          gripEl.addEventListener("click", handleGripClick);
          gripEl.addEventListener("dragstart", handleDragStart);
          gripEl.addEventListener("dragend", handleDragEnd);
          plusEl.addEventListener("click", handlePlusClick);

          return {
            update() {
              // Position is driven by mousemove
            },
            destroy() {
              editorContainer?.removeEventListener("mousemove", handleMouseMove);
              editorContainer?.removeEventListener("mouseleave", handleMouseLeave);
              editorContainer?.removeEventListener("dragover", handleContainerDragOver);
              editorContainer?.removeEventListener("drop", handleContainerDrop);
              wrapperEl?.removeEventListener("mouseenter", handleWrapperEnter);
              wrapperEl?.removeEventListener("mouseleave", handleWrapperLeave);
              gripEl?.removeEventListener("click", handleGripClick);
              gripEl?.removeEventListener("dragstart", handleDragStart);
              gripEl?.removeEventListener("dragend", handleDragEnd);
              plusEl?.removeEventListener("click", handlePlusClick);
              wrapperEl?.remove();
              dropIndicator?.remove();
              if (hideTimeout) clearTimeout(hideTimeout);
              dragState.isDragging = false;
              dragState.sourcePos = null;
            },
          };
        },
      }),

      // Clear NodeSelection on click inside the editor
      new Plugin({
        key: new PluginKey("dragHandleClickClear"),
        props: {
          handleClick(view, pos) {
            if (view.state.selection instanceof NodeSelection) {
              const tr = view.state.tr.setSelection(
                TextSelection.near(view.state.doc.resolve(pos))
              );
              view.dispatch(tr);
              return true;
            }
            return false;
          },
        },
      }),
    ];
  },
});

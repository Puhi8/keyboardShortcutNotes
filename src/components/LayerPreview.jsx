import React from "react"
import "../LayerPreview.css"

export default function LayerPreview({ layout, keyDataState, layers, miniKeyClassMap = {} }) {
   return <section className="layer-preview">
      <div className="layer-preview-title">Layer overview</div>
      <div className="layer-preview-grid">
         {layers.map(layer => (
            <div key={layer.id} className="mini-layer">
               <div className="mini-layer-header">{layer.label}</div>
               <div className="mini-keyboard">
                  {layout.map((row, rowIndex) => (<div className="mini-row" key={rowIndex}>
                     {row.map((key, i) => {
                        if (key.spacer) return <div key={i} className="mini-spacer" />
                        if (key.empty) return <div key={i} className={`mini-empty ${key.width || "w1"}`} />
                        const data = keyDataState[key.id] || { notes: {} }
                        const note = data.notes[layer.id] || { status: "free" }
                        const prev = row[i - 1]
                        const next = row[i + 1]
                        const mergeLeft = prev && !prev.spacer && !prev.empty && prev.id === key.id
                        const mergeRight = next && !next.spacer && !next.empty && next.id === key.id
                        const findSameId = (rowArr) => rowArr?.find(cell =>
                           cell &&
                           !cell.spacer &&
                           !cell.empty &&
                           cell.id === key.id
                        ) || null
                        const prevRowKey = findSameId(rowIndex > 0 ? layout[rowIndex - 1] : null)
                        const nextRowKey = findSameId(rowIndex < layout.length - 1 ? layout[rowIndex + 1] : null)
                        const mergeTop = prevRowKey && prevRowKey.id === key.id
                        const mergeBottom = nextRowKey && nextRowKey.id === key.id
                        const className =
                           `mini-key ${miniKeyClassMap[key.id] || key.width || "w1"}` +
                           (mergeLeft ? " merge-left" : "") +
                           (mergeRight ? " merge-right" : "") +
                           (mergeTop ? " merge-top" : "") +
                           (mergeBottom ? " merge-bottom" : "")
                        return <div
                           key={key.id + layer.id}
                           className={className}
                           data-status={note.status || "free"}
                           title={`${key.label} — ${note.status || "free"}`}
                        />
                     })}
                  </div>
                  ))}
               </div>
            </div>
         ))}
      </div>
   </section>
}
